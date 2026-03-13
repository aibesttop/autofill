/**
 * Type definitions for Content Script
 */

export type ContentMessageType =
  | 'plugin:toggle'
  | 'autoDetect:toggle'
  | 'insert'
  | 'sidepanel:toggle'
  | 'contextmenu:open-panel'
  | 'floatingButton:toggle'
  | 'form:detect'
  | 'form:fill';

export interface PluginState {
  enabled: boolean;
  autoDetect: boolean;
  floatingButton: boolean;
  contextMenu: boolean;
}

export interface FormField {
  element: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | HTMLElement;
  type: string;
  name: string;
  label?: string;
  placeholder?: string;
  autocompleteType?: string;
}

export interface DetectedFormField {
  type: string;
  name: string;
  label?: string;
  placeholder?: string;
  autocompleteType?: string;
}

export interface FormDetectionResult {
  pageTitle: string;
  pageUrl: string;
  fieldCount: number;
  formCount: number;
  submitButtonCount: number;
  fieldTypes: Record<string, number>;
  fields: DetectedFormField[];
}

export interface AutofillResult {
  status: 'filled' | 'missing_profile' | 'no_target' | 'no_matches';
  profileName?: string;
  profileUrl?: string;
  filledCount: number;
  skippedCount: number;
  message: string;
  filledFields: string[];
}

export interface AIButtonConfig {
  position: 'top' | 'bottom' | 'left' | 'right';
  offset?: number;
  zIndex?: number;
}

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

export interface TranslationData {
  [key: string]: string;
}

export type SupportedLanguage = 'en' | 'zh_CN' | 'ja' | 'ko' | 'es' | 'fr' | 'de';

export interface ContentScriptContext {
  isActive: boolean;
  currentUrl: string;
  isTwitter: boolean;
  formFields: FormField[];
  observer: MutationObserver | null;
}
