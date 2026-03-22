import { STORAGE_KEYS, LOCAL_TEST_DEFAULT_WEBSITE, LOCAL_TEST_MODE } from './constants';
import {
  requestLLMFieldMapping,
  requestLLMObservedOptionMatch,
  requestLLMPageAutofillPlan,
} from './ai-autofill';
import { FormFieldDetector } from './form-detector';
import {
  clickPageElement,
  getPageElementInfo,
  getPageSnapshot,
  inputPageElement,
  selectPageElement,
} from './page-controller';
import type {
  AutofillFieldSummary,
  AutofillOptionSummary,
  OrderedAutofillResult,
  OrderedAutofillStepResult,
  AutofillResult,
  AutofillStrategy,
  FormField,
  FormSetFieldValuePayload,
  FormSetFieldValueResult,
  FormSelectOptionsPayload,
  FormSelectOptionsResult,
  LLMFieldMappingRequest,
  LLMFieldMappingResult,
  LLMFieldMappingStep,
  LLMPageAutofillPlanRequest,
  LLMPageAutofillPlanResult,
  LLMPageAutofillStep,
} from './types';

interface SelectedWebsiteProfile {
  id: string;
  name: string;
  url: string;
  category?: string;
  categories?: string[];
  description?: string;
  tags?: string[];
}

interface AutofillExecution {
  filledFields: string[];
  planSummary?: string;
}

interface OrderedAutofillExecution {
  filledFields: string[];
  planSummary?: string;
  steps: OrderedAutofillStepResult[];
  blockedStep?: OrderedAutofillStepResult;
}

const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
  window.HTMLInputElement.prototype,
  'value'
)?.set;

const nativeTextAreaValueSetter = Object.getOwnPropertyDescriptor(
  window.HTMLTextAreaElement.prototype,
  'value'
)?.set;

const nativeSelectValueSetter = Object.getOwnPropertyDescriptor(
  window.HTMLSelectElement.prototype,
  'value'
)?.set;

const nativeCheckedSetter = Object.getOwnPropertyDescriptor(
  window.HTMLInputElement.prototype,
  'checked'
)?.set;

const SELECT_PLACEHOLDER_TERMS = [
  'select',
  'choose',
  'please select',
  'pick one',
  'pick a',
  'all',
  'any',
  'none',
  'other',
  'default',
  'optional',
] as const;

const CATEGORY_SYNONYMS: Record<string, string[]> = {
  saas: ['saas', 'software as a service', 'software'],
  design: ['design', 'creative', 'studio', 'agency'],
  marketing: ['marketing', 'seo', 'growth'],
  ecommerce: ['ecommerce', 'e-commerce', 'shopping', 'store'],
  education: ['education', 'edtech', 'learning'],
  finance: ['finance', 'fintech'],
  ai: ['ai', 'artificial intelligence', 'machine learning'],
  productivity: ['productivity'],
  developer: ['developer tools', 'devtools', 'developer'],
};

const CUSTOM_SELECT_OPTION_SELECTORS = [
  '[role="option"]',
  '[role="menuitemradio"]',
  '[role="menuitemcheckbox"]',
  '[role="checkbox"]',
  '[cmdk-item]',
  '[data-radix-collection-item]',
  '[data-slot="command-item"]',
  '[data-select-item]',
] as const;

const CUSTOM_SELECT_CONTAINER_SELECTORS = [
  '[role="listbox"]',
  '[role="menu"]',
  '[role="dialog"]',
  '[data-radix-popper-content-wrapper]',
  '[data-slot="content"]',
  '[data-slot="popover-content"]',
  '[data-slot="command-list"]',
  '[data-slot="dropdown-menu-content"]',
  '[data-state="open"]',
  '[cmdk-list]',
] as const;

const LOOSE_CUSTOM_SELECT_OPTION_SELECTORS = [
  'label',
  'button',
  'li',
  'div',
  '[tabindex]',
  '[data-value]',
  '[data-state]',
  '[aria-selected]',
  '[aria-checked]',
] as const;

const POPUP_DISCOVERY_SELECTORS = [
  'div',
  'section',
  'ul',
  'aside',
  ...CUSTOM_SELECT_CONTAINER_SELECTORS,
] as const;

function normalizeText(value: string | undefined): string {
  return (value || '').toLowerCase().replace(/\s+/g, ' ').trim();
}

function containsAny(text: string, keywords: string[]): boolean {
  return keywords.some((keyword) => text.includes(keyword));
}

function unique<T>(values: T[]): T[] {
  return Array.from(new Set(values));
}

function pushDiagnostic(diagnostics: string[] | undefined, message: string): void {
  if (!diagnostics) {
    return;
  }

  const normalized = message.replace(/\s+/g, ' ').trim();
  if (normalized) {
    diagnostics.push(normalized);
  }
}

function summarizeChoicesForDiagnostics(choices: SelectChoice[], limit = 8): string {
  if (choices.length === 0) {
    return 'none';
  }

  return choices
    .slice(0, limit)
    .map((choice) => `${choice.selected ? '[x]' : '[ ]'} ${choice.label || choice.value}`)
    .join(' | ');
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

function uniqueElements<T extends object>(values: T[]): T[] {
  return Array.from(new Set(values));
}

function getHostname(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./i, '');
  } catch {
    return url;
  }
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isSelectedWebsiteProfile(value: unknown): value is SelectedWebsiteProfile {
  return (
    isPlainObject(value) &&
    typeof value.id === 'string' &&
    typeof value.name === 'string' &&
    typeof value.url === 'string'
  );
}

async function getSelectedWebsiteProfile(): Promise<SelectedWebsiteProfile | null> {
  const result = await chrome.storage.local.get(STORAGE_KEYS.SELECTED_WEBSITE_SNAPSHOT);
  const snapshot = result[STORAGE_KEYS.SELECTED_WEBSITE_SNAPSHOT];
  if (isSelectedWebsiteProfile(snapshot)) {
    return snapshot;
  }

  if (LOCAL_TEST_MODE) {
    return {
      id: LOCAL_TEST_DEFAULT_WEBSITE.id,
      name: LOCAL_TEST_DEFAULT_WEBSITE.name,
      url: LOCAL_TEST_DEFAULT_WEBSITE.url,
      category: LOCAL_TEST_DEFAULT_WEBSITE.category,
      categories: [...LOCAL_TEST_DEFAULT_WEBSITE.categories],
      description: LOCAL_TEST_DEFAULT_WEBSITE.description,
      tags: [...LOCAL_TEST_DEFAULT_WEBSITE.tags],
    };
  }

  return null;
}

function getFieldDescriptor(field: FormField): string {
  return normalizeText(
    [
      field.name,
      field.label,
      field.placeholder,
      field.autocompleteType,
      field.type,
      field.element.getAttribute('role') || undefined,
    ]
      .filter(Boolean)
      .join(' ')
  );
}

function tokenize(value: string | undefined): string[] {
  const normalized = normalizeText(value);
  if (!normalized) {
    return [];
  }

  return normalized
    .split(/[^a-z0-9]+/i)
    .map((token) => token.trim())
    .filter((token) => token.length > 1);
}

function getFieldHintScore(field: FormField, hint: string): number {
  const normalizedHint = normalizeText(hint);
  if (!normalizedHint) {
    return 0;
  }

  const descriptor = getFieldDescriptor(field);
  const label = normalizeText(field.label);
  const name = normalizeText(field.name);
  const placeholder = normalizeText(field.placeholder);
  const hintTokens = tokenize(normalizedHint);
  const descriptorTokens = tokenize(descriptor);
  const overlappingTokenCount = hintTokens.filter((token) => descriptorTokens.includes(token)).length;
  const allHintTokensMatch =
    hintTokens.length > 0 && hintTokens.every((token) => descriptorTokens.includes(token));

  let score = 0;

  if (field.type === 'select') {
    score += 3;
  }

  if (label === normalizedHint) {
    score += 12;
  } else if (label.includes(normalizedHint)) {
    score += 9;
  }

  if (name === normalizedHint) {
    score += 8;
  } else if (name.includes(normalizedHint)) {
    score += 6;
  }

  if (placeholder && placeholder.includes(normalizedHint)) {
    score += 4;
  }

  if (descriptor === normalizedHint) {
    score += 10;
  } else if (descriptor.includes(normalizedHint) || normalizedHint.includes(descriptor)) {
    score += 7;
  }

  if (allHintTokensMatch) {
    score += 6;
  }

  score += overlappingTokenCount * 2;

  return score;
}

function findBestFieldByHint(fields: FormField[], hint: string): FormField | null {
  const normalizedHint = normalizeText(hint);
  if (!normalizedHint) {
    return null;
  }

  let bestField: FormField | null = null;
  let bestScore = 0;

  for (const field of fields) {
    const score = getFieldHintScore(field, normalizedHint);
    if (score > bestScore) {
      bestField = field;
      bestScore = score;
    }
  }

  return bestScore >= 6 ? bestField : null;
}

function getCategoryTerms(category: string | undefined): string[] {
  const normalizedCategory = normalizeText(category);
  if (!normalizedCategory) {
    return [];
  }

  const directSynonyms = CATEGORY_SYNONYMS[normalizedCategory] || [];
  const tokenSynonyms = tokenize(normalizedCategory).flatMap(
    (token) => CATEGORY_SYNONYMS[token] || [token]
  );

  return unique([normalizedCategory, ...directSynonyms, ...tokenSynonyms]);
}

function getProfileCategories(profile: SelectedWebsiteProfile): string[] {
  return unique(
    [profile.category, ...(profile.categories || [])]
      .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
      .map((value) => value.trim())
  );
}

function getProfileTags(profile: SelectedWebsiteProfile): string[] {
  return unique(
    (profile.tags || [])
      .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
      .map((value) => value.trim())
  );
}

function getProfileCategoryTerms(profile: SelectedWebsiteProfile): string[] {
  return unique(getProfileCategories(profile).flatMap((category) => getCategoryTerms(category)));
}

function getPreferredSearchTerms(field: FormField, profile: SelectedWebsiteProfile): string[] {
  const descriptor = getFieldDescriptor(field);
  const baseTerms = isTagField(descriptor)
    ? [...getProfileTags(profile), ...getProfileCategories(profile)]
    : [...getProfileCategories(profile), ...getProfileTags(profile)];

  const expandedTerms = baseTerms.flatMap((term) => [
    term,
    ...tokenize(term).filter((token) => token.length > 2 || token === 'ai'),
  ]);

  return unique(expandedTerms.map((term) => term.trim()).filter(Boolean));
}

function buildDescription(profile: SelectedWebsiteProfile): string {
  if (profile.description) {
    return profile.description;
  }

  const host = getHostname(profile.url);
  const primaryCategory = getProfileCategories(profile)[0];
  return primaryCategory
    ? `${profile.name} is a ${primaryCategory} website available at ${host}.`
    : `${profile.name} is available at ${host}.`;
}

function buildKeywordText(profile: SelectedWebsiteProfile): string | null {
  const parts = [profile.name, ...getProfileCategories(profile), ...getProfileTags(profile), getHostname(profile.url)];
  const uniqueParts = Array.from(new Set(parts.filter(Boolean)));
  return uniqueParts.length > 0 ? uniqueParts.join(', ') : null;
}

function buildCategoryText(profile: SelectedWebsiteProfile, preferMultiple: boolean): string | null {
  const categories = getProfileCategories(profile);
  if (categories.length === 0) {
    return null;
  }

  return preferMultiple ? categories.join(', ') : categories[0];
}

function buildTagText(profile: SelectedWebsiteProfile): string | null {
  const tags = getProfileTags(profile);
  if (tags.length > 0) {
    return tags.join(', ');
  }

  return buildKeywordText(profile);
}

function isPluralCategoryField(descriptor: string): boolean {
  return containsAny(descriptor, ['categories', 'industries', 'topics']);
}

function isTagField(descriptor: string): boolean {
  return containsAny(descriptor, ['tags', 'tag', 'keyword', 'keywords', 'topic']);
}

function resolveTextValue(field: FormField, profile: SelectedWebsiteProfile): string | null {
  const descriptor = getFieldDescriptor(field);
  const description = buildDescription(profile);
  const host = getHostname(profile.url);

  if (containsAny(descriptor, ['email', 'e-mail', 'phone', 'tel', 'mobile', 'fax'])) {
    return null;
  }

  if (
    field.type === 'url' ||
    containsAny(descriptor, ['website', 'homepage', 'domain', 'url', 'link'])
  ) {
    return profile.url;
  }

  if (
    containsAny(descriptor, [
      'company',
      'business',
      'organisation',
      'organization',
      'brand',
      'site name',
      'website name',
      'project name',
      'listing title',
      'title',
      'name',
    ])
  ) {
    return profile.name;
  }

  if (containsAny(descriptor, ['category', 'categories', 'industry', 'industries', 'niche', 'sector', 'type'])) {
    return buildCategoryText(profile, isPluralCategoryField(descriptor));
  }

  if (
    field.type === 'textarea' ||
    containsAny(descriptor, ['description', 'about', 'bio', 'summary', 'details', 'message', 'overview'])
  ) {
    return description;
  }

  if (isTagField(descriptor)) {
    return buildTagText(profile);
  }

  if (containsAny(descriptor, ['username', 'handle'])) {
    return host;
  }

  return field.element === document.activeElement ? profile.name : null;
}

