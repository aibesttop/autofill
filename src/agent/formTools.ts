import { type PageAgentCore, tool } from '@page-agent/core';
import * as z from 'zod/v4';

import type {
  AutofillResult,
  DetectedFormField,
  FormDetectionResult,
  OrderedAutofillResult,
  FormSetFieldValueResult,
  FormSelectOptionsResult,
} from '@content/types';
import { canUseTabMessaging, sendMessageToTabId } from '@shared/utils/tab-messaging';

import type { TabsController } from './TabsController';
import { formatOrderedFormSequence, inferOrderedFieldPurpose } from './form-field-plan';

interface FormTool {
  description: string;
  inputSchema: z.ZodType;
  execute: (input: unknown) => Promise<string>;
}

type ObservationCapableAgent = PageAgentCore & {
  pushObservation?: (content: string) => void;
};

interface ToolTabContext {
  tabId: number;
  title: string;
  url: string;
}

type FormMessageResponse =
  | {
      success?: boolean;
      result?: FormDetectionResult;
      error?: string;
    }
  | {
      success?: boolean;
      result?: AutofillResult;
      error?: string;
    }
  | {
      success?: boolean;
      result?: FormSelectOptionsResult;
      error?: string;
    }
  | {
      success?: boolean;
      result?: FormSetFieldValueResult;
      error?: string;
    }
  | {
      success?: boolean;
      result?: OrderedAutofillResult;
      error?: string;
    };

function formatFieldLine(field: DetectedFormField, index: number): string {
  const details = [
    field.name ? `name=${field.name}` : null,
    field.placeholder ? `placeholder=${field.placeholder}` : null,
    field.autocompleteType ? `autocomplete=${field.autocompleteType}` : null,
  ]
    .filter(Boolean)
    .join(', ');

  return `${index + 1}. ${field.label || field.name || 'Unnamed field'} [${field.type}]${
    details ? ` (${details})` : ''
  }`;
}

function formatLikelyTargets(fields: DetectedFormField[]): string | null {
  const counts = fields.reduce<Record<string, number>>((result, field) => {
    const purpose = inferOrderedFieldPurpose(field);
    if (purpose === 'other') {
      return result;
    }

    result[purpose] = (result[purpose] ?? 0) + 1;
    return result;
  }, {});

  const entries = Object.entries(counts);
  if (entries.length === 0) {
    return null;
  }

  return entries.map(([purpose, count]) => `${purpose}(${count})`).join(', ');
}

function formatDetectionSummary(tab: ToolTabContext, result: FormDetectionResult): string {
  const fieldsPreview =
    result.fields.length > 0
      ? result.fields.slice(0, 12).map(formatFieldLine).join('\n')
      : 'No visible fields detected.';
  const likelyTargets = formatLikelyTargets(result.fields);
  const orderedSequence = formatOrderedFormSequence(result.fields).slice(0, 12);

  return [
    `Quick Discover succeeded on ${tab.url}.`,
    `Page: ${result.pageTitle || tab.title || 'Untitled page'}`,
    `Detected ${result.fieldCount} fields across ${result.formCount} forms with ${result.submitButtonCount} submit controls.`,
    likelyTargets ? `Likely field targets: ${likelyTargets}.` : null,
    orderedSequence.length > 0 ? 'Suggested ordered fill sequence:' : null,
    ...(orderedSequence.length > 0 ? orderedSequence : []),
    'Detected fields:',
    fieldsPreview,
  ]
    .filter(Boolean)
    .join('\n');
}

function formatAutofillSummary(tab: ToolTabContext, result: AutofillResult): string {
  const filledFields =
    result.filledFields.length > 0 ? result.filledFields.slice(0, 12).join(', ') : 'none';

  return [
    `Quick Fill executed on ${tab.url}.`,
    `Status: ${result.status}.`,
    result.strategy ? `Strategy: ${result.strategy}.` : null,
    result.message,
    result.planSummary ? `Plan: ${result.planSummary}.` : null,
    `Filled ${result.filledCount} fields and skipped ${result.skippedCount}.`,
    `Filled fields: ${filledFields}.`,
    result.profileName ? `Profile used: ${result.profileName}.` : null,
  ]
    .filter(Boolean)
    .join('\n');
}

