import type { AgentErrorEvent, HistoricalEvent } from '@page-agent/core';

import { loadAgentConfig } from './config-storage';
import { MultiPageAgent } from './MultiPageAgent';
import { buildAgentTaskWithProfileContext } from './task-context';
import type { AgentWebsiteProfileContext } from './task-context';

export const DEFAULT_BATCH_AGENT_TASK_TEMPLATE =
  'Open the target page, inspect the submission form, autofill it using the selected website profile, and stop before the final submission step unless the task explicitly requires submitting the form.';

export interface BatchAgentExecutionResult {
  task: string;
  history: HistoricalEvent[];
  status: 'completed' | 'error';
  resultText: string;
}

function buildBatchAgentTask(targetUrl: string, taskTemplate: string): string {
  return [
    'You are executing one item from a batch submission queue.',
    '<batch_target_url>',
    `- Target URL: ${targetUrl}`,
    '- Start by opening the target URL in a new tab if you are not already on that exact page.',
    '- After the target page is open, analyze and operate on that page instead of the original side panel tab.',
    '- Prefer the extension tools quick_discover_form and quick_fill_form before low-level manual DOM actions.',
    '</batch_target_url>',
    taskTemplate.trim() || DEFAULT_BATCH_AGENT_TASK_TEMPLATE,
  ].join('\n');
}

function createErrorHistory(history: HistoricalEvent[], message: string): HistoricalEvent[] {
  const errorEvent: AgentErrorEvent = {
    type: 'error',
    message,
  };

  return [...history, errorEvent];
}

export async function executeBatchAgentRun({
  targetUrl,
  taskTemplate,
  websiteProfile,
}: {
  targetUrl: string;
  taskTemplate: string;
  websiteProfile?: AgentWebsiteProfileContext | null;
}): Promise<BatchAgentExecutionResult> {
  const config = await loadAgentConfig();
  const { systemInstruction, ...agentConfig } = config;
  const task = `Batch agent · ${targetUrl}`;
  const agent = new MultiPageAgent({
    ...agentConfig,
    instructions: systemInstruction ? { system: systemInstruction } : undefined,
  });

  try {
    const agentTask = buildAgentTaskWithProfileContext(
      buildBatchAgentTask(targetUrl, taskTemplate),
      websiteProfile
    );
    const result = await agent.execute(agentTask);

    return {
      task,
      history: result.history,
      status: result.success ? 'completed' : 'error',
      resultText: result.data,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    return {
      task,
      history: createErrorHistory(agent.history, message),
      status: 'error',
      resultText: message,
    };
  } finally {
    agent.dispose();
    await chrome.storage.local.set({
      currentTabId: null,
      isAgentRunning: false,
    });
  }
}