function isPlaceholderOption(option: HTMLOptionElement): boolean {
  const text = normalizeText(option.textContent || option.label || option.value);
  const value = normalizeText(option.value);

  return (
    !text ||
    !value ||
    containsAny(text, [...SELECT_PLACEHOLDER_TERMS]) ||
    containsAny(value, [...SELECT_PLACEHOLDER_TERMS]) ||
    value === '0' ||
    value === '-1'
  );
}

function getSelectCandidateTerms(
  field: FormField,
  profile: SelectedWebsiteProfile
): string[] {
  const descriptor = getFieldDescriptor(field);
  const hostname = getHostname(profile.url);
  const categoryTerms = getProfileCategoryTerms(profile);
  const tagTerms = unique(
    getProfileTags(profile).flatMap((tag) => [normalizeText(tag), ...tokenize(tag)])
  );
  const candidates: string[] = [];

  if (containsAny(descriptor, ['category', 'categories', 'industry', 'industries', 'niche', 'sector', 'type', 'platform'])) {
    candidates.push(...categoryTerms);
  }

  if (isTagField(descriptor)) {
    candidates.push(...tagTerms);
  }

  if (
    containsAny(descriptor, [
      'company',
      'business',
      'organisation',
      'organization',
      'brand',
      'site name',
      'website name',
      'project name',
      'listing title',
      'title',
      'name',
    ])
  ) {
    candidates.push(normalizeText(profile.name), hostname);
  }

  candidates.push(...categoryTerms, ...tagTerms, normalizeText(profile.name), hostname);

  return unique(candidates.filter(Boolean));
}

function getTextSimilarityScore(optionText: string, candidate: string): number {
  if (!optionText || !candidate) {
    return 0;
  }

  if (optionText === candidate) {
    return 100;
  }

  if (optionText.includes(candidate) || candidate.includes(optionText)) {
    return Math.min(candidate.length * 8, 84);
  }

  const optionTokens = tokenize(optionText);
  const candidateTokens = tokenize(candidate);
  if (optionTokens.length === 0 || candidateTokens.length === 0) {
    return 0;
  }

  const matches = candidateTokens.filter((token) => optionTokens.includes(token)).length;
  if (matches === 0) {
    return 0;
  }

  return Math.round((matches / candidateTokens.length) * 60);
}

interface SelectChoice {
  value: string;
  label: string;
  element?: HTMLElement;
  selected?: boolean;
}

function isCategoryField(descriptor: string): boolean {
  return containsAny(descriptor, ['category', 'categories', 'industry', 'industries', 'niche', 'sector', 'type']);
}

function isMultiValueField(field: FormField): boolean {
  const descriptor = getFieldDescriptor(field);
  return isPluralCategoryField(descriptor) || isTagField(descriptor);
}

function getDesiredChoiceCount(field: FormField, profile: SelectedWebsiteProfile): number {
  const descriptor = getFieldDescriptor(field);

  if (isTagField(descriptor)) {
    return Math.max(getProfileTags(profile).length, 1);
  }

  if (isPluralCategoryField(descriptor) || isCategoryField(descriptor)) {
    return Math.max(getProfileCategories(profile).length, 1);
  }

  return 1;
}

function getSearchTermChoiceScore(choice: SelectChoice, term: string): number {
  const normalizedTerm = normalizeText(term);
  const optionTexts = unique([normalizeText(choice.label), normalizeText(choice.value)]).filter(Boolean);

  let optionScore = 0;
  for (const optionText of optionTexts) {
    optionScore = Math.max(optionScore, getTextSimilarityScore(optionText, normalizedTerm));
  }

  return optionScore;
}

function getChoiceKey(choice: SelectChoice): string {
  return `${normalizeText(choice.value)}::${normalizeText(choice.label)}`;
}

function getBestChoiceForSearchTerm(choices: SelectChoice[], term: string): SelectChoice | null {
  let bestMatch: { choice: SelectChoice; score: number } | null = null;

  for (const choice of choices) {
    const optionScore = getSearchTermChoiceScore(choice, term);
    if (!bestMatch || optionScore > bestMatch.score) {
      bestMatch = { choice, score: optionScore };
    }
  }

  return bestMatch && bestMatch.score >= 50 ? bestMatch.choice : null;
}

function normalizeCandidateTerms(values: string[]): string[] {
  return unique(
    values
      .flatMap((value) => [value, ...tokenize(value)])
      .map((value) => normalizeText(value))
      .filter(Boolean)
  );
}

function getChoiceScoreForTerms(choice: SelectChoice, terms: string[]): number {
  const normalizedTerms = normalizeCandidateTerms(terms);
  if (normalizedTerms.length === 0) {
    return 0;
  }

  return normalizedTerms.reduce((bestScore, term) => {
    return Math.max(bestScore, getSearchTermChoiceScore(choice, term));
  }, 0);
}

function getBestSelectChoiceForTerms(choices: SelectChoice[], terms: string[]): SelectChoice | null {
  let bestMatch: { choice: SelectChoice; score: number } | null = null;

  for (const choice of choices) {
    const optionScore = getChoiceScoreForTerms(choice, terms);

    if (!bestMatch || optionScore > bestMatch.score) {
      bestMatch = { choice, score: optionScore };
    }
  }

  return bestMatch && bestMatch.score >= 40 ? bestMatch.choice : null;
}

function getBestSelectChoicesForTerms(
  choices: SelectChoice[],
  terms: string[],
  desiredCount: number
): SelectChoice[] {
  if (desiredCount <= 0) {
    return [];
  }

  return choices
    .map((choice) => ({
      choice,
      score: getChoiceScoreForTerms(choice, terms),
    }))
    .filter((item) => item.score >= 40)
    .sort((left, right) => right.score - left.score)
    .slice(0, desiredCount)
    .map((item) => item.choice);
}

function getTopScoredChoicesForTerms(
  choices: SelectChoice[],
  terms: string[],
  limit = 5
): Array<{ choice: SelectChoice; score: number }> {
  return choices
    .map((choice) => ({
      choice,
      score: getChoiceScoreForTerms(choice, terms),
    }))
    .filter((item) => item.score > 0)
    .sort((left, right) => right.score - left.score)
    .slice(0, limit);
}

function mergeObservedChoices(
  target: Map<string, SelectChoice>,
  choices: SelectChoice[]
): void {
  for (const choice of choices) {
    const key = getChoiceKey(choice);
    const existing = target.get(key);

    if (!existing) {
      target.set(key, choice);
      continue;
    }

    if (choice.selected && !existing.selected) {
      target.set(key, choice);
    }
  }
}

function setSelectValues(element: HTMLSelectElement, values: string[]): void {
  const nextValues = new Set(values);

  Array.from(element.options).forEach((option) => {
    option.selected = nextValues.has(option.value);
  });

  dispatchFieldEvents(element);
}

function fillNativeSelectFieldWithTerms(
  field: FormField,
  terms: string[],
  desiredCount = 1,
  diagnostics?: string[]
): boolean {
  if (!(field.element instanceof HTMLSelectElement)) {
    return false;
  }

  const normalizedTerms = normalizeCandidateTerms(terms);
  if (normalizedTerms.length === 0) {
    pushDiagnostic(diagnostics, 'No normalized candidate terms were available for the native select.');
    return false;
  }

  const choices = Array.from(field.element.options)
    .filter((option) => !option.disabled && !isPlaceholderOption(option))
    .map<SelectChoice>((option) => ({
      value: option.value,
      label: option.textContent || option.label || option.value,
    }));
  pushDiagnostic(diagnostics, `Requested select terms: ${normalizedTerms.join(', ')}`);
  pushDiagnostic(diagnostics, `Visible native options: ${summarizeChoicesForDiagnostics(choices)}`);

  if (field.element.multiple || desiredCount > 1) {
    const bestChoices = getBestSelectChoicesForTerms(choices, normalizedTerms, desiredCount);
    const nextValues = bestChoices.map((choice) => choice.value);
    const currentValues = Array.from(field.element.selectedOptions).map((option) => option.value);
    pushDiagnostic(
      diagnostics,
      `Best native multi-select matches: ${bestChoices.map((choice) => choice.label || choice.value).join(', ') || 'none'}`
    );

    if (
      nextValues.length === 0 ||
      (nextValues.length === currentValues.length &&
        nextValues.every((value) => currentValues.includes(value)))
    ) {
      pushDiagnostic(diagnostics, 'Native multi-select did not produce a new selection.');
      return false;
    }

    setSelectValues(field.element, nextValues);
    const verifiedValues = Array.from(field.element.selectedOptions).map((option) => option.value);
    pushDiagnostic(diagnostics, `Verified native selected values: ${verifiedValues.join(', ') || 'none'}`);
    return (
      verifiedValues.length === nextValues.length &&
      nextValues.every((value) => verifiedValues.includes(value))
    );
  }

  const bestChoice = getBestSelectChoiceForTerms(choices, normalizedTerms);
  const nextValue = bestChoice?.value || null;
  pushDiagnostic(
    diagnostics,
    `Best native match: ${bestChoice ? bestChoice.label || bestChoice.value : 'none'}`
  );
  if (!nextValue || !canOverwriteSelectValue(field.element, nextValue)) {
    pushDiagnostic(diagnostics, 'Native select could not be safely overwritten.');
    return false;
  }

  setSelectValue(field.element, nextValue);
  pushDiagnostic(diagnostics, `Native select value after update: ${field.element.value || 'empty'}`);
  return field.element.value === nextValue;
}

function fillNativeSelectField(field: FormField, profile: SelectedWebsiteProfile): boolean {
  const desiredCount = field.element instanceof HTMLSelectElement && field.element.multiple
    ? getDesiredChoiceCount(field, profile)
    : 1;
  return fillNativeSelectFieldWithTerms(field, getSelectCandidateTerms(field, profile), desiredCount);
}

function canOverwriteSelectValue(select: HTMLSelectElement, nextValue: string): boolean {
  if (!select.value) {
    return true;
  }

  if (select.value === nextValue) {
    return false;
  }

  const selectedOption = select.options[select.selectedIndex];
  if (!selectedOption) {
    return true;
  }

  if (isPlaceholderOption(selectedOption)) {
    return true;
  }

  return select.selectedIndex === 0 && select.options.length > 1;
}

function isVisibleElement(element: Element | null): element is HTMLElement {
  if (!(element instanceof HTMLElement)) {
    return false;
  }

  const style = window.getComputedStyle(element);
  if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
    return false;
  }

  const rect = element.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0;
}

function getElementDepth(element: HTMLElement): number {
  let depth = 0;
  let current: HTMLElement | null = element;

  while (current?.parentElement) {
    depth += 1;
    current = current.parentElement;
  }

  return depth;
}

function getCurrentCustomSelectText(element: HTMLElement): string {
  return normalizeText(
    element.getAttribute('aria-valuetext') ||
      element.getAttribute('data-value') ||
      element.textContent ||
      ''
  );
}

function resolveCustomSelectTrigger(element: HTMLElement): HTMLElement {
  if (isSearchLikeElement(element)) {
    return element;
  }

  const role = element.getAttribute('role')?.toLowerCase();
  const ariaHasPopup = element.getAttribute('aria-haspopup')?.toLowerCase();
  if (
    role === 'combobox' ||
    ariaHasPopup === 'listbox' ||
    ariaHasPopup === 'dialog' ||
    (element.hasAttribute('aria-expanded') && element.hasAttribute('aria-controls')) ||
    element.tagName === 'BUTTON'
  ) {
    return element;
  }

  const candidates = Array.from(
    element.querySelectorAll<HTMLElement>(
      [
        '[role="combobox"]',
        'button',
        '[aria-haspopup="listbox"]',
        '[aria-haspopup="dialog"]',
        '[aria-expanded][aria-controls]',
        '[tabindex]:not([tabindex="-1"])',
      ].join(', ')
    )
  ).filter((candidate) => isVisibleElement(candidate) && !isCustomOptionCandidate(candidate));

  if (candidates.length === 0) {
    return element;
  }

  return candidates.sort((left, right) => {
    const score = (candidate: HTMLElement) => {
      const candidateRole = candidate.getAttribute('role')?.toLowerCase();
      const candidatePopup = candidate.getAttribute('aria-haspopup')?.toLowerCase();

      let value = 0;
      if (candidateRole === 'combobox') value += 8;
      if (candidate.tagName === 'BUTTON') value += 6;
      if (candidatePopup === 'listbox' || candidatePopup === 'dialog') value += 5;
      if (candidate.hasAttribute('aria-expanded') && candidate.hasAttribute('aria-controls')) value += 4;
      if (candidate.hasAttribute('aria-label') || candidate.hasAttribute('aria-labelledby')) value += 2;

      return value;
    };

    return score(right) - score(left);
  })[0];
}

