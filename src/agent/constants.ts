import type { LLMConfig } from '@page-agent/llms';

// Default LLM configuration
export const DEFAULT_MODEL = import.meta.env.VITE_AGENT_MODEL || 'gpt-4o';
export const DEFAULT_BASE_URL = import.meta.env.VITE_AGENT_BASE_URL || 'https://api.openai.com/v1';
export const DEFAULT_API_KEY = import.meta.env.VITE_AGENT_API_KEY || '';

export const DEFAULT_CONFIG: LLMConfig = {
  apiKey: DEFAULT_API_KEY,
  baseURL: DEFAULT_BASE_URL,
  model: DEFAULT_MODEL,
};

/** Legacy testing endpoints that should be auto-migrated */
export const LEGACY_TESTING_ENDPOINTS: string[] = [];

export function isTestingEndpoint(url: string): boolean {
  const normalized = url.replace(/\/+$/, '');
  return LEGACY_TESTING_ENDPOINTS.some((ep) => normalized === ep);
}

export function migrateLegacyEndpoint(config: LLMConfig): LLMConfig {
  const normalized = config.baseURL.replace(/\/+$/, '');
  if (LEGACY_TESTING_ENDPOINTS.some((ep) => normalized === ep)) {
    return { ...DEFAULT_CONFIG };
  }
  return config;
}
