import { STORAGE_KEYS, LOCAL_TEST_DEFAULT_WEBSITE, LOCAL_TEST_MODE } from './constants';
import { requestLLMFieldMapping, requestLLMPageAutofillPlan } from './ai-autofill';
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
  AutofillResult,
  AutofillStrategy,
  FormField,
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
  desiredCount = 1
): boolean {
  if (!(field.element instanceof HTMLSelectElement)) {
    return false;
  }

  const normalizedTerms = normalizeCandidateTerms(terms);
  if (normalizedTerms.length === 0) {
    return false;
  }

  const choices = Array.from(field.element.options)
    .filter((option) => !option.disabled && !isPlaceholderOption(option))
    .map<SelectChoice>((option) => ({
      value: option.value,
      label: option.textContent || option.label || option.value,
    }));

  if (field.element.multiple || desiredCount > 1) {
    const bestChoices = getBestSelectChoicesForTerms(choices, normalizedTerms, desiredCount);
    const nextValues = bestChoices.map((choice) => choice.value);
    const currentValues = Array.from(field.element.selectedOptions).map((option) => option.value);

    if (
      nextValues.length === 0 ||
      (nextValues.length === currentValues.length &&
        nextValues.every((value) => currentValues.includes(value)))
    ) {
      return false;
    }

    setSelectValues(field.element, nextValues);
    const verifiedValues = Array.from(field.element.selectedOptions).map((option) => option.value);
    return (
      verifiedValues.length === nextValues.length &&
      nextValues.every((value) => verifiedValues.includes(value))
    );
  }

  const nextValue = getBestSelectChoiceForTerms(choices, normalizedTerms)?.value || null;
  if (!nextValue || !canOverwriteSelectValue(field.element, nextValue)) {
    return false;
  }

  setSelectValue(field.element, nextValue);
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

function dispatchMouseSequence(element: HTMLElement): void {
  element.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true }));
  element.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
  element.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true }));
  element.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
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

function getControlledPopupContainers(element: HTMLElement): HTMLElement[] {
  const popupIds = [element.getAttribute('aria-controls'), element.getAttribute('aria-owns')]
    .flatMap((value) => (value ? value.split(/\s+/) : []))
    .filter(Boolean);

  return popupIds
    .map((id) => document.getElementById(id))
    .filter(isVisibleElement);
}

function getVisibleCustomOptionElements(element: HTMLElement): HTMLElement[] {
  const controlledContainers = getControlledPopupContainers(element);
  const optionSelector = getCustomOptionSelector();

  if (controlledContainers.length > 0) {
    return uniqueElements(
      controlledContainers.flatMap((container) => [
        ...Array.from(container.querySelectorAll<HTMLElement>(optionSelector)).filter(isCustomOptionCandidate),
        ...getLoosePopupOptionElements(container),
      ])
    ).sort((left, right) => getElementDepth(right) - getElementDepth(left));
  }

  const popupContainers = Array.from(
    document.querySelectorAll<HTMLElement>(CUSTOM_SELECT_CONTAINER_SELECTORS.join(', '))
  ).filter(isVisibleElement);
  if (popupContainers.length > 0) {
    return uniqueElements(
      popupContainers.flatMap((container) => [
        ...Array.from(container.querySelectorAll<HTMLElement>(optionSelector)).filter(isCustomOptionCandidate),
        ...getLoosePopupOptionElements(container),
      ])
    ).sort((left, right) => getElementDepth(right) - getElementDepth(left));
  }

  return uniqueElements(
    Array.from(document.querySelectorAll<HTMLElement>(optionSelector)).filter(isCustomOptionCandidate)
  ).sort((left, right) => getElementDepth(right) - getElementDepth(left));
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
      const leftRect = left.getBoundingClientRect();
      const rightRect = right.getBoundingClientRect();
      const leftDistance = Math.abs(leftRect.top - triggerRect.bottom);
      const rightDistance = Math.abs(rightRect.top - triggerRect.bottom);
      return leftDistance - rightDistance;
    });
}