function canOverwriteCustomSelectValueWithTerms(
  element: HTMLElement,
  choice: SelectChoice,
  terms: string[]
): boolean {
  const currentText = getCurrentCustomSelectText(element);
  const nextText = normalizeText(choice.label || choice.value);

  if (!currentText) {
    return true;
  }

  if (currentText === nextText) {
    return false;
  }

  if (containsAny(currentText, [...SELECT_PLACEHOLDER_TERMS]) || currentText.length <= 2) {
    return true;
  }

  const currentScore = getChoiceScoreForTerms(
    { value: currentText, label: currentText },
    terms
  );
  const nextScore = getChoiceScoreForTerms(choice, terms);

  return nextScore > currentScore;
}

function getElementCenter(element: HTMLElement): { x: number; y: number } {
  const rect = element.getBoundingClientRect();
  return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
}

function buildMouseEventInit(element: HTMLElement): MouseEventInit {
  const { x, y } = getElementCenter(element);
  return {
    bubbles: true,
    cancelable: true,
    view: window,
    clientX: x,
    clientY: y,
    screenX: x + window.screenX,
    screenY: y + window.screenY,
    button: 0,
    buttons: 1,
  };
}

function dispatchMouseSequence(element: HTMLElement): void {
  const init = buildMouseEventInit(element);

  element.dispatchEvent(new PointerEvent('pointerover', { ...init, pointerId: 1 }));
  element.dispatchEvent(new PointerEvent('pointerenter', { ...init, pointerId: 1, bubbles: false }));
  element.dispatchEvent(new MouseEvent('mouseenter', { ...init, bubbles: false }));
  element.dispatchEvent(new MouseEvent('mouseover', init));

  element.dispatchEvent(new PointerEvent('pointerdown', { ...init, pointerId: 1 }));
  element.dispatchEvent(new MouseEvent('mousedown', init));

  element.focus();

  element.dispatchEvent(new PointerEvent('pointerup', { ...init, pointerId: 1, buttons: 0 }));
  element.dispatchEvent(new MouseEvent('mouseup', { ...init, buttons: 0 }));
  element.dispatchEvent(new MouseEvent('click', { ...init, buttons: 0 }));
}

function isSearchLikeElement(element: HTMLElement): boolean {
  if (
    element instanceof HTMLInputElement ||
    element instanceof HTMLTextAreaElement ||
    element instanceof HTMLSelectElement
  ) {
    return true;
  }

  return element.getAttribute('role') === 'textbox';
}

function isCustomOptionCandidate(element: HTMLElement): boolean {
  if (!isVisibleElement(element)) {
    return false;
  }

  if (isSearchLikeElement(element)) {
    return false;
  }

  const role = element.getAttribute('role')?.toLowerCase();
  const hasCheckbox = !!element.querySelector('input[type="checkbox"], input[type="radio"]');
  const hasState =
    element.hasAttribute('aria-selected') ||
    element.hasAttribute('aria-checked') ||
    element.hasAttribute('data-state') ||
    element.hasAttribute('data-value');
  const hasPointerCursor = window.getComputedStyle(element).cursor === 'pointer';
  const hasTabIndex = element.hasAttribute('tabindex');
  const interactiveTag =
    element.tagName === 'LABEL' ||
    element.tagName === 'BUTTON' ||
    element.tagName === 'LI';
  const actionableRole =
    role === 'option' ||
    role === 'checkbox' ||
    role === 'menuitemcheckbox' ||
    role === 'menuitemradio';

  if (!(actionableRole || hasCheckbox || hasState || interactiveTag || hasPointerCursor || hasTabIndex)) {
    return false;
  }

  const text = normalizeText(element.textContent || element.getAttribute('aria-label') || '');
  if (!text || text.length > 120) {
    return false;
  }

  if (containsAny(text, ['search'])) {
    return false;
  }

  const childOptionCount = element.querySelectorAll(
    [...CUSTOM_SELECT_OPTION_SELECTORS, ...LOOSE_CUSTOM_SELECT_OPTION_SELECTORS].join(', ')
  ).length;
  if (
    element.tagName === 'DIV' &&
    childOptionCount > 4 &&
    !hasCheckbox &&
    !hasState &&
    !hasPointerCursor
  ) {
    return false;
  }

  return true;
}

function isChoiceSelectedElement(element: HTMLElement): boolean {
  if (
    element.getAttribute('aria-selected') === 'true' ||
    element.getAttribute('aria-checked') === 'true' ||
    element.getAttribute('data-state') === 'checked'
  ) {
    return true;
  }

  const checkbox = element.querySelector<HTMLInputElement>('input[type="checkbox"], input[type="radio"]');
  return !!checkbox?.checked;
}

function buildCustomSelectChoice(element: HTMLElement): SelectChoice | null {
  if (!isCustomOptionCandidate(element)) {
    return null;
  }

  const label = element.textContent || element.getAttribute('aria-label') || '';
  const value =
    element.getAttribute('data-value') ||
    element.getAttribute('value') ||
    label;

  return {
    value,
    label,
    element,
    selected: isChoiceSelectedElement(element),
  };
}

function getCustomOptionSelector(): string {
  return [
    ...CUSTOM_SELECT_OPTION_SELECTORS,
    ...LOOSE_CUSTOM_SELECT_OPTION_SELECTORS,
  ].join(', ');
}

function getLoosePopupOptionElements(container: HTMLElement): HTMLElement[] {
  return Array.from(
    container.querySelectorAll<HTMLElement>(LOOSE_CUSTOM_SELECT_OPTION_SELECTORS.join(', '))
  ).filter(isCustomOptionCandidate);
}

function getPopupContainerDistance(trigger: HTMLElement, candidate: HTMLElement): number {
  const triggerRect = trigger.getBoundingClientRect();
  const candidateRect = candidate.getBoundingClientRect();
  return Math.abs(candidateRect.top - triggerRect.bottom);
}

function scorePopupContainer(trigger: HTMLElement, candidate: HTMLElement): number {
  const role = candidate.getAttribute('role')?.toLowerCase();
  const hasSearch = !!getSearchInput(candidate);
  const hasCheckboxes = !!candidate.querySelector('input[type="checkbox"], [role="checkbox"]');
  const optionCount = candidate.querySelectorAll(
    [...CUSTOM_SELECT_OPTION_SELECTORS, ...LOOSE_CUSTOM_SELECT_OPTION_SELECTORS].join(', ')
  ).length;
  const distance = getPopupContainerDistance(trigger, candidate);

  let score = 0;
  if (role === 'listbox') score += 20;
  if (role === 'dialog') score += 12;
  if (role === 'menu') score += 8;
  if (candidate.matches(CUSTOM_SELECT_CONTAINER_SELECTORS.join(', '))) score += 6;
  if (hasSearch) score += 6;
  if (hasCheckboxes) score += 14;
  score += Math.min(optionCount, 10);
  score += Math.max(0, 8 - Math.round(distance / 60));

  return score;
}

function getControlledPopupContainers(element: HTMLElement): HTMLElement[] {
  const popupIds = [element.getAttribute('aria-controls'), element.getAttribute('aria-owns')]
    .flatMap((value) => (value ? value.split(/\s+/) : []))
    .filter(Boolean);

  return popupIds
    .map((id) => document.getElementById(id))
    .filter(isVisibleElement);
}

function getVisibleCustomOptionElements(element: HTMLElement): HTMLElement[] {
  const optionSelector = getCustomOptionSelector();
  const popupContainers = getPopupContainers(element);

  if (popupContainers.length > 0) {
    const primaryContainer = popupContainers[0];
    return uniqueElements(
      [
        ...Array.from(primaryContainer.querySelectorAll<HTMLElement>(optionSelector)).filter(isCustomOptionCandidate),
        ...getLoosePopupOptionElements(primaryContainer),
      ]
    ).sort((left, right) => getElementDepth(right) - getElementDepth(left));
  }

  return [];
}

function getNearbyPopupContainers(trigger: HTMLElement): HTMLElement[] {
  const triggerRect = trigger.getBoundingClientRect();

  return Array.from(
    document.body.querySelectorAll<HTMLElement>(POPUP_DISCOVERY_SELECTORS.join(', '))
  )
    .filter((candidate) => {
      if (
        !isVisibleElement(candidate) ||
        candidate === trigger ||
        candidate.contains(trigger) ||
        trigger.contains(candidate)
      ) {
        return false;
      }

      const rect = candidate.getBoundingClientRect();
      if (rect.width < 140 || rect.height < 60) {
        return false;
      }

      const overlapsHorizontally = rect.left <= triggerRect.right + 48 && rect.right >= triggerRect.left - 48;
      const isNearbyVertically = rect.top <= triggerRect.bottom + 320 && rect.bottom >= triggerRect.top - 24;
      if (!overlapsHorizontally || !isNearbyVertically) {
        return false;
      }

      const hasSearch = !!getSearchInput(candidate);
      const hasCheckboxes = !!candidate.querySelector('input[type="checkbox"], [role="checkbox"]');
      const hasChoiceRows =
        candidate.querySelectorAll(
          [...CUSTOM_SELECT_OPTION_SELECTORS, ...LOOSE_CUSTOM_SELECT_OPTION_SELECTORS].join(', ')
        ).length >= 2;

      return hasSearch || hasCheckboxes || hasChoiceRows;
    })
    .sort((left, right) => {
      const scoreDelta = scorePopupContainer(trigger, right) - scorePopupContainer(trigger, left);
      if (scoreDelta !== 0) {
        return scoreDelta;
      }

      return getPopupContainerDistance(trigger, left) - getPopupContainerDistance(trigger, right);
    });
}

function getKnownPopupContainersNearTrigger(trigger: HTMLElement): HTMLElement[] {
  const triggerRect = trigger.getBoundingClientRect();

  return Array.from(
    document.querySelectorAll<HTMLElement>(CUSTOM_SELECT_CONTAINER_SELECTORS.join(', '))
  )
    .filter((candidate) => {
      if (
        !isVisibleElement(candidate) ||
        candidate === trigger ||
        candidate.contains(trigger) ||
        trigger.contains(candidate)
      ) {
        return false;
      }

      const rect = candidate.getBoundingClientRect();
      if (rect.width < 120 || rect.height < 40) {
        return false;
      }

      const overlapsHorizontally = rect.left <= triggerRect.right + 64 && rect.right >= triggerRect.left - 64;
      const isNearbyVertically = rect.top <= triggerRect.bottom + 360 && rect.bottom >= triggerRect.top - 32;
      return overlapsHorizontally && isNearbyVertically;
    })
    .sort((left, right) => {
      const scoreDelta = scorePopupContainer(trigger, right) - scorePopupContainer(trigger, left);
      if (scoreDelta !== 0) {
        return scoreDelta;
      }

      return getPopupContainerDistance(trigger, left) - getPopupContainerDistance(trigger, right);
    });
}

function getPopupContainers(element: HTMLElement): HTMLElement[] {
  const controlledContainers = getControlledPopupContainers(element);
  if (controlledContainers.length > 0) {
    return controlledContainers;
  }

  const knownContainers = getKnownPopupContainersNearTrigger(element);
  if (knownContainers.length > 0) {
    return knownContainers;
  }

  return getNearbyPopupContainers(element);
}

function getSelectedCustomChoiceLabels(trigger: HTMLElement): string[] {
  return unique(
    collectVisibleCustomChoices(trigger)
      .filter((choice) => choice.selected)
      .map((choice) => choice.label || choice.value)
      .map((value) => value.trim())
      .filter(Boolean)
  );
}

function isCustomSelectOpen(trigger: HTMLElement): boolean {
  if (trigger.getAttribute('aria-expanded') === 'true') {
    return true;
  }

  if (getControlledPopupContainers(trigger).length > 0) {
    return true;
  }

  const popupContainers = getPopupContainers(trigger);
  if (popupContainers.length === 0) {
    return false;
  }

  const topContainer = popupContainers[0];
  return scorePopupContainer(trigger, topContainer) >= 18;
}

