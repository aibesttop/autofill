import * as z from 'zod/v4';

import type { AutofillResult, DetectedFormField, FormDetectionResult } from '@content/types';
import { canUseTabMessaging, sendMessageToTabId } from '@shared/utils/tab-messaging';

import type { TabsController } from './TabsController';

interface FormTool {
  description: string;
  inputSchema: z.ZodType;
  execute: (input: unknown) => Promise<string>;
}

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
    };

function getFieldDescriptor(field: DetectedFormField): string {
  return [field.label, field.name, field.placeholder, field.autocompleteType, field.type]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

function inferFieldPurpose(field: DetectedFormField): string | null {
  const descriptor = getFieldDescriptor(field);

  if (/categor|industr|niche|sector|type|platform/.test(descriptor)) {
    return 'category';
  }

  if (/tag|keyword|topic/.test(descriptor)) {
    return 'tags';
  }

  if (/website|homepage|domain|url|link/.test(descriptor)) {
    return 'url';
  }

  if (/name|title|company|business|project|brand/.test(descriptor)) {
    return 'name';
  }

  if (/description|about|summary|bio|details|message|overview/.test(descriptor)) {
    return 'description';
  }

  if (/email/.test(descriptor)) {
    return 'email';
  }

  return null;
}

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
    const purpose = inferFieldPurpose(field);
    if (!purpose) {
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

  return [
    `Quick Discover succeeded on ${tab.url}.`,
    `Page: ${result.pageTitle || tab.title || 'Untitled page'}`,
    `Detected ${result.fieldCount} fields across ${result.formCount} forms with ${result.submitButtonCount} submit controls.`,
    likelyTargets ? `Likely field targets: ${likelyTargets}.` : null,
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
  type: 'form:detect' | 'form:fill',
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

    quick_fill_form: {
      description:
        'Autofill the current page using the extension\'s built-in form filler and the selected website profile context. Prefer this on standard directory or submission forms before manually clicking and typing field by field.',
      inputSchema: z.object({}),
      execute: async () => {
        try {
          const { tab, response } = await sendFormMessage<{
            success?: boolean;
            result?: AutofillResult;
            error?: string;
          }>(tabsController, 'form:fill', { strategy: 'auto' });

          if (!response.success || !response.result) {
            throw new Error(response.error || 'No autofill result returned.');
          }

          return formatAutofillSummary(tab, response.result);
        } catch (error) {
          return `Failed to run Quick Fill: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    },
  };
}
