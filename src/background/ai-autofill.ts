import { LLM } from '@page-agent/llms';
import * as z from 'zod/v4';

import { loadAgentConfig, validateAgentConfig } from '../agent/config-storage';
import type { LLMFieldMappingRequest, LLMFieldMappingResult } from '../content/types';

const FIELD_MAPPING_STEP_SCHEMA = z
  .object({
    fieldIndex: z.number().int().nonnegative(),
    value: z.string().trim().min(1).max(400).optional(),
    values: z.array(z.string().trim().min(1).max(200)).min(1).max(8).optional(),
    reasoning: z.string().trim().max(240).optional(),
  })
  .superRefine((step, ctx) => {
    if (!step.value && (!step.values || step.values.length === 0)) {
      ctx.addIssue({
        code: 'custom',
        message: 'Each mapping step must include value or values.',
      });
    }
  });

const FIELD_MAPPING_RESULT_SCHEMA = z.object({
  summary: z.string().trim().min(1).max(280),
  steps: z.array(FIELD_MAPPING_STEP_SCHEMA).max(60),
});

type FieldMappingToolResult = z.infer<typeof FIELD_MAPPING_RESULT_SCHEMA>;

const FIELD_MAPPING_TOOL_NAME = 'return_field_mapping_plan';

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, '');
}

function buildPrompt(request: LLMFieldMappingRequest): string {
  return [
    'Map the selected website profile into the provided form fields.',
    'Return only confident field mappings.',
    'Rules:',
    '- Only use the provided field indexes.',
    '- Prefer filling empty business/listing/submission fields.',
    '- Do not invent email, phone, password, login, payment, captcha, or verification values.',
    '- For category/tag/topic/select fields, return the best human-readable option labels or search terms.',
    '- Use `values` for multi-select or tag-like fields and `value` for single-value fields.',
    '- Skip fields when there is no safe mapping from the profile.',
    '- Keep the summary short and practical.',
    '',
    `Page title: ${request.pageTitle || 'Untitled page'}`,
    `Page URL: ${request.pageUrl}`,
    `Website profile: ${JSON.stringify(request.profile, null, 2)}`,
    `Form fields: ${JSON.stringify(request.fields, null, 2)}`,
  ].join('\n');
}

export async function planAutofillFieldsWithLLM(
  request: LLMFieldMappingRequest
): Promise<LLMFieldMappingResult> {
  const config = await loadAgentConfig();
  const validationError = validateAgentConfig(config);

  if (validationError) {
    throw new Error(validationError);
  }

  const llm = new LLM({
    apiKey: config.apiKey,
    baseURL: trimTrailingSlash(config.baseURL),
    model: config.model,
    temperature: 0,
  });

  const abortController = new AbortController();
  const result = await llm.invoke(
    [
      {
        role: 'system',
        content:
          'You are an expert browser autofill planner. Choose the safest high-confidence mapping from website profile data to form fields.',
      },
      {
        role: 'user',
        content: buildPrompt(request),
      },
    ],
    {
      [FIELD_MAPPING_TOOL_NAME]: {
        description:
          'Return the field mapping plan for autofill. Use only the provided field indexes and include only safe mappings.',
        inputSchema: FIELD_MAPPING_RESULT_SCHEMA,
        execute: async (args: FieldMappingToolResult) => args,
      },
    },
    abortController.signal,
    {
      toolChoiceName: FIELD_MAPPING_TOOL_NAME,
    }
  );

  return FIELD_MAPPING_RESULT_SCHEMA.parse(result.toolResult);
}
