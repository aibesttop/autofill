import { STORAGE_KEYS } from '@shared/constants';
import { FormFieldDetector } from './form-detector';
import type { AutofillResult, FormField } from './types';

interface SelectedWebsiteProfile {
  id: string;
  name: string;
  url: string;
  category?: string;
  description?: string;
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

function normalizeText(value: string | undefined): string {
  return (value || '').toLowerCase().replace(/\s+/g, ' ').trim();
}

function containsAny(text: string, keywords: string[]): boolean {
  return keywords.some((keyword) => text.includes(keyword));
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
  return isSelectedWebsiteProfile(snapshot) ? snapshot : null;
}

function getFieldDescriptor(field: FormField): string {
  return normalizeText(
    [field.name, field.label, field.placeholder, field.autocompleteType, field.type]
      .filter(Boolean)
      .join(' ')
  );
}

function buildDescription(profile: SelectedWebsiteProfile): string {
  if (profile.description) {
    return profile.description;
  }

  const host = getHostname(profile.url);
  return profile.category
    ? `${profile.name} is a ${profile.category} website available at ${host}.`
    : `${profile.name} is available at ${host}.`;
}

function buildKeywordText(profile: SelectedWebsiteProfile): string | null {
  const parts = [profile.name, profile.category, getHostname(profile.url)];
  const uniqueParts = Array.from(new Set(parts.filter(Boolean)));
  return uniqueParts.length > 0 ? uniqueParts.join(', ') : null;
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

  if (containsAny(descriptor, ['category', 'industry', 'niche', 'sector', 'type'])) {
    return profile.category || null;
  }

  if (
    field.type === 'textarea' ||
    containsAny(descriptor, ['description', 'about', 'bio', 'summary', 'details', 'message', 'overview'])
  ) {
    return description;
  }

  if (containsAny(descriptor, ['keyword', 'tag'])) {
    return buildKeywordText(profile);
  }

  if (containsAny(descriptor, ['username', 'handle'])) {
    return host;
  }

  return field.element === document.activeElement ? profile.name : null;
}

function matchSelectValue(select: HTMLSelectElement, profile: SelectedWebsiteProfile): string | null {
  const options = Array.from(select.options);
  const preferredTerms = [
    normalizeText(profile.category),
    normalizeText(profile.name),
    normalizeText(getHostname(profile.url)),
  ].filter(Boolean);

  for (const option of options) {
    const text = normalizeText(option.textContent || option.label || option.value);
    if (!text) {
      continue;
    }

    if (
      preferredTerms.some((term) => text.includes(term) || term.includes(text))
    ) {
      return option.value;
    }
  }

  return null;
}

function isFieldEmpty(field: FormField): boolean {
  const element = field.element;

  if (element instanceof HTMLSelectElement) {
    const selectedOption = element.options[element.selectedIndex];
    const selectedText = normalizeText(selectedOption?.textContent || selectedOption?.label || '');
    const selectedValue = normalizeText(element.value);
    return !selectedValue || containsAny(selectedText, ['select', 'choose', 'please select']);
  }

  if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
    return element.value.trim().length === 0;
  }

  return true;
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
    return [targetField];
  }

  return fields.filter((field) => field.element.closest('form') === targetForm);
}

function getFieldDisplayName(field: FormField): string {
  return field.label || field.name || field.placeholder || field.type;
}

export async function autofillFormFromSelectedWebsite(
  targetElement: Element | null = document.activeElement
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
  const targetField = detector.detectFieldForElement(targetElement);

  if (!targetField) {
    return {
      status: 'no_target',
      profileName: profile.name,
      profileUrl: profile.url,
      filledCount: 0,
      skippedCount: 0,
      message: 'Focus a supported form field before autofill.',
      filledFields: [],
    };
  }

  const scopedFields = getScopeFields(detector, targetField);
  const filledFields: string[] = [];
  let skippedCount = 0;

  for (const field of scopedFields) {
    if (!isFieldEmpty(field)) {
      skippedCount += 1;
      continue;
    }

    if (field.element instanceof HTMLSelectElement) {
      const selectValue = matchSelectValue(field.element, profile);
      if (!selectValue) {
        skippedCount += 1;
        continue;
      }

      setSelectValue(field.element, selectValue);
      filledFields.push(getFieldDisplayName(field));
      continue;
    }

    if (field.element instanceof HTMLInputElement || field.element instanceof HTMLTextAreaElement) {
      const value = resolveTextValue(field, profile);
      if (!value) {
        skippedCount += 1;
        continue;
      }

      setTextValue(field.element, value);
      filledFields.push(getFieldDisplayName(field));
      continue;
    }

    skippedCount += 1;
  }

  if (filledFields.length === 0) {
    return {
      status: 'no_matches',
      profileName: profile.name,
      profileUrl: profile.url,
      filledCount: 0,
      skippedCount,
      message: 'No matching empty fields were found for the selected website profile.',
      filledFields: [],
    };
  }

  return {
    status: 'filled',
    profileName: profile.name,
    profileUrl: profile.url,
    filledCount: filledFields.length,
    skippedCount,
    message: `Filled ${filledFields.length} field${filledFields.length === 1 ? '' : 's'} using ${profile.name}.`,
    filledFields,
  };
}
