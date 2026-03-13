import { type AgentConfig, PageAgentCore } from '@page-agent/core';

import { RemotePageController } from './RemotePageController';
import { TabsController } from './TabsController';
import SYSTEM_PROMPT from './system_prompt.md?raw';
import { createTabTools } from './tabTools';

/** Detect user language from browser settings */
function detectLanguage(): 'en-US' | 'zh-CN' {
  const lang = navigator.language || navigator.languages?.[0] || 'en-US';
  return lang.startsWith('zh') ? 'zh-CN' : 'en-US';
}

/**
 * MultiPageAgent
 * - use with extension
 * - can be used from a side panel or a content script
 */
export class MultiPageAgent extends PageAgentCore {
  constructor(config: AgentConfig & { includeInitialTab?: boolean }) {
    // multi page controller
    const tabsController = new TabsController();
    const pageController = new RemotePageController(tabsController);
    const customTools = createTabTools(tabsController);

    // system prompt - auto-detect language if not specified
    const language = config.language ?? detectLanguage();
    const targetLanguage = language === 'zh-CN' ? '中文' : 'English';
    const systemPrompt = SYSTEM_PROMPT.replace(
      /Default working language: \*\*.*?\*\*/,
      `Default working language: **${targetLanguage}**`
    );

    // include initial tab for controlling
    const includeInitialTab = config.includeInitialTab ?? true;

    /**
     * Heartbeat mechanism for detecting when side-panel is closed
     */
    let heartBeatInterval: null | number = null;

    super({
      ...config,
      pageController: pageController as any,
      customTools: customTools,
      customSystemPrompt: systemPrompt,

      onBeforeTask: async (agent) => {
        await tabsController.init(agent.task, includeInitialTab);

        heartBeatInterval = window.setInterval(() => {
          chrome.storage.local.set({
            agentHeartbeat: Date.now(),
          });
        }, 1_000);

        await chrome.storage.local.set({
          isAgentRunning: true,
        });
      },

      onAfterTask: async () => {
        if (heartBeatInterval) {
          window.clearInterval(heartBeatInterval);
          heartBeatInterval = null;
        }

        await chrome.storage.local.set({
          isAgentRunning: false,
        });
      },

      onBeforeStep: async () => {
        // make sure the current tab is loaded before the step starts
        await tabsController.waitUntilTabLoaded(tabsController.currentTabId!);
      },

      onDispose: () => {
        if (heartBeatInterval) {
          window.clearInterval(heartBeatInterval);
          heartBeatInterval = null;
        }

        chrome.storage.local.set({
          isAgentRunning: false,
        });

        tabsController.dispose();
      },
    });
  }
}
