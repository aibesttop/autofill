/**
 * Content script for RemotePageController
 * Initializes PageController and handles agent page-control messages from the service worker
 */
import { PageController } from '@page-agent/page-controller';

const AGENT_PAGE_CONTROL = 'AGENT_PAGE_CONTROL' as const;

export function initPageController() {
  let pageController: PageController | null = null;

  const myTabIdPromise = chrome.runtime
    .sendMessage({ type: AGENT_PAGE_CONTROL, action: 'get_my_tab_id' })
    .then((response) => {
      return (response as { tabId: number | null }).tabId;
    })
    .catch((error) => {
      console.error('[RemotePageController.ContentScript]: Failed to get my tab id', error);
      return null;
    });

  function getPC(): PageController {
    if (!pageController) {
      pageController = new PageController({ enableMask: false, viewportExpansion: 400 });
    }
    return pageController;
  }

  function getIndexedElementInfo(index: number) {
    const pc = getPC() as unknown as {
      selectorMap?: Map<number, { ref?: Element | null }>;
      elementTextMap?: Map<number, string>;
    };
    const element = pc.selectorMap?.get(index)?.ref;

    if (!(element instanceof HTMLElement)) {
      throw new Error(`Element ${index} not found`);
    }

    return {
      tagName: element.tagName.toLowerCase(),
      text:
        pc.elementTextMap?.get(index) ||
        element.textContent?.trim() ||
        element.getAttribute('aria-label') ||
        '',
      value:
        element instanceof HTMLInputElement ||
        element instanceof HTMLTextAreaElement ||
        element instanceof HTMLSelectElement
          ? element.value
          : undefined,
    };
  }

  // Poll for agent state to manage mask visibility
  window.setInterval(async () => {
    const agentHeartbeat = (await chrome.storage.local.get('agentHeartbeat')).agentHeartbeat;
    const now = Date.now();
    const agentInTouch = typeof agentHeartbeat === 'number' && now - agentHeartbeat < 2_000;

    const isAgentRunning = (await chrome.storage.local.get('isAgentRunning')).isAgentRunning;
    const currentTabId = (await chrome.storage.local.get('currentTabId')).currentTabId;

    const shouldShowMask = isAgentRunning && agentInTouch && currentTabId === (await myTabIdPromise);

    if (shouldShowMask) {
      const pc = getPC();
      pc.initMask();
      await pc.showMask();
    } else {
      if (pageController) {
        pageController.hideMask();
        pageController.cleanUpHighlights();
      }
    }

    if (!isAgentRunning && agentInTouch) {
      if (pageController) {
        pageController.dispose();
        pageController = null;
      }
    }
  }, 500);

  // Handle agent page-control messages from the service worker
  chrome.runtime.onMessage.addListener((message, _sender, sendResponse): true | undefined => {
    if (message.type !== AGENT_PAGE_CONTROL) {
      return;
    }

    const { action, payload } = message;
    const methodName = getMethodName(action);

    const pc = getPC() as any;

    switch (action) {
      case 'get_last_update_time':
      case 'get_browser_state':
      case 'update_tree':
      case 'clean_up_highlights':
      case 'click_element':
      case 'input_text':
      case 'select_option':
      case 'scroll':
      case 'scroll_horizontally':
      case 'execute_javascript':
        pc[methodName](...(payload || []))
          .then((result: any) => sendResponse(result))
          .catch((error: any) =>
            sendResponse({
              success: false,
              error: error instanceof Error ? error.message : String(error),
            })
          );
        break;

      case 'get_element_info':
        try {
          sendResponse(getIndexedElementInfo(payload?.[0]));
        } catch (error) {
          sendResponse({
            success: false,
            error: error instanceof Error ? error.message : String(error),
          });
        }
        break;

      default:
        sendResponse({
          success: false,
          error: `Unknown agent page-control action: ${action}`,
        });
    }

    return true;
  });
}

function getMethodName(action: string): string {
  switch (action) {
    case 'get_last_update_time':
      return 'getLastUpdateTime';
    case 'get_browser_state':
      return 'getBrowserState';
    case 'update_tree':
      return 'updateTree';
    case 'clean_up_highlights':
      return 'cleanUpHighlights';
    case 'click_element':
      return 'clickElement';
    case 'input_text':
      return 'inputText';
    case 'select_option':
      return 'selectOption';
    case 'scroll':
      return 'scroll';
    case 'scroll_horizontally':
      return 'scrollHorizontally';
    case 'execute_javascript':
      return 'executeJavascript';
    default:
      return action;
  }
}