function getPopupContainers(element: HTMLElement): HTMLElement[] {
  const controlledContainers = getControlledPopupContainers(element);
  if (controlledContainers.length > 0) {
    return controlledContainers;
  }

  const knownContainers = Array.from(
    document.querySelectorAll<HTMLElement>(CUSTOM_SELECT_CONTAINER_SELECTORS.join(', '))
  ).filter(isVisibleElement);
  if (knownContainers.length > 0) {
    return knownContainers;
  }

  return getNearbyPopupContainers(element);
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
  if (element instanceof HTMLTextAreaElement) {
    nativeTextAreaValueSetter?.call(element, value);
  } else {
    nativeInputValueSetter?.call(element, value);
  }

  if (element.value !== value) {
    element.value = value;
  }

  element.dispatchEvent(new Event('input', { bubbles: true }));
  element.dispatchEvent(new Event('change', { bubbles: true }));
}

function collectVisibleCustomChoices(trigger: HTMLElement): SelectChoice[] {
  return getVisibleCustomOptionElements(trigger)
    .map(buildCustomSelectChoice)
    .filter((choice): choice is SelectChoice => choice !== null)
    .filter((choice) => !containsAny(normalizeText(choice.label || choice.value), [...SELECT_PLACEHOLDER_TERMS]));
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

async function openCustomSelect(element: HTMLElement): Promise<void> {
  element.focus();
  dispatchMouseSequence(element);
  await delay(80);
}

async function findAndSelectChoicesWithSearchTerms(
  trigger: HTMLElement,
  terms: string[],
  desiredCount: number
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
      await openCustomSelect(trigger);
      popupContainers = getPopupContainers(trigger);
    }

    const searchInput = popupContainers.map(getSearchInput).find(Boolean) || null;
    if (!searchInput) {
      break;
    }

    searchInput.focus();
    setTextControlValue(searchInput, term);
    await delay(140);

    const choices = collectVisibleCustomChoices(trigger);

    const bestChoice = getBestChoiceForSearchTerm(
      choices.filter((choice) => !selectedChoiceKeys.has(getChoiceKey(choice))),
      term
    );
    if (!bestChoice?.element) {
      continue;
    }

    const choiceKey = getChoiceKey(bestChoice);
    if (selectedChoiceKeys.has(choiceKey)) {
      continue;
    }

    if (bestChoice.selected) {
      selectedChoiceKeys.add(choiceKey);
      selectedCount += 1;
      continue;
    }

    clickCustomChoice(bestChoice.element);
    selectedChoiceKeys.add(choiceKey);
    selectedCount += 1;
    await delay(100);
  }

  const popupContainers = getPopupContainers(trigger);
  const searchInput = popupContainers.map(getSearchInput).find(Boolean) || null;
  if (searchInput) {
    setTextControlValue(searchInput, '');
    await delay(60);
  }

  return selectedCount;
}

async function findAndSelectChoicesByScrollingTerms(
  trigger: HTMLElement,
  terms: string[],
  desiredCount: number
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
      await openCustomSelect(trigger);
      popupContainers = getPopupContainers(trigger);
    }

    const scrollContainers = getScrollablePopupContainers(trigger);
    scrollContainers.forEach(resetScrollPosition);
    if (scrollContainers.length > 0) {
      await delay(80);
    }

    for (let attempt = 0; attempt < 10; attempt += 1) {
      const bestChoice = getBestChoiceForSearchTerm(
        collectVisibleCustomChoices(trigger).filter((choice) => !selectedChoiceKeys.has(getChoiceKey(choice))),
        term
      );
      if (bestChoice?.element) {
        const choiceKey = getChoiceKey(bestChoice);
        if (selectedChoiceKeys.has(choiceKey)) {
          break;
        }

        if (!bestChoice.selected) {
          bestChoice.element.scrollIntoView({ block: 'nearest' });
          clickCustomChoice(bestChoice.element);
          await delay(100);
        }

        selectedChoiceKeys.add(choiceKey);
        selectedCount += 1;
        break;
      }

      const didScroll = scrollContainers.map(scrollPopupContainerStep).some(Boolean);
      if (!didScroll) {
        break;
      }

      await delay(100);
    }
  }

  return selectedCount;
}