function formatSelectOptionsSummary(tab: ToolTabContext, result: FormSelectOptionsResult): string {
  return [
    `Dynamic option selection executed on ${tab.url}.`,
    `Status: ${result.status}.`,
    result.matchedField ? `Matched field: ${result.matchedField}.` : null,
    result.selectedValues.length > 0 ? `Selected values: ${result.selectedValues.join(', ')}.` : null,
    result.message,
  ]
    .filter(Boolean)
    .join('\n');
}

function formatSetFieldValueSummary(tab: ToolTabContext, result: FormSetFieldValueResult): string {
  return [
    `Text field update executed on ${tab.url}.`,
    `Status: ${result.status}.`,
    result.matchedField ? `Matched field: ${result.matchedField}.` : null,
    result.currentValue ? `Current value: ${result.currentValue}.` : null,
    result.message,
  ]
    .filter(Boolean)
    .join('\n');
}

function pushAgentObservation(agent: PageAgentCore, content: string): void {
  (agent as ObservationCapableAgent).pushObservation?.(content);
}

function formatOrderedAutofillSummary(tab: ToolTabContext, result: OrderedAutofillResult): string {
  return [
    `Ordered Quick Fill executed on ${tab.url}.`,
    `Status: ${result.status}.`,
    result.planSummary ? `Plan: ${result.planSummary}.` : null,
    result.message,
    `Completed ${result.completedCount} of ${result.totalCount} planned steps.`,
    result.filledFields.length > 0 ? `Verified fields: ${result.filledFields.join(', ')}.` : null,
    result.status === 'blocked'
      ? 'Execution is blocked on the current numbered field. Do not continue to later fields until this blocker is resolved.'
      : null,
  ]
    .filter(Boolean)
    .join('\n');
}

function formatOrderedStepObservation(
  step: OrderedAutofillResult['steps'][number]
): string {
  const lines = [
    `[ordered-fill] Step ${step.order} · ${step.fieldName} [${step.fieldType}]`,
    `Status: ${step.status}`,
    step.requestedValues.length > 0 ? `Requested: ${step.requestedValues.join(', ')}` : null,
    step.finalValue ? `Final value: ${step.finalValue}` : null,
    step.message,
    ...step.diagnostics.map((entry) => `- ${entry}`),
  ];

  return lines.filter(Boolean).join('\n');
}

async function getCurrentTabContext(tabsController: TabsController): Promise<ToolTabContext> {
  const tabId = tabsController.currentTabId;
  if (!tabId) {
    throw new Error('No current tab is selected.');
  }

  const tabInfo = await tabsController.getTabInfo(tabId);
  return {
    tabId,
    title: tabInfo.title,
    url: tabInfo.url,
  };
}

async function sendFormMessage<TResponse extends FormMessageResponse>(
  tabsController: TabsController,
  type:
    | 'form:detect'
    | 'form:fill'
    | 'form:ordered-fill'
    | 'form:select-options'
    | 'form:set-field-value',
  payload?: Record<string, unknown>
): Promise<{ tab: ToolTabContext; response: TResponse }> {
  const tab = await getCurrentTabContext(tabsController);

  if (!canUseTabMessaging(tab.url)) {
    throw new Error('The current tab is not a supported http/https page.');
  }

  const response = await sendMessageToTabId<TResponse>(tab.tabId, tab.url, { type, payload });
  return { tab, response };
}

