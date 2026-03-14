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

export type AutofillStrategy = 'auto' | 'llm' | 'heuristic';

export interface FormFillPayload {
  strategy?: AutofillStrategy;
}

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
  strategy?: 'llm' | 'heuristic';
  planSummary?: string;
}

export interface AutofillOptionSummary {
  value: string;
  label: string;
}

export interface AutofillFieldSummary {
  index: number;
  type: string;
  name: string;
  label?: string;
  placeholder?: string;
  autocompleteType?: string;
  tagName?: string;
  role?: string;
  isEmpty: boolean;
  isRequired?: boolean;
  currentValue?: string;
  allowsMultiple?: boolean;
  options?: AutofillOptionSummary[];
}

export interface AutofillProfileSummary {
  id: string;
  name: string;
  url: string;
  category?: string;
  categories?: string[];
  description?: string;
  tags?: string[];
}

export interface LLMFieldMappingRequest {
  pageTitle: string;
  pageUrl: string;
  profile: AutofillProfileSummary;
  fields: AutofillFieldSummary[];
}

export interface LLMFieldMappingStep {
  fieldIndex: number;
  value?: string;
  values?: string[];
  reasoning?: string;
}

export interface LLMFieldMappingResult {
  summary: string;
  steps: LLMFieldMappingStep[];
}

export type PageAutofillActionType = 'input' | 'select' | 'click';

export interface LLMPageAutofillPlanRequest {
  pageTitle: string;
  pageUrl: string;
  profile: AutofillProfileSummary;
  snapshot: string;
}

export interface LLMPageAutofillStep {
  action: PageAutofillActionType;
  index: number;
  text?: string;
  option?: string;
  label?: string;
  reasoning?: string;
}

export interface LLMPageAutofillPlanResult {
  summary: string;
  steps: LLMPageAutofillStep[];
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