async function closeCustomSelect(trigger: HTMLElement): Promise<void> {
  const popupContainers = getPopupContainers(trigger);
  if (popupContainers.length === 0) {
    return;
  }

  const closeButton = popupContainers
    .flatMap((container) =>
      Array.from(
        container.querySelectorAll<HTMLElement>('button, [role="button"], [aria-label]')
      )
    )
    .find((candidate) => {
      const text = normalizeText(
        candidate.textContent || candidate.getAttribute('aria-label') || candidate.getAttribute('title') || ''
      );
      return text === 'close' || text.includes('close');
    });

  if (closeButton) {
    dispatchMouseSequence(closeButton);
    closeButton.click();
    await delay(80);
    return;
  }

  const activeElement = document.activeElement;
  if (activeElement instanceof HTMLElement) {
    activeElement.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true })
    );
    activeElement.dispatchEvent(
      new KeyboardEvent('keyup', { key: 'Escape', bubbles: true, cancelable: true })
    );
    await delay(80);
  }

  if (getPopupContainers(trigger).length > 0 && trigger.getAttribute('aria-expanded') === 'true') {
    dispatchMouseSequence(trigger);
    trigger.click();
    await delay(80);
  }
}

function getSearchInput(container: HTMLElement): HTMLInputElement | HTMLTextAreaElement | null {
  const candidate = container.querySelector<HTMLInputElement | HTMLTextAreaElement>(
    [
      'input[type="search"]',
      'input[placeholder*="Search" i]',
      'input[aria-label*="search" i]',
      'input:not([type="checkbox"]):not([type="radio"]):not([type="hidden"])',
      'textarea',
    ].join(', ')
  );

  if (candidate instanceof HTMLInputElement || candidate instanceof HTMLTextAreaElement) {
    return candidate;
  }

  return null;
}

function setTextControlValue(
  element: HTMLInputElement | HTMLTextAreaElement,
  value: string
): void {
  element.focus();

  if (element instanceof HTMLTextAreaElement) {
    nativeTextAreaValueSetter?.call(element, value);
  } else {
    nativeInputValueSetter?.call(element, value);
  }

  if (element.value !== value) {
    element.value = value;
  }

  element.dispatchEvent(
    new InputEvent('input', {
      bubbles: true,
      inputType: 'insertText',
      data: value,
    })
  );
  element.dispatchEvent(new Event('change', { bubbles: true }));
}

function collectVisibleCustomChoices(trigger: HTMLElement): SelectChoice[] {
  return getVisibleCustomOptionElements(trigger)
    .map(buildCustomSelectChoice)
    .filter((choice): choice is SelectChoice => choice !== null)
    .filter((choice) => !containsAny(normalizeText(choice.label || choice.value), [...SELECT_PLACEHOLDER_TERMS]));
}

async function gatherObservedCustomChoices(
  trigger: HTMLElement,
  terms: string[],
  diagnostics?: string[]
): Promise<SelectChoice[]> {
  const observedChoices = new Map<string, SelectChoice>();
  const normalizedTerms = normalizeCandidateTerms(terms);

  let popupContainers = getPopupContainers(trigger);
  if (popupContainers.length === 0) {
    const didOpen = await openCustomSelect(trigger, diagnostics);
    if (!didOpen) {
      return [];
    }
    popupContainers = getPopupContainers(trigger);
  }

  mergeObservedChoices(observedChoices, collectVisibleCustomChoices(trigger));
  pushDiagnostic(
    diagnostics,
    `Initially observed custom options: ${summarizeChoicesForDiagnostics(Array.from(observedChoices.values()))}`
  );

  const searchInput = popupContainers.map(getSearchInput).find(Boolean) || null;
  if (searchInput) {
    for (const term of normalizedTerms) {
      searchInput.focus();
      setTextControlValue(searchInput, term);
      pushDiagnostic(diagnostics, `Observed-option scan typed search term: ${term}`);
      await delay(120);
      const visibleChoices = collectVisibleCustomChoices(trigger);
      mergeObservedChoices(observedChoices, visibleChoices);
      pushDiagnostic(
        diagnostics,
        `Observed options after scan term "${term}": ${summarizeChoicesForDiagnostics(visibleChoices)}`
      );
    }

    setTextControlValue(searchInput, '');
    await delay(80);
    mergeObservedChoices(observedChoices, collectVisibleCustomChoices(trigger));
    pushDiagnostic(diagnostics, 'Cleared picker search after observed-option scan.');
  }

  const scrollContainers = getScrollablePopupContainers(trigger);
  scrollContainers.forEach(resetScrollPosition);
  if (scrollContainers.length > 0) {
    await delay(60);
  }

  for (let attempt = 0; attempt < 10; attempt += 1) {
    const visibleChoices = collectVisibleCustomChoices(trigger);
    mergeObservedChoices(observedChoices, visibleChoices);

    const didScroll = scrollContainers.map(scrollPopupContainerStep).some(Boolean);
    if (!didScroll) {
      break;
    }

    await delay(80);
  }

  const observed = Array.from(observedChoices.values());
  pushDiagnostic(
    diagnostics,
    `Observed option universe: ${summarizeChoicesForDiagnostics(observed, 16)}`
  );
  return observed;
}

function getScrollablePopupContainers(trigger: HTMLElement): HTMLElement[] {
  return uniqueElements(
    getPopupContainers(trigger).flatMap((container) => [
      container,
      ...Array.from(container.querySelectorAll<HTMLElement>('div, ul, ol, section')),
    ])
  ).filter((container) => isVisibleElement(container) && container.scrollHeight > container.clientHeight + 24);
}

function resetScrollPosition(container: HTMLElement): void {
  container.scrollTop = 0;
  container.dispatchEvent(new Event('scroll', { bubbles: true }));
}

function scrollPopupContainerStep(container: HTMLElement): boolean {
  const maxScrollTop = container.scrollHeight - container.clientHeight;
  if (maxScrollTop <= 0) {
    return false;
  }

  const step = Math.max(Math.round(container.clientHeight * 0.72), 120);
  const nextScrollTop = Math.min(container.scrollTop + step, maxScrollTop);
  if (nextScrollTop <= container.scrollTop + 1) {
    return false;
  }

  container.scrollTop = nextScrollTop;
  container.dispatchEvent(new Event('scroll', { bubbles: true }));
  return true;
}

async function openCustomSelect(element: HTMLElement, diagnostics?: string[]): Promise<boolean> {
  if (isCustomSelectOpen(element)) {
    pushDiagnostic(diagnostics, 'Custom picker was already open.');
    return true;
  }

  const attemptOpen = async (
    label: string,
    action: () => void | Promise<void>,
    waitMs = 120
  ): Promise<boolean> => {
    await action();
    await delay(waitMs);
    const opened = isCustomSelectOpen(element);
    pushDiagnostic(diagnostics, `${label}: ${opened ? 'opened' : 'not opened'}`);
    return opened;
  };

  // Scroll into view first so the element is visible and clickable
  element.scrollIntoView({ behavior: 'auto', block: 'nearest', inline: 'nearest' });
  await delay(60);

  element.focus();

  // Strategy 1: Full pointer/mouse sequence (enhanced with coordinates, focus, hover)
  if (
    await attemptOpen('Open attempt via pointer sequence', async () => {
      dispatchMouseSequence(element);
    })
  ) {
    return true;
  }

  // Strategy 2: Direct element.click()
  if (
    await attemptOpen('Open attempt via element.click()', async () => {
      element.click();
    })
  ) {
    return true;
  }

  // Strategy 3: Mousedown + focus + delayed mouseup/click (for frameworks that listen to mousedown)
  if (
    await attemptOpen('Open attempt via mousedown-focus-delayed-click', async () => {
      const init = buildMouseEventInit(element);
      element.dispatchEvent(new MouseEvent('mousedown', init));
      element.focus();
      await delay(50);
      element.dispatchEvent(new MouseEvent('mouseup', { ...init, buttons: 0 }));
      element.dispatchEvent(new MouseEvent('click', { ...init, buttons: 0 }));
    })
  ) {
    return true;
  }

  // Strategy 4: Enter key
  if (
    await attemptOpen('Open attempt via Enter key', async () => {
      element.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true })
      );
      element.dispatchEvent(
        new KeyboardEvent('keyup', { key: 'Enter', bubbles: true, cancelable: true })
      );
    })
  ) {
    return true;
  }

  // Strategy 5: ArrowDown key
  if (
    await attemptOpen('Open attempt via ArrowDown key', async () => {
      element.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, cancelable: true })
      );
      element.dispatchEvent(
        new KeyboardEvent('keyup', { key: 'ArrowDown', bubbles: true, cancelable: true })
      );
    })
  ) {
    return true;
  }

  // Strategy 6: Space key
  if (
    await attemptOpen('Open attempt via Space key', async () => {
      element.dispatchEvent(
        new KeyboardEvent('keydown', { key: ' ', code: 'Space', bubbles: true, cancelable: true })
      );
      element.dispatchEvent(
        new KeyboardEvent('keyup', { key: ' ', code: 'Space', bubbles: true, cancelable: true })
      );
    })
  ) {
    return true;
  }

  // Strategy 7: Nested button/svg trigger
  const nestedButton = element.querySelector<HTMLElement>('button, [role="button"], svg');
  if (
    nestedButton &&
    isVisibleElement(nestedButton) &&
    await attemptOpen('Open attempt via nested trigger', async () => {
      nestedButton.scrollIntoView({ behavior: 'auto', block: 'nearest' });
      nestedButton.focus();
      dispatchMouseSequence(nestedButton);
      nestedButton.click();
    })
  ) {
    return true;
  }

  // Strategy 8: Find and click any clickable descendant with pointer cursor
  const clickableDescendant = Array.from(
    element.querySelectorAll<HTMLElement>('*')
  ).find((child) => {
    if (!isVisibleElement(child)) return false;
    const cursor = window.getComputedStyle(child).cursor;
    return cursor === 'pointer' && child !== nestedButton;
  });
  if (
    clickableDescendant &&
    await attemptOpen('Open attempt via clickable descendant', async () => {
      clickableDescendant.focus();
      dispatchMouseSequence(clickableDescendant);
      clickableDescendant.click();
    })
  ) {
    return true;
  }

  pushDiagnostic(diagnostics, 'Failed to open the custom picker after all open attempts.');
  return false;
}

async function findAndSelectChoicesWithSearchTerms(
  trigger: HTMLElement,
  terms: string[],
  desiredCount: number,
  diagnostics?: string[]
): Promise<number> {
  const preferredTerms = normalizeCandidateTerms(terms);
  if (preferredTerms.length === 0 || desiredCount <= 0) {
    return 0;
  }

  let selectedCount = 0;
  const selectedChoiceKeys = new Set<string>();

  for (const term of preferredTerms) {
    if (selectedCount >= desiredCount) {
      break;
    }

    let popupContainers = getPopupContainers(trigger);
    if (popupContainers.length === 0) {
      const didOpen = await openCustomSelect(trigger, diagnostics);
      if (!didOpen) {
        break;
      }
      popupContainers = getPopupContainers(trigger);
    }

    const searchInput = popupContainers.map(getSearchInput).find(Boolean) || null;
    if (!searchInput) {
      pushDiagnostic(diagnostics, 'No search input was found inside the open custom picker.');
      break;
    }

    searchInput.focus();
    setTextControlValue(searchInput, term);
    pushDiagnostic(diagnostics, `Typed search term: ${term}`);
    await delay(140);

    const choices = collectVisibleCustomChoices(trigger);
    pushDiagnostic(diagnostics, `Visible custom options after "${term}": ${summarizeChoicesForDiagnostics(choices)}`);

    const bestChoice = getBestChoiceForSearchTerm(
      choices.filter((choice) => !selectedChoiceKeys.has(getChoiceKey(choice))),
      term
    );
    if (!bestChoice?.element) {
      pushDiagnostic(diagnostics, `No matching visible option was found for "${term}".`);
      continue;
    }

    const choiceKey = getChoiceKey(bestChoice);
    if (selectedChoiceKeys.has(choiceKey)) {
      pushDiagnostic(diagnostics, `Skipped already-attempted option: ${bestChoice.label || bestChoice.value}`);
      continue;
    }

    if (bestChoice.selected) {
      pushDiagnostic(diagnostics, `Option already selected: ${bestChoice.label || bestChoice.value}`);
      selectedChoiceKeys.add(choiceKey);
      selectedCount += 1;
      continue;
    }

    pushDiagnostic(diagnostics, `Clicking matched option: ${bestChoice.label || bestChoice.value}`);
    clickCustomChoice(bestChoice.element);
    selectedChoiceKeys.add(choiceKey);
    selectedCount += 1;
    await delay(100);
    pushDiagnostic(
      diagnostics,
      `Selected values after click: ${getSelectedCustomChoiceLabels(trigger).join(', ') || 'none'}`
    );
  }

  const popupContainers = getPopupContainers(trigger);
  const searchInput = popupContainers.map(getSearchInput).find(Boolean) || null;
  if (searchInput) {
    setTextControlValue(searchInput, '');
    await delay(60);
    pushDiagnostic(diagnostics, 'Cleared the picker search input.');
  }

  return selectedCount;
}

