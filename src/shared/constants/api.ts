// API-related constants

export const API_BASE_URL = 'https://autofill.app';
export const API_ENDPOINT = `${API_BASE_URL}/api`;

export const API_ROUTES = {
  AUTH_SIGNIN: `${API_ENDPOINT}/auth/signin`,
  AUTH_CLIENT: `${API_ENDPOINT}/auth/client`,
  WEBSITES: `${API_ENDPOINT}/websites`,
} as const;

export const STORAGE_KEYS = {
  AUTH_TOKEN: 'auth.token',
  CLIENT_ID: 'auth.client_id',
  PLUGIN_ENABLED: 'pluginEnabled',
  CONTEXT_MENU_ENABLED: 'contextMenuEnabled',
  AUTO_DETECT: 'autoDetect',
  FLOATING_BUTTON: 'floatingButton',
  BATCH_STATE: 'batchState',
  SELECTED_WEBSITE_ID: 'selectedWebsiteId',
  SELECTED_WEBSITE_SNAPSHOT: 'selectedWebsiteSnapshot',
  CURRENT_TAB_ID: 'currentTabId',
} as const;

export const AI_PROVIDERS = {
  autofill: 'autofill',
  OPENAI: 'openai',
  ANTHROPIC: 'anthropic',
  CUSTOM: 'custom',
} as const;

export const AI_MODELS = {
  [AI_PROVIDERS.autofill]: 'auto',
  [AI_PROVIDERS.OPENAI]: {
    default: 'gpt-4',
    options: ['gpt-4', 'gpt-4-turbo', 'gpt-3.5-turbo'],
  },
  [AI_PROVIDERS.ANTHROPIC]: {
    default: 'claude-3-opus',
    options: ['claude-3-opus', 'claude-3-sonnet'],
  },
} as const;
