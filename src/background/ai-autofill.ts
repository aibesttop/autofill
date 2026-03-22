import * as z from 'zod/v4';

import { loadAgentConfig, validateAgentConfig } from '../agent/config-storage';
import { normalizeBaseURLForModel } from '../agent/constants';
import type {
  LLMFieldMappingRequest,
  LLMFieldMappingResult,
  LLMObservedOptionMatchRequest,
  LLMObservedOptionMatchResult,
  LLMPageAutofillPlanRequest,
  LLMPageAutofillPlanResult,
} from '../content/types';

const STRUCTURED_OUTPUT_SYSTEM_PROMPT =
  'You are an expert browser autofill planner. Reply with exactly one JSON object and no markdown.';

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

const PAGE_ACTION_STEP_SCHEMA = z
  .object({
    action: z.enum(['input', 'select', 'click']),
    index: z.number().int().nonnegative(),
    text: z.string().trim().min(1).max(500).optional(),
    option: z.string().trim().min(1).max(240).optional(),
    label: z.string().trim().max(240).optional(),
    reasoning: z.string().trim().max(240).optional(),
  })
  .superRefine((step, ctx) => {
    if (step.action === 'input' && !step.text) {
      ctx.addIssue({
        code: 'custom',
        message: 'Input steps require text.',
      });
    }

    if (step.action === 'select' && !step.option) {
      ctx.addIssue({
        code: 'custom',
        message: 'Select steps require option.',
      });
    }
  });

const PAGE_ACTION_PLAN_RESULT_SCHEMA = z.object({
  summary: z.string().trim().min(1).max(280),
  steps: z.array(PAGE_ACTION_STEP_SCHEMA).max(30),
});

const OBSERVED_OPTION_MATCH_RESULT_SCHEMA = z.object({
  summary: z.string().trim().min(1).max(280),
  selectedOptions: z.array(z.string().trim().min(1).max(240)).max(8),
  reasoning: z.string().trim().max(240).optional(),
});

interface ChatCompletionResponse {
  choices?: Array<{
    message?: {
      content?: string | Array<{ type?: string; text?: string }>;
    };
  }>;
  error?: {
    message?: string;
  };
}

interface GeminiGenerateContentResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
      }>;
    };
  }>;
  error?: {
    message?: string;
  };
}

interface ReplicatePredictionResponse {
  status?: string;
  error?: string | null;
  output?: string[] | string;
}

type AgentConfig = Awaited<ReturnType<typeof loadAgentConfig>>;

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, '');
}

function isGeminiModel(model: string): boolean {
  return model.trim().toLowerCase().startsWith('gemini');
}

function isReplicateBaseURL(baseURL: string): boolean {
  try {
    return new URL(baseURL).hostname === 'api.replicate.com';
  } catch {
    return false;
  }
}

function stripOpenAICompatSegment(baseURL: string): string {
  return trimTrailingSlash(baseURL).replace(/\/openai$/i, '');
}

function buildReplicateModelEndpoint(baseURL: string, model: string): string {
  const [owner, name, ...rest] = model.split('/').filter(Boolean);

  if (!owner || !name || rest.length > 0) {
    throw new Error('Replicate model must use owner/name format, for example openai/gpt-4.1-mini.');
  }

  return `${trimTrailingSlash(baseURL)}/models/${owner}/${name}/predictions`;
}

async function parseJSONResponse<T>(response: Response, endpoint: string): Promise<T> {
  const responseText = await response.text();

  try {
    return responseText ? (JSON.parse(responseText) as T) : ({} as T);
  } catch {
    throw new Error(`AI autofill returned invalid JSON from ${endpoint}.`);
  }
}

function getProviderErrorMessage(response: { error?: { message?: string } }): string | null {
  return response.error?.message?.trim() || null;
}

function extractMessageContent(response: ChatCompletionResponse): string {
  const content = response.choices?.[0]?.message?.content;

  if (typeof content === 'string') {
    return content;
  }

  if (Array.isArray(content)) {
    return content
      .map((part) => ('text' in part ? part.text || '' : ''))
      .join('')
      .trim();
  }

  return '';
}

function extractGeminiMessageContent(response: GeminiGenerateContentResponse): string {
  return (
    response.candidates?.[0]?.content?.parts
      ?.map((part) => part.text || '')
      .join('')
      .trim() || ''
  );
}

function extractReplicateOutput(response: ReplicatePredictionResponse): string {
  if (typeof response.output === 'string') {
    return response.output.trim();
  }

  if (Array.isArray(response.output)) {
    return response.output.join('').trim();
  }

  return '';
}