export function createFormTools(tabsController: TabsController): Record<string, FormTool> {
  return {
    quick_discover_form: {
      description:
        'Analyze the current page with the extension form detector. Use this before low-level form automation to understand available fields, form counts, submit controls, and likely targets such as name, url, category, tags, and description.',
      inputSchema: z.object({}),
      execute: async () => {
        try {
          const { tab, response } = await sendFormMessage<{
            success?: boolean;
            result?: FormDetectionResult;
            error?: string;
          }>(tabsController, 'form:detect');

          if (!response.success || !response.result) {
            throw new Error(response.error || 'No form analysis result returned.');
          }

          return formatDetectionSummary(tab, response.result);
        } catch (error) {
          return `Failed to run Quick Discover: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    },

    ordered_quick_fill_form: tool({
      description:
        'Run a deterministic ordered autofill pass on the current page: scan visible fields, ask the LLM for field values, then fill fields one by one in page order. Stop immediately on the first field that cannot be confirmed, and emit per-field runtime diagnostics.',
      inputSchema: z.object({}),
      execute: async function (this: PageAgentCore) {
        try {
          const { tab, response } = await sendFormMessage<{
            success?: boolean;
            result?: OrderedAutofillResult;
            error?: string;
          }>(tabsController, 'form:ordered-fill');

          if (!response.success || !response.result) {
            throw new Error(response.error || 'No ordered autofill result returned.');
          }

          for (const step of response.result.steps) {
            pushAgentObservation(this, formatOrderedStepObservation(step));
          }

          return formatOrderedAutofillSummary(tab, response.result);
        } catch (error) {
          return `Failed to run ordered Quick Fill: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }) as unknown as FormTool,

    quick_fill_form: {
      description:
        'Autofill the current page using the extension\'s built-in LLM-first form filler and the selected website profile context. Prefer this as an initial stable pass on standard directory or submission forms before manually targeting the remaining fields.',
      inputSchema: z.object({}),
      execute: async () => {
        try {
          const { tab, response } = await sendFormMessage<{
            success?: boolean;
            result?: AutofillResult;
            error?: string;
          }>(tabsController, 'form:fill', { strategy: 'llm' });

          if (!response.success || !response.result) {
            throw new Error(response.error || 'No autofill result returned.');
          }

          return formatAutofillSummary(tab, response.result);
        } catch (error) {
          return `Failed to run Quick Fill: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    },

    set_form_field_value: {
      description:
        'Set a text, URL, email, or textarea field by matching a visible field label or hint. This tool is idempotent: if the field already contains the requested value, it returns unchanged so the agent can move on instead of retyping the same text.',
      inputSchema: z.object({
        fieldHint: z.string().min(1),
        value: z.string().min(1),
      }),
      execute: async (input) => {
        try {
          const parsed = z
            .object({
              fieldHint: z.string().min(1),
              value: z.string().min(1),
            })
            .parse(input);

          const { tab, response } = await sendFormMessage<{
            success?: boolean;
            result?: FormSetFieldValueResult;
            error?: string;
          }>(tabsController, 'form:set-field-value', parsed);

          if (!response.success || !response.result) {
            throw new Error(response.error || 'No set-field-value result returned.');
          }

          return formatSetFieldValueSummary(tab, response.result);
        } catch (error) {
          return `Failed to update text field: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    },

    select_form_field_options: {
      description:
        'Select one or more options in a dynamic select, combobox, category picker, checkbox list, or tag picker by matching a visible field label or hint. Use this when low-level clicks are unreliable after a dropdown opens.',
      inputSchema: z.object({
        fieldHint: z.string().min(1),
        values: z.array(z.string().min(1)).min(1),
        allowMultiple: z.boolean().optional(),
      }),
      execute: async (input) => {
        try {
          const parsed = z
            .object({
              fieldHint: z.string().min(1),
              values: z.array(z.string().min(1)).min(1),
              allowMultiple: z.boolean().optional(),
            })
            .parse(input);

          const { tab, response } = await sendFormMessage<{
            success?: boolean;
            result?: FormSelectOptionsResult;
            error?: string;
          }>(tabsController, 'form:select-options', parsed);

          if (!response.success || !response.result) {
            throw new Error(response.error || 'No select-options result returned.');
          }

          return formatSelectOptionsSummary(tab, response.result);
        } catch (error) {
          return `Failed to select dynamic form options: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    },
  };
}
