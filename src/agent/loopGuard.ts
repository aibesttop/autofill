import { type AgentStepEvent, type HistoricalEvent, type PageAgentCore, tool } from '@page-agent/core';
import * as z from 'zod/v4';

type LowLevelActionName = 'click_element_by_index' | 'input_text' | 'select_dropdown_option';
type HighLevelActionName = 'select_form_field_options' | 'set_form_field_value';

const LOW_LEVEL_ACTIONS = new Set<LowLevelActionName>([
  'click_element_by_index',
  'input_text',
  'select_dropdown_option',
]);

type GuardObservationCapableAgent = PageAgentCore & {
  pushObservation?: (content: string) => void;
};

function stableSerialize(value: unknown): string {
  if (value === null || value === undefined) {
    return String(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map((item) => stableSerialize(item)).join(',')}]`;
  }

  if (typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, nestedValue]) => `${key}:${stableSerialize(nestedValue)}`);
    return `{${entries.join(',')}}`;
  }

  return JSON.stringify(value);
}

function isActionStepEvent(event: HistoricalEvent): event is AgentStepEvent {
  return event.type === 'step' && event.action.name !== 'done';
}

function getRecentStepEvents(history: HistoricalEvent[]): AgentStepEvent[] {
  return history.filter(isActionStepEvent);
}

function countConsecutiveExactActions(
  history: HistoricalEvent[],
  actionName: LowLevelActionName,
  input: unknown
): number {
  const fingerprint = stableSerialize(input);
  const steps = getRecentStepEvents(history);
  let count = 0;

  for (let index = steps.length - 1; index >= 0; index -= 1) {
    const step = steps[index];
    if (step.action.name !== actionName) {
      break;
    }

    if (stableSerialize(step.action.input) !== fingerprint) {
      break;
    }

    count += 1;
  }

  return count;
}

function countConsecutiveActionNames(history: HistoricalEvent[], actionName: LowLevelActionName): number {
  const steps = getRecentStepEvents(history);
  let count = 0;

  for (let index = steps.length - 1; index >= 0; index -= 1) {
    const step = steps[index];
    if (step.action.name !== actionName) {
      break;
    }

    count += 1;
  }

  return count;
}

function countConsecutiveLowLevelActions(history: HistoricalEvent[]): number {
  const steps = getRecentStepEvents(history);
  let count = 0;

  for (let index = steps.length - 1; index >= 0; index -= 1) {
    const step = steps[index];
    if (!LOW_LEVEL_ACTIONS.has(step.action.name as LowLevelActionName)) {
      break;
    }

    count += 1;
  }

  return count;
}

function countConsecutiveFieldToolCalls(
  history: HistoricalEvent[],
  actionName: HighLevelActionName,
  fieldHint: string
): number {
  const steps = getRecentStepEvents(history);
  let count = 0;

  for (let index = steps.length - 1; index >= 0; index -= 1) {
    const step = steps[index];
    if (step.action.name !== actionName) {
      break;
    }

    const currentFieldHint =
      typeof step.action.input === 'object' &&
      step.action.input !== null &&
      'fieldHint' in step.action.input
        ? normalizeText(String((step.action.input as { fieldHint?: string }).fieldHint))
        : '';

    if (currentFieldHint !== normalizeText(fieldHint)) {
      break;
    }

    count += 1;
  }

  return count;
}

function pushGuardObservation(agent: PageAgentCore, message: string): void {
  const guardAgent = agent as GuardObservationCapableAgent;
  guardAgent.pushObservation?.(`[loop-guard] ${message}`);
}

function normalizeText(value: string | undefined): string {
  return (value || '').toLowerCase().replace(/\s+/g, ' ').trim();
}

function getGuardMessage(agent: PageAgentCore, actionName: LowLevelActionName, input: unknown): string | null {
  const exactRepeatCount = countConsecutiveExactActions(agent.history, actionName, input);

  if (actionName === 'input_text' && exactRepeatCount >= 1) {
    return 'The same text input was already attempted on this field. Do not type the same value again. Use set_form_field_value or inspect the page state first.';
  }

  if (actionName === 'select_dropdown_option' && exactRepeatCount >= 1) {
    return 'The same dropdown selection was already attempted. Stop retrying the same option blindly and switch to select_form_field_options or re-observe the page.';
  }

  if (actionName === 'click_element_by_index' && exactRepeatCount >= 2) {
    return 'The same click target was already pressed multiple times without confirmed progress. Re-observe the page and switch to a higher-level form tool instead of clicking again.';
  }

  return null;
}

export function createGuardedBrowserTools() {
  return {
    click_element_by_index: tool({
      description: 'Click element by index',
      inputSchema: z.object({
        index: z.int().min(0),
      }),
      execute: async function (this: PageAgentCore, input: { index: number }) {
        const guardMessage = getGuardMessage(this, 'click_element_by_index', input);
        if (guardMessage) {
          pushGuardObservation(this, guardMessage);
          return `Loop guard blocked repeated click_element_by_index. ${guardMessage}`;
        }

        const result = await this.pageController.clickElement(input.index);
        return result.message;
      },
    }),

    input_text: tool({
      description: 'Click and type text into an interactive input element',
      inputSchema: z.object({
        index: z.int().min(0),
        text: z.string(),
      }),
      execute: async function (this: PageAgentCore, input: { index: number; text: string }) {
        const currentValue = await (
          this.pageController as PageAgentCore['pageController'] & {
            getElementInfo?: (index: number) => Promise<{ value?: string } | null>;
          }
        )
          .getElementInfo?.(input.index)
          .then((result) => result?.value?.trim() || '')
          .catch(() => '');

        if (currentValue) {
          if (normalizeText(currentValue) === normalizeText(input.text)) {
            pushGuardObservation(
              this,
              'This field already contains the requested text. Do not type into it again.'
            );
            return 'Loop guard skipped input_text because the field already contains the requested value.';
          }

          pushGuardObservation(
            this,
            'This field already contains a non-empty value. Preserve it and use set_form_field_value only for empty text fields.'
          );
          return 'Loop guard blocked input_text because the target field already contains a value.';
        }

        const guardMessage = getGuardMessage(this, 'input_text', input);
        if (guardMessage) {
          pushGuardObservation(this, guardMessage);
          return `Loop guard blocked repeated input_text. ${guardMessage}`;
        }

        const result = await this.pageController.inputText(input.index, input.text);
        return result.message;
      },
    }),

    select_dropdown_option: tool({
      description: 'Select dropdown option for interactive element index by the text of the option you want to select',
      inputSchema: z.object({
        index: z.int().min(0),
        text: z.string(),
      }),
      execute: async function (this: PageAgentCore, input: { index: number; text: string }) {
        const guardMessage = getGuardMessage(this, 'select_dropdown_option', input);
        if (guardMessage) {
          pushGuardObservation(this, guardMessage);
          return `Loop guard blocked repeated select_dropdown_option. ${guardMessage}`;
        }

        const result = await this.pageController.selectOption(input.index, input.text);
        return result.message;
      },
    }),
  };
}

export function detectLoopGuardObservation(history: HistoricalEvent[]): string | null {
  const lowLevelActionRun = countConsecutiveLowLevelActions(history);
  if (lowLevelActionRun >= 6) {
    return `You have executed ${lowLevelActionRun} low-level browser actions in a row without finishing the form. Stop trial-and-error interactions. Re-observe the page and use quick_discover_form, set_form_field_value, or select_form_field_options for the remaining fields.`;
  }

  const repeatedClicks = countConsecutiveActionNames(history, 'click_element_by_index');
  if (repeatedClicks >= 5) {
    return `You have clicked indexed elements ${repeatedClicks} times in a row. This usually means the page needs a fresh observation or a higher-level form tool, not more blind clicking.`;
  }

  const recentSteps = getRecentStepEvents(history);
  const lastStep = recentSteps[recentSteps.length - 1];
  if (
    (lastStep?.action.name === 'select_form_field_options' ||
      lastStep?.action.name === 'set_form_field_value') &&
    typeof lastStep.action.input === 'object' &&
    lastStep.action.input !== null &&
    'fieldHint' in lastStep.action.input
  ) {
    const fieldHint = String((lastStep.action.input as { fieldHint?: string }).fieldHint || '');
    const repeatCount = countConsecutiveFieldToolCalls(
      history,
      lastStep.action.name as HighLevelActionName,
      fieldHint
    );

    if (repeatCount >= 2) {
      if (lastStep.action.name === 'select_form_field_options') {
        return `You have already used select_form_field_options for "${fieldHint}" ${repeatCount} times in a row. Stop re-opening the same picker. Accept the current selection or move on to a different unresolved field.`;
      }

      return `You have already used set_form_field_value for "${fieldHint}" ${repeatCount} times in a row. Treat that field as complete or blocked and continue to the next unresolved field.`;
    }
  }

  return null;
}