async function findAndSelectChoicesByScrollingTerms(
  trigger: HTMLElement,
  terms: string[],
  desiredCount: number,
  diagnostics?: string[]
): Promise<number> {
  const preferredTerms = normalizeCandidateTerms(terms);
  if (preferredTerms.length === 0 || desiredCount <= 0) {
    return 0;
  }

  let selectedCount = 0;
  const selectedChoiceKeys = new Set<string>();

  for (const term of preferredTerms) {
    if (selectedCount >= desiredCount) {
      break;
    }

    let popupContainers = getPopupContainers(trigger);
    if (popupContainers.length === 0) {
      const didOpen = await openCustomSelect(trigger, diagnostics);
      if (!didOpen) {
        break;
      }
      popupContainers = getPopupContainers(trigger);
    }

    const scrollContainers = getScrollablePopupContainers(trigger);
    scrollContainers.forEach(resetScrollPosition);
    if (scrollContainers.length > 0) {
      pushDiagnostic(diagnostics, `Scanning scrollable picker containers for term "${term}".`);
      await delay(80);
    }

    for (let attempt = 0; attempt < 10; attempt += 1) {
      const visibleChoices = collectVisibleCustomChoices(trigger).filter(
        (choice) => !selectedChoiceKeys.has(getChoiceKey(choice))
      );
      if (attempt === 0 || visibleChoices.length > 0) {
        pushDiagnostic(
          diagnostics,
          `Visible custom options while scrolling for "${term}": ${summarizeChoicesForDiagnostics(visibleChoices)}`
        );
      }
      const bestChoice = getBestChoiceForSearchTerm(
        visibleChoices,
        term
      );
      if (bestChoice?.element) {
        const choiceKey = getChoiceKey(bestChoice);
        if (selectedChoiceKeys.has(choiceKey)) {
          break;
        }

        if (!bestChoice.selected) {
          bestChoice.element.scrollIntoView({ block: 'nearest' });
          pushDiagnostic(diagnostics, `Clicking scrolled match: ${bestChoice.label || bestChoice.value}`);
          clickCustomChoice(bestChoice.element);
          await delay(100);
        }

        selectedChoiceKeys.add(choiceKey);
        selectedCount += 1;
        pushDiagnostic(
          diagnostics,
          `Selected values after scrolled click: ${getSelectedCustomChoiceLabels(trigger).join(', ') || 'none'}`
        );
        break;
      }

      const didScroll = scrollContainers.map(scrollPopupContainerStep).some(Boolean);
      if (!didScroll) {
        pushDiagnostic(diagnostics, `Reached the end of the scrollable picker while searching for "${term}".`);
        break;
      }

      await delay(100);
    }
  }

  return selectedCount;
}

async function resolveObservedChoicesWithLLM(
  field: FormField,
  requestedTerms: string[],
  observedChoices: SelectChoice[],
  desiredCount: number,
  diagnostics?: string[]
): Promise<SelectChoice[]> {
  if (observedChoices.length === 0) {
    pushDiagnostic(diagnostics, 'No observed options were available for constrained LLM matching.');
    return [];
  }

  const observedOptionLabels = unique(
    observedChoices
      .map((choice) => (choice.label || choice.value).trim())
      .filter(Boolean)
  );
  const topScoredChoices = getTopScoredChoicesForTerms(observedChoices, requestedTerms, 5);
  pushDiagnostic(
    diagnostics,
    `Top deterministic option scores: ${topScoredChoices
      .map((item) => `${item.choice.label || item.choice.value}(${item.score})`)
      .join(', ') || 'none'}`
  );

  try {
    const llmMatch = await requestLLMObservedOptionMatch({
      pageTitle: document.title,
      pageUrl: window.location.href,
      fieldLabel: getFieldDisplayName(field),
      requestedValues: requestedTerms,
      observedOptions: observedOptionLabels,
      allowMultiple: desiredCount > 1,
    });

    pushDiagnostic(diagnostics, `Constrained option match summary: ${llmMatch.summary}`);
    if (llmMatch.reasoning) {
      pushDiagnostic(diagnostics, `Constrained option match reasoning: ${llmMatch.reasoning}`);
    }
    pushDiagnostic(
      diagnostics,
      `Constrained option match selected options: ${llmMatch.selectedOptions.join(', ') || 'none'}`
    );

    if (llmMatch.selectedOptions.length === 0) {
      return [];
    }

    const selectedLabelSet = new Set(llmMatch.selectedOptions.map((value) => normalizeText(value)));
    const selectedChoices = observedChoices.filter((choice) => {
      const optionText = normalizeText(choice.label || choice.value);
      return selectedLabelSet.has(optionText);
    });

    return desiredCount > 1 ? selectedChoices.slice(0, desiredCount) : selectedChoices.slice(0, 1);
  } catch (error) {
    pushDiagnostic(
      diagnostics,
      `Constrained option match failed: ${error instanceof Error ? error.message : String(error)}`
    );
    return [];
  }
}

async function fillCustomSelectWithTerms(
  field: FormField,
  terms: string[],
  desiredCount = 1,
  diagnostics?: string[]
): Promise<boolean> {
  const trigger =
    field.element instanceof HTMLElement ? resolveCustomSelectTrigger(field.element) : null;
  const normalizedTerms = normalizeCandidateTerms(terms);
  if (!trigger || normalizedTerms.length === 0 || desiredCount <= 0) {
    pushDiagnostic(diagnostics, 'Custom select trigger or candidate terms were unavailable.');
    return false;
  }

  const beforeValue = getCurrentCustomSelectText(trigger);
  pushDiagnostic(diagnostics, `Requested custom select terms: ${normalizedTerms.join(', ')}`);
  pushDiagnostic(diagnostics, `Current trigger text before selection: ${beforeValue || 'empty'}`);

  const selectedWithSearch = await findAndSelectChoicesWithSearchTerms(
    trigger,
    normalizedTerms,
    desiredCount,
    diagnostics
  );
  if (selectedWithSearch > 0) {
    const afterValue = getCurrentCustomSelectText(trigger);
    const selectedChoices = collectVisibleCustomChoices(trigger).filter((choice) => choice.selected);
    pushDiagnostic(
      diagnostics,
      `Visible selected custom options after search: ${summarizeChoicesForDiagnostics(selectedChoices)}`
    );
    if (selectedChoices.length > 0 || (afterValue && afterValue !== beforeValue)) {
      await closeCustomSelect(trigger);
      pushDiagnostic(diagnostics, 'Closed the custom picker after a successful search selection.');
      return true;
    }
  }

  const selectedWithScroll = await findAndSelectChoicesByScrollingTerms(
    trigger,
    normalizedTerms,
    desiredCount,
    diagnostics
  );
  if (selectedWithScroll > 0) {
    const afterValue = getCurrentCustomSelectText(trigger);
    const selectedChoices = collectVisibleCustomChoices(trigger).filter((choice) => choice.selected);
    pushDiagnostic(
      diagnostics,
      `Visible selected custom options after scroll search: ${summarizeChoicesForDiagnostics(selectedChoices)}`
    );
    if (selectedChoices.length > 0 || (afterValue && afterValue !== beforeValue)) {
      await closeCustomSelect(trigger);
      pushDiagnostic(diagnostics, 'Closed the custom picker after a successful scroll selection.');
      return true;
    }
  }

  let optionElements = getVisibleCustomOptionElements(trigger);
  if (optionElements.length === 0) {
    const didOpen = await openCustomSelect(trigger, diagnostics);
    if (!didOpen) {
      return false;
    }
    optionElements = getVisibleCustomOptionElements(trigger);
  }

  if (optionElements.length === 0) {
    trigger.click();
    await delay(120);
    optionElements = getVisibleCustomOptionElements(trigger);
  }

  const choices = collectVisibleCustomChoices(trigger);
  pushDiagnostic(diagnostics, `Visible custom options before direct matching: ${summarizeChoicesForDiagnostics(choices)}`);

  if (choices.length === 0) {
    pushDiagnostic(diagnostics, 'No visible custom options were available to match directly.');
  } else if (desiredCount > 1) {
    const bestChoices = getBestSelectChoicesForTerms(choices, normalizedTerms, desiredCount);
    if (bestChoices.length > 0) {
      let selectedCount = 0;

      for (const bestChoice of bestChoices) {
        if (!bestChoice.element) {
          continue;
        }

        if (bestChoice.selected) {
          pushDiagnostic(diagnostics, `Custom option already selected: ${bestChoice.label || bestChoice.value}`);
          selectedCount += 1;
          continue;
        }

        bestChoice.element.scrollIntoView({ block: 'nearest' });
        pushDiagnostic(diagnostics, `Clicking direct custom match: ${bestChoice.label || bestChoice.value}`);
        clickCustomChoice(bestChoice.element);
        await delay(60);
        selectedCount += 1;
      }

      if (selectedCount > 0) {
        const selectedChoices = collectVisibleCustomChoices(trigger).filter((choice) => choice.selected);
        await closeCustomSelect(trigger);
        pushDiagnostic(
          diagnostics,
          `Visible selected custom options after direct multi-select: ${summarizeChoicesForDiagnostics(selectedChoices)}`
        );
        return selectedChoices.length > 0 || getCurrentCustomSelectText(trigger) !== beforeValue;
      }
    } else {
      pushDiagnostic(diagnostics, 'Direct multi-select matching found no valid custom choices.');
    }
  } else {
    const bestChoice = getBestSelectChoiceForTerms(choices, normalizedTerms);
    if (bestChoice?.element && canOverwriteCustomSelectValueWithTerms(trigger, bestChoice, normalizedTerms)) {
      bestChoice.element.scrollIntoView({ block: 'nearest' });
      pushDiagnostic(diagnostics, `Clicking direct custom match: ${bestChoice.label || bestChoice.value}`);
      clickCustomChoice(bestChoice.element);
      await delay(50);
      const afterValue = getCurrentCustomSelectText(trigger);
      await closeCustomSelect(trigger);
      pushDiagnostic(diagnostics, `Trigger text after direct custom selection: ${afterValue || 'empty'}`);
      return (
        bestChoice.selected ||
        afterValue === normalizeText(bestChoice.label || bestChoice.value) ||
        (!!afterValue && afterValue !== beforeValue)
      );
    }

    pushDiagnostic(
      diagnostics,
      `No safe direct custom match was found. Best candidate: ${bestChoice ? bestChoice.label || bestChoice.value : 'none'}`
    );
  }

  const observedChoices = await gatherObservedCustomChoices(trigger, normalizedTerms, diagnostics);
  const constrainedChoices = await resolveObservedChoicesWithLLM(
    field,
    normalizedTerms,
    observedChoices,
    desiredCount,
    diagnostics
  );

  if (constrainedChoices.length === 0) {
    pushDiagnostic(diagnostics, 'Constrained option matching did not yield a usable observed option.');
    await closeCustomSelect(trigger);
    return false;
  }

  const constrainedTerms = constrainedChoices.map((choice) => choice.label || choice.value);
  pushDiagnostic(diagnostics, `Retrying selection with constrained observed options: ${constrainedTerms.join(', ')}`);

  const selectedWithConstrainedSearch = await findAndSelectChoicesWithSearchTerms(
    trigger,
    constrainedTerms,
    desiredCount,
    diagnostics
  );
  if (selectedWithConstrainedSearch > 0) {
    const selectedChoices = collectVisibleCustomChoices(trigger).filter((choice) => choice.selected);
    await closeCustomSelect(trigger);
    pushDiagnostic(
      diagnostics,
      `Visible selected custom options after constrained search: ${summarizeChoicesForDiagnostics(selectedChoices)}`
    );
    return selectedChoices.length > 0 || getCurrentCustomSelectText(trigger) !== beforeValue;
  }

  const selectedWithConstrainedScroll = await findAndSelectChoicesByScrollingTerms(
    trigger,
    constrainedTerms,
    desiredCount,
    diagnostics
  );
  if (selectedWithConstrainedScroll > 0) {
    const selectedChoices = collectVisibleCustomChoices(trigger).filter((choice) => choice.selected);
    await closeCustomSelect(trigger);
    pushDiagnostic(
      diagnostics,
      `Visible selected custom options after constrained scroll search: ${summarizeChoicesForDiagnostics(selectedChoices)}`
    );
    return selectedChoices.length > 0 || getCurrentCustomSelectText(trigger) !== beforeValue;
  }

  await closeCustomSelect(trigger);
  pushDiagnostic(diagnostics, 'Failed to click the constrained observed option on the page.');
  return false;
}

