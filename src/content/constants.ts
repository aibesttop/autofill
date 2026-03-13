/**
 * Constants for Content Script
 */

import { SupportedLanguage } from './types';

/**
 * Storage keys
 */
export const STORAGE_KEYS = {
  PLUGIN_ENABLED: 'pluginEnabled',
  AUTO_DETECT: 'autoDetect',
  FLOATING_BUTTON: 'floatingButton',
  CONTEXT_MENU: 'contextMenuEnabled',
} as const;

/**
 * Default values
 */
export const DEFAULTS = {
  PLUGIN_ENABLED: true,
  AUTO_DETECT: false,
  FLOATING_BUTTON: true,
  CONTEXT_MENU: true,
} as const;

/**
 * Twitter/X domains
 */
export const TWITTER_DOMAINS = [
  'twitter.com',
  'x.com',
  'mobile.x.com',
  'twibird.com',
] as const;

/**
 * CSS selectors for form field detection
 */
export const FORM_SELECTORS = {
  INPUT_TYPES: ['text', 'email', 'url', 'tel', 'search', 'textarea'],
  IGNORE_ROLES: ['combobox', 'listbox', 'textbox'],
  IGNORE_SELECTORS: '[aria-hidden="true"]', // '[style*="display: none"]',
} as const;

/**
 * Default AI button position
 */
export const DEFAULT_BUTTON_CONFIG = {
  position: 'top' as const,
  offset: 10,
  zIndex: 2147483640,
} as const;

/**
 * Page hook channel name
 */
export const PAGE_HOOK_CHANNEL = 'x-exporter-bridge';

/**
 * Maximum form fields to detect
 */
export const MAX_FORM_FIELDS = 100;

/**
 * Debounce time for form detection (ms)
 */
export const FORM_DETECTION_DEBOUNCE = 500;

/**
 * Mutation observer config
 */
export const MUTATION_OBSERVER_CONFIG = {
  childList: true,
  subtree: true,
  attributes: true,
  attributeFilter: ['class', 'style', 'aria-hidden'],
} as const;
