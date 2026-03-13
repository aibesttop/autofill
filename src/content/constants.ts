/**
 * Constants for Content Script
 */

export const STORAGE_KEYS = {
  PLUGIN_ENABLED: 'pluginEnabled',
  AUTO_DETECT: 'autoDetect',
  FLOATING_BUTTON: 'floatingButton',
  CONTEXT_MENU: 'contextMenuEnabled',
  SELECTED_WEBSITE_SNAPSHOT: 'selectedWebsiteSnapshot',
} as const;

export const DEFAULTS = {
  PLUGIN_ENABLED: true,
  AUTO_DETECT: false,
  FLOATING_BUTTON: true,
  CONTEXT_MENU: true,
} as const;

export const TWITTER_DOMAINS = [
  'twitter.com',
  'x.com',
  'mobile.x.com',
  'twibird.com',
] as const;

export const FORM_SELECTORS = {
  INPUT_TYPES: ['text', 'email', 'url', 'tel', 'search', 'textarea'],
  CUSTOM_SELECT_SELECTORS: [
    '[role="combobox"]',
    '[aria-haspopup="listbox"]',
  ],
  IGNORE_SELECTORS: '[aria-hidden="true"]',
} as const;

export const DEFAULT_BUTTON_CONFIG = {
  position: 'top' as const,
  offset: 10,
  zIndex: 2147483640,
} as const;

export const PAGE_HOOK_CHANNEL = 'x-exporter-bridge';

export const MAX_FORM_FIELDS = 100;

export const FORM_DETECTION_DEBOUNCE = 500;

export const MUTATION_OBSERVER_CONFIG = {
  childList: true,
  subtree: true,
  attributes: true,
  attributeFilter: ['class', 'style', 'aria-hidden'],
} as const;

export const LOCAL_TEST_MODE = import.meta.env.VITE_LOCAL_TEST_MODE === 'true';

export const LOCAL_TEST_DEFAULT_WEBSITE = {
  id: 'local-site-1',
  name: 'Acme Launchpad',
  url: 'https://acme.test',
  description: 'A local testing profile for directory submissions and startup listings.',
  category: 'SaaS',
  categories: ['SaaS', 'AI Tools'],
  tags: ['startup', 'directory', 'automation', 'launch'],
} as const;