async function fillCustomSelectWithTerms(
  field: FormField,
  terms: string[],
  desiredCount = 1
): Promise<boolean> {
  const trigger = field.element instanceof HTMLElement ? field.element : null;
  const normalizedTerms = normalizeCandidateTerms(terms);
  if (!trigger || normalizedTerms.length === 0 || desiredCount <= 0) {
    return false;
  }

  const beforeValue = getCurrentCustomSelectText(trigger);

  const selectedWithSearch = await findAndSelectChoicesWithSearchTerms(
    trigger,
    normalizedTerms,
    desiredCount
  );
  if (selectedWithSearch > 0) {
    const afterValue = getCurrentCustomSelectText(trigger);
    if (afterValue && afterValue !== beforeValue) {
      return true;
    }
  }

  const selectedWithScroll = await findAndSelectChoicesByScrollingTerms(
    trigger,
    normalizedTerms,
    desiredCount
  );
  if (selectedWithScroll > 0) {
    const afterValue = getCurrentCustomSelectText(trigger);
    if (afterValue && afterValue !== beforeValue) {
      return true;
    }
  }

  let optionElements = getVisibleCustomOptionElements(trigger);
  if (optionElements.length === 0) {
    await openCustomSelect(trigger);
    optionElements = getVisibleCustomOptionElements(trigger);
  }

  if (optionElements.length === 0) {
    trigger.click();
    await delay(120);
    optionElements = getVisibleCustomOptionElements(trigger);
  }

  const choices = collectVisibleCustomChoices(trigger);

  if (choices.length === 0) {
    return false;
  }

  if (desiredCount > 1) {
    const bestChoices = getBestSelectChoicesForTerms(choices, normalizedTerms, desiredCount);
    if (bestChoices.length === 0) {
      return false;
    }

    let selectedCount = 0;

    for (const bestChoice of bestChoices) {
      if (!bestChoice.element) {
        continue;
      }

      if (bestChoice.selected) {
        selectedCount += 1;
        continue;
      }

      bestChoice.element.scrollIntoView({ block: 'nearest' });
      clickCustomChoice(bestChoice.element);
      await delay(60);
      selectedCount += 1;
    }

    if (selectedCount <= 0) {
      return false;
    }

    const selectedChoices = collectVisibleCustomChoices(trigger).filter((choice) => choice.selected);
    return selectedChoices.length > 0 || getCurrentCustomSelectText(trigger) !== beforeValue;
  }

  const bestChoice = getBestSelectChoiceForTerms(choices, normalizedTerms);
  if (
    !bestChoice?.element ||
    !canOverwriteCustomSelectValueWithTerms(trigger, bestChoice, normalizedTerms)
  ) {
    return false;
  }

  bestChoice.element.scrollIntoView({ block: 'nearest' });
  clickCustomChoice(bestChoice.element);
  await delay(50);
  const afterValue = getCurrentCustomSelectText(trigger);
  return (
    bestChoice.selected ||
    afterValue === normalizeText(bestChoice.label || bestChoice.value) ||
    (!!afterValue && afterValue !== beforeValue)
  );
}

async function fillCustomSelect(field: FormField, profile: SelectedWebsiteProfile): Promise<boolean> {
  const searchTerms = unique([
    ...getPreferredSearchTerms(field, profile),
    ...getSelectCandidateTerms(field, profile),
  ]);
  const desiredCount = isMultiValueField(field) ? getDesiredChoiceCount(field, profile) : 1;
  return fillCustomSelectWithTerms(field, searchTerms, desiredCount);
}

function clickCustomChoice(element: HTMLElement): void {
  const nestedInput = element.querySelector<HTMLInputElement>('input[type="checkbox"], input[type="radio"]');
  const label = element.closest('label') || element.querySelector('label');

  if (label instanceof HTMLElement) {
    dispatchMouseSequence(label);
    label.click();
    return;
  }

  if (nestedInput) {
    nestedInput.focus();
    nestedInput.click();
    return;
  }

  dispatchMouseSequence(element);
  element.click();
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
  if (element instanceof HTMLTextAreaElement) {
    nativeTextAreaValueSetter?.call(element, value);
  } else {
    nativeInputValueSetter?.call(element, value);
  }

  if (element.value !== value) {
    element.value = value;
  }

  dispatchFieldEvents(element);
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
    await inputPageElement(step.index, step.text, true);
    const afterInfo = await getPageElementInfo(step.index).catch(
      () => ({}) as Awaited<ReturnType<typeof getPageElementInfo>>
    );
    const afterValue = normalizePageElementInfoValue(afterInfo);
    return afterValue === normalizeText(step.text) && afterValue !== beforeValue;
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