async function fillCustomSelect(field: FormField, profile: SelectedWebsiteProfile): Promise<boolean> {
  const searchTerms = unique([
    ...getPreferredSearchTerms(field, profile),
    ...getSelectCandidateTerms(field, profile),
  ]);
  const desiredCount = isMultiValueField(field) ? getDesiredChoiceCount(field, profile) : 1;
  return fillCustomSelectWithTerms(field, searchTerms, desiredCount);
}

function toggleCheckboxViaReact(checkbox: HTMLInputElement): void {
  const nextChecked = !checkbox.checked;

  // Use the native setter to bypass React's controlled-component override,
  // mirroring the setTextControlValue pattern that already works for text inputs.
  nativeCheckedSetter?.call(checkbox, nextChecked);
  if (checkbox.checked !== nextChecked) {
    checkbox.checked = nextChecked;
  }

  checkbox.dispatchEvent(new Event('input', { bubbles: true }));
  checkbox.dispatchEvent(new Event('change', { bubbles: true }));

  // Also dispatch a click event so React's onClick handler fires.
  checkbox.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
}

function clickCustomChoice(element: HTMLElement): void {
  const nestedInput = element.querySelector<HTMLInputElement>('input[type="checkbox"], input[type="radio"]');
  const label = element.closest('label') || element.querySelector('label');

  // Ensure the option is visible before clicking
  element.scrollIntoView({ behavior: 'auto', block: 'nearest' });

  // Strategy 1: If there's a nested checkbox/radio, toggle it directly via React-compatible path
  if (nestedInput) {
    nestedInput.focus();
    dispatchMouseSequence(nestedInput);

    const checkedBefore = nestedInput.checked;
    nestedInput.click();

    // If .click() didn't toggle the state (common in React controlled components),
    // force-toggle via native setter + synthetic events
    if (nestedInput.checked === checkedBefore) {
      toggleCheckboxViaReact(nestedInput);
    }
    return;
  }

  // Strategy 2: Click the label element (which should toggle associated input)
  if (label instanceof HTMLElement) {
    dispatchMouseSequence(label);
    label.click();
    return;
  }

  // Strategy 3: Click the element itself and handle aria-based state
  dispatchMouseSequence(element);
  element.click();

  // For elements that use aria-selected/aria-checked instead of real checkboxes,
  // force-set the attribute if the click didn't change it
  if (
    element.getAttribute('aria-selected') === 'false' ||
    element.getAttribute('aria-checked') === 'false'
  ) {
    if (element.hasAttribute('aria-selected')) {
      element.setAttribute('aria-selected', 'true');
    }
    if (element.hasAttribute('aria-checked')) {
      element.setAttribute('aria-checked', 'true');
    }
    element.dispatchEvent(new Event('change', { bubbles: true }));
  }
}

function isFieldEmpty(field: FormField): boolean {
  const element = field.element;

  if (element instanceof HTMLSelectElement) {
    const selectedOption = element.options[element.selectedIndex];
    const selectedText = normalizeText(selectedOption?.textContent || selectedOption?.label || '');
    const selectedValue = normalizeText(element.value);
    return !selectedValue || containsAny(selectedText, [...SELECT_PLACEHOLDER_TERMS]);
  }

  if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
    return element.value.trim().length === 0;
  }

  return true;
}

function getVisibleFieldValue(field: FormField): string {
  const element = field.element;

  if (element instanceof HTMLSelectElement) {
    return Array.from(element.selectedOptions)
      .map((option) => option.textContent || option.label || option.value)
      .map((value) => normalizeText(value))
      .filter(Boolean)
      .join(', ');
  }

  if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
    return normalizeText(element.value);
  }

  return getCurrentCustomSelectText(element);
}

function dispatchFieldEvents(element: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement): void {
  element.dispatchEvent(new Event('input', { bubbles: true }));
  element.dispatchEvent(new Event('change', { bubbles: true }));
}

function setTextValue(
  element: HTMLInputElement | HTMLTextAreaElement,
  value: string
): void {
  element.focus();

  if (element instanceof HTMLTextAreaElement) {
    nativeTextAreaValueSetter?.call(element, value);
  } else {
    nativeInputValueSetter?.call(element, value);
  }

  if (element.value !== value) {
    element.value = value;
  }

  element.dispatchEvent(
    new InputEvent('input', {
      bubbles: true,
      inputType: 'insertText',
      data: value,
    })
  );
  element.dispatchEvent(new Event('change', { bubbles: true }));
  element.blur();
}

function setSelectValue(element: HTMLSelectElement, value: string): void {
  nativeSelectValueSetter?.call(element, value);

  if (element.value !== value) {
    element.value = value;
  }

  dispatchFieldEvents(element);
}

function getScopeFields(detector: FormFieldDetector, targetField: FormField): FormField[] {
  const targetForm = targetField.element.closest('form');
  const fields = detector.detect();

  if (!targetForm) {
    return fields.filter((field) => field.element.closest('form') === null);
  }

  return fields.filter((field) => field.element.closest('form') === targetForm);
}

function getFieldDisplayName(field: FormField): string {
  return field.label || field.name || field.placeholder || field.type;
}

function formatAutofillErrorReason(message: string | null | undefined): string {
  if (!message) {
    return 'AI mapping was unavailable';
  }

  const normalized = message.replace(/\s+/g, ' ').trim();
  if (!normalized) {
    return 'AI mapping was unavailable';
  }

  return normalized.length > 140
    ? `AI mapping was unavailable (${normalized.slice(0, 137)}...)`
    : `AI mapping was unavailable (${normalized})`;
}

function resolveTargetField(
  detector: FormFieldDetector,
  targetElement: Element | null
): FormField | null {
  const focusedField = detector.detectFieldForElement(targetElement);
  if (focusedField) {
    return focusedField;
  }

  const detectedFields = detector.detect();
  const firstEmptyField = detectedFields.find((field) => isFieldEmpty(field));
  return firstEmptyField || detectedFields[0] || null;
}

function getFieldCurrentValue(field: FormField): string | undefined {
  if (field.element instanceof HTMLSelectElement) {
    const selectedValues = Array.from(field.element.selectedOptions)
      .map((option) => option.textContent || option.label || option.value)
      .map((value) => value.trim())
      .filter(Boolean);
    return selectedValues.length > 0 ? selectedValues.join(', ') : undefined;
  }

  if (field.element instanceof HTMLInputElement || field.element instanceof HTMLTextAreaElement) {
    const value = field.element.value.trim();
    return value || undefined;
  }

  const value = getCurrentCustomSelectText(field.element);
  return value || undefined;
}

function getFieldOptionSummaries(field: FormField): AutofillOptionSummary[] | undefined {
  if (field.element instanceof HTMLSelectElement) {
    const options = Array.from(field.element.options)
      .filter((option) => !option.disabled && !isPlaceholderOption(option))
      .slice(0, 30)
      .map<AutofillOptionSummary>((option) => ({
        value: option.value,
        label: option.textContent || option.label || option.value,
      }));

    return options.length > 0 ? options : undefined;
  }

  if (field.type === 'select' && field.element instanceof HTMLElement) {
    const options = collectVisibleCustomChoices(field.element)
      .slice(0, 30)
      .map<AutofillOptionSummary>((choice) => ({
        value: choice.value,
        label: choice.label,
      }));

    return options.length > 0 ? options : undefined;
  }

  return undefined;
}

export async function selectFormFieldOptions(
  payload?: FormSelectOptionsPayload
): Promise<FormSelectOptionsResult> {
  const fieldHint = payload?.fieldHint?.trim() || '';
  const candidateValues = unique((payload?.values || []).map((value) => value.trim()).filter(Boolean));
  const diagnostics: string[] = [];

  if (!fieldHint || candidateValues.length === 0) {
    return {
      status: 'no_match',
      fieldHint,
      matchedField: undefined,
      selectedValues: [],
      message: 'Provide both a field hint and at least one option value.',
      diagnostics,
    };
  }

  const detector = new FormFieldDetector();
  const selectFields = detector.detect().filter((field) => field.type === 'select');
  const matchedField = findBestFieldByHint(selectFields, fieldHint);

  if (!matchedField) {
    return {
      status: 'field_not_found',
      fieldHint,
      matchedField: undefined,
      selectedValues: [],
      message: `No visible select-like field matched "${fieldHint}" on this page.`,
      diagnostics,
    };
  }

  const profile = await getSelectedWebsiteProfile();
  const resolvedCandidateValues = profile
    ? unique([
        ...candidateValues,
        ...getPreferredSearchTerms(matchedField, profile),
        ...getSelectCandidateTerms(matchedField, profile),
      ])
    : candidateValues;

  const desiredCount = payload?.allowMultiple ? Math.max(candidateValues.length, 1) : 1;
  pushDiagnostic(diagnostics, `Matched select-like field: ${getFieldDisplayName(matchedField)}`);
  pushDiagnostic(diagnostics, `Requested option values: ${candidateValues.join(', ')}`);
  pushDiagnostic(diagnostics, `Resolved option values: ${resolvedCandidateValues.join(', ')}`);
  const success =
    matchedField.element instanceof HTMLSelectElement
      ? fillNativeSelectFieldWithTerms(matchedField, resolvedCandidateValues, desiredCount, diagnostics)
      : await fillCustomSelectWithTerms(matchedField, resolvedCandidateValues, desiredCount, diagnostics);
  const selectedValues =
    matchedField.element instanceof HTMLElement && matchedField.type === 'select'
      ? getSelectedCustomChoiceLabels(resolveCustomSelectTrigger(matchedField.element))
      : (getFieldCurrentValue(matchedField)
          ?.split(',')
          .map((value) => value.trim())
          .filter(Boolean)
          .filter((value) => !containsAny(normalizeText(value), [...SELECT_PLACEHOLDER_TERMS])) ?? []);
  const matchedFieldName = getFieldDisplayName(matchedField);

  if (!success) {
    return {
      status: 'no_match',
      fieldHint,
      matchedField: matchedFieldName,
      selectedValues,
      message: `Found "${matchedFieldName}", but none of the requested options could be applied: ${resolvedCandidateValues.join(', ')}.`,
      diagnostics,
    };
  }

  return {
    status: 'selected',
    fieldHint,
    matchedField: matchedFieldName,
    selectedValues,
    message: `Selected ${selectedValues.length > 0 ? selectedValues.join(', ') : candidateValues.join(', ')} in "${matchedFieldName}".`,
    diagnostics,
  };
}

export async function setFormFieldValue(
  payload?: FormSetFieldValuePayload
): Promise<FormSetFieldValueResult> {
  const fieldHint = payload?.fieldHint?.trim() || '';
  const desiredValue = payload?.value?.trim() || '';
  const diagnostics: string[] = [];

  if (!fieldHint || !desiredValue) {
    return {
      status: 'no_match',
      fieldHint,
      matchedField: undefined,
      currentValue: undefined,
      message: 'Provide both a field hint and a non-empty value.',
      diagnostics,
    };
  }

  const detector = new FormFieldDetector();
  const textFields = detector.detect().filter(
    (field) =>
      field.element instanceof HTMLInputElement || field.element instanceof HTMLTextAreaElement
  );
  const matchedField = findBestFieldByHint(textFields, fieldHint);

  if (!matchedField) {
    return {
      status: 'field_not_found',
      fieldHint,
      matchedField: undefined,
      currentValue: undefined,
      message: `No visible text-like field matched "${fieldHint}" on this page.`,
      diagnostics,
    };
  }

  if (
    !(matchedField.element instanceof HTMLInputElement) &&
    !(matchedField.element instanceof HTMLTextAreaElement)
  ) {
    return {
      status: 'no_match',
      fieldHint,
      matchedField: getFieldDisplayName(matchedField),
      currentValue: getFieldCurrentValue(matchedField),
      message: `Matched "${getFieldDisplayName(matchedField)}", but it is not a text input.`,
      diagnostics,
    };
  }

  const matchedFieldName = getFieldDisplayName(matchedField);
  const currentValue = getFieldCurrentValue(matchedField);
  pushDiagnostic(diagnostics, `Matched text field: ${matchedFieldName}`);
  pushDiagnostic(diagnostics, `Requested value: ${desiredValue}`);
  pushDiagnostic(diagnostics, `Current value before update: ${currentValue || 'empty'}`);
  const normalizedCurrentValue = normalizeText(currentValue);
  const normalizedDesiredValue = normalizeText(desiredValue);

  if (normalizedCurrentValue === normalizedDesiredValue) {
    return {
      status: 'unchanged',
      fieldHint,
      matchedField: matchedFieldName,
      currentValue,
      message: `"${matchedFieldName}" already contains the requested value.`,
      diagnostics,
    };
  }

  if (normalizedCurrentValue) {
    return {
      status: 'unchanged',
      fieldHint,
      matchedField: matchedFieldName,
      currentValue,
      message: `"${matchedFieldName}" already contains a value and was left unchanged.`,
      diagnostics,
    };
  }

  setTextValue(matchedField.element, desiredValue);
  const nextValue = getFieldCurrentValue(matchedField);
  pushDiagnostic(diagnostics, `Current value after update: ${nextValue || 'empty'}`);

  if (normalizeText(nextValue) !== normalizeText(desiredValue)) {
    return {
      status: 'no_match',
      fieldHint,
      matchedField: matchedFieldName,
      currentValue: nextValue,
      message: `Found "${matchedFieldName}", but the page did not accept the requested value.`,
      diagnostics,
    };
  }

  return {
    status: 'updated',
    fieldHint,
    matchedField: matchedFieldName,
    currentValue: nextValue,
    message: `Updated "${matchedFieldName}" with the requested value.`,
    diagnostics,
  };
}

