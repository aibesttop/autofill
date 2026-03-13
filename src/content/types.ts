/**
 * Type definitions for Content Script
 */

/**
 * Content script message types from background
 */
export type ContentMessageType =
  | 'plugin:toggle'
  | 'autoDetect:toggle'
  | 'insert'
  | 'sidepanel:toggle'
  | 'contextmenu:open-panel'
  | 'floatingButton:toggle';

/**
 * Plugin state from storage
 */
export interface PluginState {
  enabled: boolean;
  autoDetect: boolean;
  floatingButton: boolean;
  contextMenu: boolean;
}

/**
 * Detected form field
 */
export interface FormField {
  element: HTMLInputElement | HTMLTextAreaElement | HTMLElement;
  type: string;
  name: string;
  label?: string;
  placeholder?: string;
  autocompleteType?: string;
}

/**
 * AI button configuration
 */
export interface AIButtonConfig {
  position: 'top' | 'bottom' | 'left' | 'right';
  offset?: number;
  zIndex?: number;
}

/**
 * Page hook message
 */
export interface PageHookMessage {
  __xExporter: boolean;
  channel: string;
  type: 'capture' | 'log';
  url?: string;
  status?: number;
  body?: string;
  capturedAt?: number;
  level?: 'info' | 'warn' | 'error';
  message?: string;
}

/**
 * Localization data structure
 */
export interface TranslationData {
  [key: string]: string;
}

/**
 * Supported languages
 */
export type SupportedLanguage = 'en' | 'zh_CN' | 'ja' | 'ko' | 'es' | 'fr' | 'de';

/**
 * Content script context
 */
export interface ContentScriptContext {
  isActive: boolean;
  currentUrl: string;
  isTwitter: boolean;
  formFields: FormField[];
  observer: MutationObserver | null;
}