function extractJSONObject(rawText: string): string {
  const trimmed = rawText.trim();
  const fencedMatch = trimmed.match(/```(?:json)?\s*([\s\S]+?)```/i);
  const candidate = fencedMatch?.[1]?.trim() || trimmed;
  const firstBrace = candidate.indexOf('{');

  if (firstBrace === -1) {
    throw new Error('The model did not return a JSON object.');
  }

  let depth = 0;
  for (let index = firstBrace; index < candidate.length; index += 1) {
    const character = candidate[index];
    if (character === '{') {
      depth += 1;
    } else if (character === '}') {
      depth -= 1;
      if (depth === 0) {
        return candidate.slice(firstBrace, index + 1);
      }
    }
  }

  throw new Error('The model returned incomplete JSON.');
}

async function getValidatedConfig(): Promise<AgentConfig> {
  const config = await loadAgentConfig();
  const validationError = validateAgentConfig(config);

  if (validationError) {
    throw new Error(validationError);
  }

  return config;
}

async function invokeOpenAICompatiblePrompt(
  prompt: string,
  config: AgentConfig
): Promise<string> {
  const normalizedBaseURL = normalizeBaseURLForModel(config.baseURL, config.model);
  const endpoint = `${trimTrailingSlash(normalizedBaseURL)}/chat/completions`;

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: config.model,
      temperature: 0,
      messages: [
        {
          role: 'system',
          content: STRUCTURED_OUTPUT_SYSTEM_PROMPT,
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
    }),
  });

  const parsedResponse = await parseJSONResponse<ChatCompletionResponse>(response, endpoint);

  if (!response.ok) {
    const providerMessage = getProviderErrorMessage(parsedResponse);
    throw new Error(
      providerMessage || `AI autofill failed with HTTP ${response.status} at ${endpoint}.`
    );
  }

  return extractMessageContent(parsedResponse);
}

async function invokeGeminiPrompt(
  prompt: string,
  config: AgentConfig
): Promise<string> {
  const normalizedBaseURL = stripOpenAICompatSegment(config.baseURL);
  const endpoint = `${normalizedBaseURL}/models/${config.model}:generateContent?key=${encodeURIComponent(config.apiKey)}`;

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents: [
        {
          role: 'user',
          parts: [{ text: prompt }],
        },
      ],
      systemInstruction: {
        parts: [{ text: STRUCTURED_OUTPUT_SYSTEM_PROMPT }],
      },
      generationConfig: {
        temperature: 0,
      },
    }),
  });

  const parsedResponse = await parseJSONResponse<GeminiGenerateContentResponse>(response, endpoint);

  if (!response.ok) {
    const providerMessage = getProviderErrorMessage(parsedResponse);
    throw new Error(
      providerMessage || `AI autofill failed with HTTP ${response.status} at ${endpoint}.`
    );
  }

  return extractGeminiMessageContent(parsedResponse);
}

