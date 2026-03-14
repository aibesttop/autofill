import type { SupportedLanguage } from '@page-agent/core';
import type { LLMConfig } from '@page-agent/llms';

import { DEFAULT_CONFIG, migrateLegacyEndpoint } from './constants';

export type LanguagePreference = SupportedLanguage | undefined;

export interface AdvancedConfig {
  maxSteps?: number;
  systemInstruction?: string;
  experimentalLlmsTxt?: boolean;
}

export interface ExtConfig extends LLMConfig, AdvancedConfig {
  language?: LanguagePreference;
}

export function getMissingAgentConfigFields(config: Partial<ExtConfig> | null | undefined): string[] {
  const missing: string[] = [];

  if (!config?.baseURL?.trim()) {
    missing.push('baseURL');
  }

  if (!config?.apiKey?.trim()) {
    missing.push('apiKey');
  }

  if (!config?.model?.trim()) {
    missing.push('model');
  }

  return missing;
}

export function validateAgentConfig(config: Partial<ExtConfig> | null | undefined): string | null {
  const missingFields = getMissingAgentConfigFields(config);

  if (missingFields.length === 0) {
    return null;
  }

  return `AI Agent requires ${missingFields.join(', ')}. Open the AI Agent settings and complete the model configuration before running tasks.`;
}

function withDefaultValue(value: string | undefined, fallback: string): string {
  return value?.trim() ? value : fallback;
}

function normalizeStoredConfig(config: Partial<LLMConfig> | null | undefined): LLMConfig {
  return {
    apiKey: withDefaultValue(config?.apiKey, DEFAULT_CONFIG.apiKey),
    baseURL: withDefaultValue(config?.baseURL, DEFAULT_CONFIG.baseURL),
    model: withDefaultValue(config?.model, DEFAULT_CONFIG.model),
  };
}

export async function loadAgentConfig(): Promise<ExtConfig> {
  const result = await chrome.storage.local.get(['llmConfig', 'language', 'advancedConfig']);
  let llmConfig = normalizeStoredConfig((result.llmConfig as Partial<LLMConfig>) ?? DEFAULT_CONFIG);
  const language = (result.language as SupportedLanguage) || undefined;
  const advancedConfig = (result.advancedConfig as AdvancedConfig) ?? {};

  const migratedConfig = migrateLegacyEndpoint(llmConfig);
  const shouldPersistConfig =
    !result.llmConfig ||
    normalizeStoredConfig(result.llmConfig as Partial<LLMConfig>).apiKey !==
      (result.llmConfig as Partial<LLMConfig>)?.apiKey ||
    normalizeStoredConfig(result.llmConfig as Partial<LLMConfig>).baseURL !==
      (result.llmConfig as Partial<LLMConfig>)?.baseURL ||
    normalizeStoredConfig(result.llmConfig as Partial<LLMConfig>).model !==
      (result.llmConfig as Partial<LLMConfig>)?.model;

  if (migratedConfig !== llmConfig) {
    llmConfig = migratedConfig;
    await chrome.storage.local.set({ llmConfig: migratedConfig });
  } else if (shouldPersistConfig) {
    await chrome.storage.local.set({ llmConfig });
  }

  return { ...llmConfig, ...advancedConfig, language };
}

export async function saveAgentConfig({
  language,
  maxSteps,
  systemInstruction,
  experimentalLlmsTxt,
  ...llmConfig
}: ExtConfig): Promise<void> {
  await chrome.storage.local.set({ llmConfig });

  if (language) {
    await chrome.storage.local.set({ language });
  } else {
    await chrome.storage.local.remove('language');
  }

  const advancedConfig: AdvancedConfig = {
    maxSteps,
    systemInstruction,
    experimentalLlmsTxt,
  };

  await chrome.storage.local.set({ advancedConfig });
}