function buildFieldSummary(field: FormField, index: number): AutofillFieldSummary {
  return {
    index,
    type: field.type,
    name: field.name,
    label: field.label,
    placeholder: field.placeholder,
    autocompleteType: field.autocompleteType,
    tagName: field.element.tagName.toLowerCase(),
    role: field.element.getAttribute('role') || undefined,
    isEmpty: isFieldEmpty(field),
    isRequired:
      field.element.hasAttribute('required') || field.element.getAttribute('aria-required') === 'true',
    currentValue: getFieldCurrentValue(field),
    allowsMultiple:
      (field.element instanceof HTMLSelectElement && field.element.multiple) || isMultiValueField(field),
    options: getFieldOptionSummaries(field),
  };
}

function buildProfileSummary(profile: SelectedWebsiteProfile) {
  return {
    id: profile.id,
    name: profile.name,
    url: profile.url,
    category: profile.category,
    categories: getProfileCategories(profile),
    description: buildDescription(profile),
    tags: getProfileTags(profile),
  };
}

function buildLLMFieldMappingRequest(
  profile: SelectedWebsiteProfile,
  scopedFields: FormField[]
): LLMFieldMappingRequest {
  return {
    pageTitle: document.title,
    pageUrl: window.location.href,
    profile: buildProfileSummary(profile),
    fields: scopedFields.map((field, index) => buildFieldSummary(field, index)),
  };
}

async function buildLLMPageAutofillPlanRequest(
  profile: SelectedWebsiteProfile
): Promise<LLMPageAutofillPlanRequest> {
  const snapshot = await getPageSnapshot();

  if (!snapshot.flatString.trim()) {
    throw new Error('The page snapshot is empty. Refresh the page and try again.');
  }

  return {
    pageTitle: document.title,
    pageUrl: window.location.href,
    profile: buildProfileSummary(profile),
    snapshot: snapshot.flatString,
  };
}

function getMappingStepTerms(step: LLMFieldMappingStep): string[] {
  return unique(
    [step.value, ...(step.values || [])]
      .filter((value): value is string => typeof value === 'string')
      .map((value) => value.trim())
      .filter(Boolean)
  );
}

async function applyLLMMappingStep(field: FormField, step: LLMFieldMappingStep): Promise<boolean> {
  const terms = getMappingStepTerms(step);
  if (terms.length === 0) {
    return false;
  }

  const beforeValue = getVisibleFieldValue(field);

  if (field.element instanceof HTMLSelectElement) {
    const desiredCount = field.element.multiple ? Math.max(step.values?.length || 0, 1) : 1;
    return fillNativeSelectFieldWithTerms(field, terms, desiredCount);
  }

  if (field.type === 'select' && field.element instanceof HTMLElement) {
    const desiredCount = isMultiValueField(field) ? Math.max(step.values?.length || 0, 1) : 1;
    return fillCustomSelectWithTerms(field, terms, desiredCount);
  }

  if (!(field.element instanceof HTMLInputElement || field.element instanceof HTMLTextAreaElement)) {
    return false;
  }

  if (!isFieldEmpty(field)) {
    return false;
  }

  const nextValue = step.value?.trim() || terms.join(', ');
  if (!nextValue || field.element.value.trim() === nextValue) {
    return false;
  }

  setTextValue(field.element, nextValue);
  return getVisibleFieldValue(field) !== beforeValue && getVisibleFieldValue(field) === normalizeText(nextValue);
}

async function applyLLMMappingPlan(
  scopedFields: FormField[],
  plan: LLMFieldMappingResult
): Promise<AutofillExecution> {
  const filledFields: string[] = [];
  const seenIndexes = new Set<number>();

  for (const step of plan.steps) {
    if (seenIndexes.has(step.fieldIndex)) {
      continue;
    }

    const field = scopedFields[step.fieldIndex];
    if (!field) {
      continue;
    }

    const didFill = await applyLLMMappingStep(field, step);
    if (!didFill) {
      continue;
    }

    seenIndexes.add(step.fieldIndex);
    filledFields.push(getFieldDisplayName(field));
  }

  return {
    filledFields: unique(filledFields),
    planSummary: plan.summary,
  };
}

function getOrderedMappingSteps(plan: LLMFieldMappingResult): LLMFieldMappingStep[] {
  const seenIndexes = new Set<number>();

  return [...plan.steps]
    .sort((left, right) => left.fieldIndex - right.fieldIndex)
    .filter((step) => {
      if (seenIndexes.has(step.fieldIndex)) {
        return false;
      }

      seenIndexes.add(step.fieldIndex);
      return true;
    });
}

async function applyOrderedTextMappingStep(
  field: FormField,
  step: LLMFieldMappingStep,
  order: number
): Promise<OrderedAutofillStepResult> {
  const fieldName = getFieldDisplayName(field);
  const requestedValues = getMappingStepTerms(step);
  const diagnostics: string[] = [];
  const desiredValue = step.value?.trim() || requestedValues.join(', ');
  const currentValue = getFieldCurrentValue(field);

  pushDiagnostic(diagnostics, `Requested text value: ${desiredValue || 'empty'}`);
  pushDiagnostic(diagnostics, `Current field value before update: ${currentValue || 'empty'}`);

  if (!(field.element instanceof HTMLInputElement || field.element instanceof HTMLTextAreaElement)) {
    return {
      order,
      fieldIndex: step.fieldIndex,
      fieldName,
      fieldType: field.type,
      requestedValues,
      reasoning: step.reasoning,
      status: 'blocked',
      finalValue: currentValue,
      message: `The planned field "${fieldName}" is not a text input.`,
      diagnostics,
    };
  }

  const normalizedCurrentValue = normalizeText(currentValue);
  const normalizedDesiredValue = normalizeText(desiredValue);

  if (!desiredValue) {
    return {
      order,
      fieldIndex: step.fieldIndex,
      fieldName,
      fieldType: field.type,
      requestedValues,
      reasoning: step.reasoning,
      status: 'blocked',
      finalValue: currentValue,
      message: `No text value was provided for "${fieldName}".`,
      diagnostics,
    };
  }

  if (normalizedCurrentValue === normalizedDesiredValue) {
    return {
      order,
      fieldIndex: step.fieldIndex,
      fieldName,
      fieldType: field.type,
      requestedValues,
      reasoning: step.reasoning,
      status: 'unchanged',
      finalValue: currentValue,
      message: `"${fieldName}" already contains the requested value.`,
      diagnostics,
    };
  }

  if (normalizedCurrentValue) {
    return {
      order,
      fieldIndex: step.fieldIndex,
      fieldName,
      fieldType: field.type,
      requestedValues,
      reasoning: step.reasoning,
      status: 'unchanged',
      finalValue: currentValue,
      message: `"${fieldName}" already contains a non-empty value and was left unchanged.`,
      diagnostics,
    };
  }

  setTextValue(field.element, desiredValue);
  const finalValue = getFieldCurrentValue(field);
  pushDiagnostic(diagnostics, `Current field value after update: ${finalValue || 'empty'}`);

  if (normalizeText(finalValue) !== normalizedDesiredValue) {
    return {
      order,
      fieldIndex: step.fieldIndex,
      fieldName,
      fieldType: field.type,
      requestedValues,
      reasoning: step.reasoning,
      status: 'blocked',
      finalValue,
      message: `The page did not accept the requested text for "${fieldName}".`,
      diagnostics,
    };
  }

  return {
    order,
    fieldIndex: step.fieldIndex,
    fieldName,
    fieldType: field.type,
    requestedValues,
    reasoning: step.reasoning,
    status: 'updated',
    finalValue,
    message: `Updated "${fieldName}" successfully.`,
    diagnostics,
  };
}

async function applyOrderedSelectMappingStep(
  field: FormField,
  step: LLMFieldMappingStep,
  order: number
): Promise<OrderedAutofillStepResult> {
  const fieldName = getFieldDisplayName(field);
  const requestedValues = getMappingStepTerms(step);
  const diagnostics: string[] = [];
  const desiredCount =
    field.element instanceof HTMLSelectElement && field.element.multiple
      ? Math.max(step.values?.length || requestedValues.length, 1)
      : isMultiValueField(field)
        ? Math.max(step.values?.length || requestedValues.length, 1)
        : 1;

  pushDiagnostic(diagnostics, `Requested option values: ${requestedValues.join(', ') || 'none'}`);
  pushDiagnostic(diagnostics, `Current field value before selection: ${getFieldCurrentValue(field) || 'empty'}`);

  if (requestedValues.length === 0) {
    return {
      order,
      fieldIndex: step.fieldIndex,
      fieldName,
      fieldType: field.type,
      requestedValues,
      reasoning: step.reasoning,
      status: 'blocked',
      finalValue: getFieldCurrentValue(field),
      message: `No option values were provided for "${fieldName}".`,
      diagnostics,
    };
  }

  const success =
    field.element instanceof HTMLSelectElement
      ? fillNativeSelectFieldWithTerms(field, requestedValues, desiredCount, diagnostics)
      : await fillCustomSelectWithTerms(field, requestedValues, desiredCount, diagnostics);
  const finalValue = getFieldCurrentValue(field);
  const selectedValues =
    field.type === 'select' && field.element instanceof HTMLElement
      ? getSelectedCustomChoiceLabels(resolveCustomSelectTrigger(field.element))
      : finalValue
          ?.split(',')
          .map((value) => value.trim())
          .filter(Boolean) || [];

  pushDiagnostic(diagnostics, `Values considered selected after execution: ${selectedValues.join(', ') || 'none'}`);

  if (!success) {
    return {
      order,
      fieldIndex: step.fieldIndex,
      fieldName,
      fieldType: field.type,
      requestedValues,
      reasoning: step.reasoning,
      status: 'blocked',
      finalValue,
      message: `No requested option could be confirmed for "${fieldName}".`,
      diagnostics,
    };
  }

  return {
    order,
    fieldIndex: step.fieldIndex,
    fieldName,
    fieldType: field.type,
    requestedValues,
    reasoning: step.reasoning,
    status: 'selected',
    finalValue,
    message: `Selected ${selectedValues.join(', ') || requestedValues.join(', ')} in "${fieldName}".`,
    diagnostics,
  };
}

async function applyOrderedMappingStep(
  field: FormField,
  step: LLMFieldMappingStep,
  order: number
): Promise<OrderedAutofillStepResult> {
  if (field.element instanceof HTMLSelectElement || field.type === 'select') {
    return applyOrderedSelectMappingStep(field, step, order);
  }

  return applyOrderedTextMappingStep(field, step, order);
}

async function runOrderedLLMAutofill(
  profile: SelectedWebsiteProfile,
  scopedFields: FormField[]
): Promise<OrderedAutofillExecution> {
  const request = buildLLMFieldMappingRequest(profile, scopedFields);
  const plan = await requestLLMFieldMapping(request);
  const orderedPlanSteps = getOrderedMappingSteps(plan);
  const steps: OrderedAutofillStepResult[] = [];
  const filledFields: string[] = [];

  for (const planStep of orderedPlanSteps) {
    const field = scopedFields[planStep.fieldIndex];
    const nextOrder = steps.length + 1;

    if (!field) {
      const blockedStep: OrderedAutofillStepResult = {
        order: nextOrder,
        fieldIndex: planStep.fieldIndex,
        fieldName: `Field ${planStep.fieldIndex}`,
        fieldType: 'unknown',
        requestedValues: getMappingStepTerms(planStep),
        reasoning: planStep.reasoning,
        status: 'blocked',
        message: `The AI plan referenced field index ${planStep.fieldIndex}, but that field is no longer available on the page.`,
        diagnostics: ['The page field order changed between planning and execution.'],
      };

      steps.push(blockedStep);
      return {
        filledFields: unique(filledFields),
        planSummary: plan.summary,
        steps,
        blockedStep,
      };
    }

    const stepResult = await applyOrderedMappingStep(field, planStep, nextOrder);
    steps.push(stepResult);

    if (stepResult.status === 'updated' || stepResult.status === 'selected') {
      filledFields.push(stepResult.fieldName);
      continue;
    }

    if (stepResult.status === 'unchanged') {
      continue;
    }

    return {
      filledFields: unique(filledFields),
      planSummary: plan.summary,
      steps,
      blockedStep: stepResult,
    };
  }

  return {
    filledFields: unique(filledFields),
    planSummary: plan.summary,
    steps,
  };
}