async function invokeReplicatePrompt(
  prompt: string,
  config: AgentConfig
): Promise<string> {
  const endpoint = buildReplicateModelEndpoint(stripOpenAICompatSegment(config.baseURL), config.model);

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.apiKey}`,
      Prefer: 'wait=60',
    },
    body: JSON.stringify({
      input: {
        system_prompt: STRUCTURED_OUTPUT_SYSTEM_PROMPT,
        prompt,
        temperature: 0,
        max_completion_tokens: 1600,
      },
    }),
  });

  const parsedResponse = await parseJSONResponse<ReplicatePredictionResponse>(response, endpoint);

  if (!response.ok || parsedResponse.error) {
    throw new Error(
      parsedResponse.error?.trim() ||
        `AI autofill failed with HTTP ${response.status} at ${endpoint}.`
    );
  }

  return extractReplicateOutput(parsedResponse);
}

async function generateStructuredContent(prompt: string): Promise<string> {
  const config = await getValidatedConfig();

  if (isReplicateBaseURL(config.baseURL)) {
    return invokeReplicatePrompt(prompt, config);
  }

  try {
    return await invokeOpenAICompatiblePrompt(prompt, config);
  } catch (error) {
    if (!isGeminiModel(config.model)) {
      throw error;
    }

    const message = error instanceof Error ? error.message : String(error);
    const shouldRetryWithGemini =
      /Invalid URL/i.test(message) ||
      /chat\/completions/i.test(message) ||
      /404/i.test(message);

    if (!shouldRetryWithGemini) {
      throw error;
    }

    return invokeGeminiPrompt(prompt, config);
  }
}

function buildFieldMappingPrompt(request: LLMFieldMappingRequest): string {
  return [
    'Map the selected website profile into the provided page form fields.',
    'Return exactly one JSON object with this shape:',
    '{"summary":"short text","steps":[{"fieldIndex":0,"value":"..."}]}',
    'Rules:',
    '- Treat the fields as an ordered fill sequence. Return steps in ascending fieldIndex order.',
    '- Keep the sequence stable and deterministic. Do not jump ahead to a later field while an earlier planned field is unresolved.',
    '- Use only the provided field indexes.',
    '- Only include safe, high-confidence mappings.',
    '- Do not invent email, phone, password, login, payment, captcha, or verification values.',
    '- For category/tag/topic/select fields, return the best option labels or search terms.',
    '- Use `values` for multi-select or tag-like fields and `value` for single-value fields.',
    '- Skip fields when there is no safe mapping.',
    '- Do not wrap the JSON in markdown.',
    '',
    `Page title: ${request.pageTitle || 'Untitled page'}`,
    `Page URL: ${request.pageUrl}`,
    `Website profile: ${JSON.stringify(request.profile, null, 2)}`,
    `Form fields: ${JSON.stringify(request.fields, null, 2)}`,
  ].join('\n');
}

function buildPageActionPrompt(request: LLMPageAutofillPlanRequest): string {
  return [
    'Create a page automation plan for autofill.',
    'Return exactly one JSON object with this shape:',
    '{"summary":"short text","steps":[{"action":"input","index":12,"text":"Acme Launchpad"}]}',
    'Allowed actions:',
    '- input: type text into a textbox/textarea/url field',
    '- select: choose an option text for a native combobox/select',
    '- click: click a checkbox, radio, or non-submit toggle only when necessary',
    'Rules:',
    '- Use only element indexes that appear in the snapshot.',
    '- Never click submit, save, publish, continue, next, register, or send buttons.',
    '- Prefer input/select actions over click.',
    '- Use select only when the target is clearly a combobox/select and option text is known from the snapshot.',
    '- Skip uncertain actions.',
    '- Keep the plan focused on filling business listing fields from the website profile.',
    '- Do not wrap the JSON in markdown.',
    '',
    `Page title: ${request.pageTitle || 'Untitled page'}`,
    `Page URL: ${request.pageUrl}`,
    `Website profile: ${JSON.stringify(request.profile, null, 2)}`,
    'Interactive snapshot:',
    request.snapshot,
  ].join('\n');
}

function buildObservedOptionMatchPrompt(request: LLMObservedOptionMatchRequest): string {
  return [
    'Map the requested category/tag values to the observed page options.',
    'Return exactly one JSON object with this shape:',
    '{"summary":"short text","selectedOptions":["Automation"],"reasoning":"brief reason"}',
    'Rules:',
    '- You may only return option strings that appear exactly in observedOptions.',
    '- Never invent a new option and never paraphrase an observed option.',
    '- If there is no high-confidence match, return an empty selectedOptions array.',
    '- Prefer semantically closest business/listing categories.',
    '- Keep the response deterministic and conservative.',
    '- Do not wrap the JSON in markdown.',
    '',
    `Page title: ${request.pageTitle || 'Untitled page'}`,
    `Page URL: ${request.pageUrl}`,
    `Field label: ${request.fieldLabel}`,
    `Allow multiple: ${request.allowMultiple ? 'yes' : 'no'}`,
    `Requested values: ${JSON.stringify(request.requestedValues)}`,
    `Observed options: ${JSON.stringify(request.observedOptions)}`,
  ].join('\n');
}

export async function planAutofillFieldsWithLLM(
  request: LLMFieldMappingRequest
): Promise<LLMFieldMappingResult> {
  const content = await generateStructuredContent(buildFieldMappingPrompt(request));
  const jsonText = extractJSONObject(content);
  return FIELD_MAPPING_RESULT_SCHEMA.parse(JSON.parse(jsonText));
}

export async function planPageAutofillActionsWithLLM(
  request: LLMPageAutofillPlanRequest
): Promise<LLMPageAutofillPlanResult> {
  const content = await generateStructuredContent(buildPageActionPrompt(request));
  const jsonText = extractJSONObject(content);
  return PAGE_ACTION_PLAN_RESULT_SCHEMA.parse(JSON.parse(jsonText));
}

export async function matchObservedOptionsWithLLM(
  request: LLMObservedOptionMatchRequest
): Promise<LLMObservedOptionMatchResult> {
  const content = await generateStructuredContent(buildObservedOptionMatchPrompt(request));
  const jsonText = extractJSONObject(content);
  return OBSERVED_OPTION_MATCH_RESULT_SCHEMA.parse(JSON.parse(jsonText));
}
