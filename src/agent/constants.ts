import type { LLMConfig } from '@page-agent/llms';

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, '');
}

function isGeminiModel(model: string | undefined): boolean {
  return (model || '').trim().toLowerCase().startsWith('gemini');
}

export function normalizeBaseURLForModel(baseURL: string, model?: string): string {
  const normalizedBaseURL = trimTrailingSlash(baseURL.trim());

  if (!normalizedBaseURL) {
    return normalizedBaseURL;
  }

  if (
    isGeminiModel(model) &&
    /\/v1beta$/i.test(normalizedBaseURL) &&
    !normalizedBaseURL.toLowerCase().endsWith('/openai')
  ) {
    return `${normalizedBaseURL}/openai`;
  }

  return normalizedBaseURL;
}

// Default LLM configuration
export const DEFAULT_MODEL = import.meta.env.VITE_AGENT_MODEL || 'gpt-4o';
export const DEFAULT_BASE_URL = normalizeBaseURLForModel(
  import.meta.env.VITE_AGENT_BASE_URL || 'https://api.openai.com/v1',
  DEFAULT_MODEL
);
export const DEFAULT_API_KEY = import.meta.env.VITE_AGENT_API_KEY || '';
export const FORCE_LOCAL_AGENT_CONFIG =
  import.meta.env.VITE_LOCAL_TEST_MODE === 'true' && Boolean(DEFAULT_API_KEY);

export const DEFAULT_CONFIG: LLMConfig = {
  apiKey: DEFAULT_API_KEY,
  baseURL: DEFAULT_BASE_URL,
  model: DEFAULT_MODEL,
};

/** Legacy testing endpoints that should be auto-migrated */
export const LEGACY_TESTING_ENDPOINTS: string[] = [];

export function isTestingEndpoint(url: string): boolean {
  const normalized = trimTrailingSlash(url);
  return LEGACY_TESTING_ENDPOINTS.some((ep) => normalized === ep);
}

export function migrateLegacyEndpoint(config: LLMConfig): LLMConfig {
  const normalized = trimTrailingSlash(config.baseURL);
  if (LEGACY_TESTING_ENDPOINTS.some((ep) => normalized === ep)) {
    return { ...DEFAULT_CONFIG };
  }
  return {
    ...config,
    baseURL: normalizeBaseURLForModel(normalized, config.model),
  };
}