function normalizePageElementInfoValue(info: {
  value?: string;
  selectedText?: string;
  text?: string;
  checked?: boolean;
}): string {
  if (typeof info.checked === 'boolean') {
    return info.checked ? 'checked' : 'unchecked';
  }

  return normalizeText(info.selectedText || info.value || info.text || '');
}

function getPlanStepDisplayName(step: LLMPageAutofillStep, fallback?: string): string {
  return step.label?.trim() || fallback || `Element ${step.index}`;
}

async function executePageAutofillStep(step: LLMPageAutofillStep): Promise<boolean> {
  const beforeInfo = await getPageElementInfo(step.index).catch(() => ({}));
  const beforeValue = normalizePageElementInfoValue(beforeInfo);

  if (step.action === 'input' && step.text) {
    const normalizedTargetValue = normalizeText(step.text);
    if (beforeValue) {
      return false;
    }

    await inputPageElement(step.index, step.text, false);
    const afterInfo = await getPageElementInfo(step.index).catch(
      () => ({}) as Awaited<ReturnType<typeof getPageElementInfo>>
    );
    const afterValue = normalizePageElementInfoValue(afterInfo);
    return afterValue === normalizedTargetValue && afterValue !== beforeValue;
  }

  if (step.action === 'select' && step.option) {
    await selectPageElement(step.index, step.option);
    const afterInfo = await getPageElementInfo(step.index).catch(
      () => ({}) as Awaited<ReturnType<typeof getPageElementInfo>>
    );
    const afterValue = normalizePageElementInfoValue(afterInfo);
    return (
      afterValue === normalizeText(step.option) ||
      afterValue === normalizeText(afterInfo.value || '') ||
      afterValue !== beforeValue
    );
  }

  if (step.action === 'click') {
    await clickPageElement(step.index);
    const afterInfo = await getPageElementInfo(step.index).catch(
      () => ({}) as Awaited<ReturnType<typeof getPageElementInfo>>
    );
    const afterValue = normalizePageElementInfoValue(afterInfo);
    return afterValue !== beforeValue;
  }

  return false;
}

async function applyLLMPageAutofillPlan(plan: LLMPageAutofillPlanResult): Promise<AutofillExecution> {
  const filledFields: string[] = [];

  for (const step of plan.steps) {
    try {
      const didExecute = await executePageAutofillStep(step);
      if (!didExecute) {
        continue;
      }

      const afterInfo = await getPageElementInfo(step.index).catch(
        () => ({}) as Awaited<ReturnType<typeof getPageElementInfo>>
      );
      filledFields.push(getPlanStepDisplayName(step, afterInfo.text));
    } catch {
      // Ignore individual step failures and continue with the remaining plan.
    }
  }

  return {
    filledFields: unique(filledFields),
    planSummary: plan.summary,
  };
}

async function runHeuristicAutofill(
  scopedFields: FormField[],
  profile: SelectedWebsiteProfile
): Promise<AutofillExecution> {
  const filledFields: string[] = [];

  for (const field of scopedFields) {
    if (field.element instanceof HTMLSelectElement) {
      const didFillNativeSelect = fillNativeSelectField(field, profile);
      if (didFillNativeSelect) {
        filledFields.push(getFieldDisplayName(field));
      }
      continue;
    }

    if (field.type === 'select' && field.element instanceof HTMLElement) {
      const didFillCustomSelect = await fillCustomSelect(field, profile);
      if (didFillCustomSelect) {
        filledFields.push(getFieldDisplayName(field));
      }
      continue;
    }

    if (!isFieldEmpty(field)) {
      continue;
    }

    if (field.element instanceof HTMLInputElement || field.element instanceof HTMLTextAreaElement) {
      const beforeValue = getVisibleFieldValue(field);
      const value = resolveTextValue(field, profile);
      if (!value) {
        continue;
      }

      setTextValue(field.element, value);
      if (
        getVisibleFieldValue(field) === beforeValue ||
        getVisibleFieldValue(field) !== normalizeText(value)
      ) {
        continue;
      }

      filledFields.push(getFieldDisplayName(field));
    }
  }

  return {
    filledFields: unique(filledFields),
  };
}

async function tryLLMPageAutofill(
  profile: SelectedWebsiteProfile
): Promise<AutofillExecution> {
  const request = await buildLLMPageAutofillPlanRequest(profile);
  const plan = await requestLLMPageAutofillPlan(request);
  return applyLLMPageAutofillPlan(plan);
}

async function tryLLMAutofill(
  profile: SelectedWebsiteProfile,
  scopedFields: FormField[]
): Promise<AutofillExecution> {
  const pageActionExecution = await tryLLMPageAutofill(profile).catch(() => null);
  if (pageActionExecution && pageActionExecution.filledFields.length > 0) {
    return pageActionExecution;
  }

  const request = buildLLMFieldMappingRequest(profile, scopedFields);
  const plan = await requestLLMFieldMapping(request);
  return applyLLMMappingPlan(scopedFields, plan);
}

export async function orderedAutofillFromSelectedWebsite(
  targetElement: Element | null = document.activeElement
): Promise<OrderedAutofillResult> {
  const profile = await getSelectedWebsiteProfile();

  if (!profile) {
    return {
      status: 'missing_profile',
      message: 'Select a website profile in the extension before ordered autofill.',
      completedCount: 0,
      totalCount: 0,
      filledFields: [],
      steps: [],
    };
  }

  const detector = new FormFieldDetector();
  const targetField = resolveTargetField(detector, targetElement);

  if (!targetField) {
    return {
      status: 'no_target',
      profileName: profile.name,
      profileUrl: profile.url,
      message: 'No supported form fields were detected on this page.',
      completedCount: 0,
      totalCount: 0,
      filledFields: [],
      steps: [],
    };
  }

  const scopedFields = getScopeFields(detector, targetField);

  try {
    const execution = await runOrderedLLMAutofill(profile, scopedFields);
    const totalCount = execution.steps.length;
    const completedCount = execution.steps.filter((step) =>
      step.status === 'updated' || step.status === 'selected' || step.status === 'unchanged'
    ).length;

    if (execution.steps.length === 0) {
      return {
        status: 'no_matches',
        profileName: profile.name,
        profileUrl: profile.url,
        planSummary: execution.planSummary,
        message: 'The AI planner did not return any safe field mappings for this page.',
        completedCount,
        totalCount,
        filledFields: execution.filledFields,
        steps: [],
      };
    }

    if (execution.blockedStep) {
      return {
        status: 'blocked',
        profileName: profile.name,
        profileUrl: profile.url,
        planSummary: execution.planSummary,
        message: execution.blockedStep.message,
        completedCount,
        totalCount,
        filledFields: execution.filledFields,
        steps: execution.steps,
      };
    }

    return {
      status: 'completed',
      profileName: profile.name,
      profileUrl: profile.url,
      planSummary: execution.planSummary,
      message: `Completed ${completedCount} ordered field step${completedCount === 1 ? '' : 's'} for ${profile.name}.`,
      completedCount,
      totalCount,
      filledFields: execution.filledFields,
      steps: execution.steps,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      status: 'blocked',
      profileName: profile.name,
      profileUrl: profile.url,
      message,
      completedCount: 0,
      totalCount: 0,
      filledFields: [],
      steps: [],
    };
  }
}

export async function autofillFormFromSelectedWebsite(
  targetElement: Element | null = document.activeElement,
  strategy: AutofillStrategy = 'auto'
): Promise<AutofillResult> {
  const profile = await getSelectedWebsiteProfile();

  if (!profile) {
    return {
      status: 'missing_profile',
      filledCount: 0,
      skippedCount: 0,
      message: 'Select a website profile in the extension before autofill.',
      filledFields: [],
    };
  }

  const detector = new FormFieldDetector();
  const targetField = resolveTargetField(detector, targetElement);

  if (!targetField) {
    return {
      status: 'no_target',
      profileName: profile.name,
      profileUrl: profile.url,
      filledCount: 0,
      skippedCount: 0,
      message: 'No supported form fields were detected on this page.',
      filledFields: [],
    };
  }

  const scopedFields = getScopeFields(detector, targetField);
  let llmExecution: AutofillExecution | null = null;
  let llmError: string | null = null;

  if (strategy !== 'heuristic') {
    try {
      llmExecution = await tryLLMAutofill(profile, scopedFields);
    } catch (error) {
      llmError = error instanceof Error ? error.message : String(error);
    }
  }

  const shouldUseHeuristicFallback =
    strategy !== 'llm' && (!llmExecution || llmExecution.filledFields.length === 0);
  const heuristicExecution = shouldUseHeuristicFallback
    ? await runHeuristicAutofill(scopedFields, profile)
    : null;

  if (llmExecution && llmExecution.filledFields.length > 0 && strategy === 'auto') {
    const supplementalHeuristic = await runHeuristicAutofill(scopedFields, profile);
    if (supplementalHeuristic.filledFields.length > 0) {
      const mergedFields = unique([
        ...llmExecution.filledFields,
        ...supplementalHeuristic.filledFields,
      ]);
      const additionalVerifiedCount = Math.max(
        mergedFields.length - llmExecution.filledFields.length,
        0
      );

      return {
        status: 'filled',
        profileName: profile.name,
        profileUrl: profile.url,
        filledCount: mergedFields.length,
        skippedCount: Math.max(scopedFields.length - mergedFields.length, 0),
        strategy: 'llm',
        planSummary: llmExecution.planSummary,
        message: `Filled ${mergedFields.length} verified field${mergedFields.length === 1 ? '' : 's'} using AI mapping for ${profile.name}. Heuristic fallback completed ${additionalVerifiedCount} additional verified field${additionalVerifiedCount === 1 ? '' : 's'}.`,
        filledFields: mergedFields,
      };
    }
  }

  if (llmExecution && llmExecution.filledFields.length > 0) {
    const filledFields = llmExecution.filledFields;

    return {
      status: 'filled',
      profileName: profile.name,
      profileUrl: profile.url,
      filledCount: filledFields.length,
      skippedCount: Math.max(scopedFields.length - filledFields.length, 0),
      strategy: 'llm',
      planSummary: llmExecution.planSummary,
      message: `Filled ${filledFields.length} verified field${filledFields.length === 1 ? '' : 's'} using AI mapping for ${profile.name}.`,
      filledFields,
    };
  }

  if (heuristicExecution && heuristicExecution.filledFields.length > 0) {
    const filledFields = heuristicExecution.filledFields;
    const fallbackPrefix = strategy === 'auto' && llmError
      ? `${formatAutofillErrorReason(llmError)}, so `
      : strategy === 'auto'
        ? 'AI mapping did not find usable matches, so '
        : '';

    return {
      status: 'filled',
      profileName: profile.name,
      profileUrl: profile.url,
      filledCount: filledFields.length,
      skippedCount: Math.max(scopedFields.length - filledFields.length, 0),
      strategy: 'heuristic',
      message: `${fallbackPrefix}Quick Fill filled ${filledFields.length} verified field${filledFields.length === 1 ? '' : 's'} using ${profile.name}.`,
      filledFields,
    };
  }

  if (strategy === 'llm' && llmError) {
    return {
      status: 'no_matches',
      profileName: profile.name,
      profileUrl: profile.url,
      filledCount: 0,
      skippedCount: scopedFields.length,
      strategy: 'llm',
      message: llmError,
      filledFields: [],
    };
  }

  if (llmError) {
    return {
      status: 'no_matches',
      profileName: profile.name,
      profileUrl: profile.url,
      filledCount: 0,
      skippedCount: scopedFields.length,
      strategy: strategy === 'llm' ? 'llm' : 'heuristic',
      message: `${formatAutofillErrorReason(llmError)} and heuristic autofill found no matching empty fields for ${profile.name}.`,
      filledFields: [],
    };
  }

  return {
    status: 'no_matches',
    profileName: profile.name,
    profileUrl: profile.url,
    filledCount: 0,
    skippedCount: scopedFields.length,
    strategy: strategy === 'llm' ? 'llm' : 'heuristic',
    message:
      strategy === 'llm'
        ? 'LLM mapping did not find safe matches for the selected website profile on this page.'
        : 'No matching empty fields were found for the selected website profile.',
    filledFields: [],
  };
}
