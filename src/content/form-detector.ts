/**
 * Form Field Detection
 */

import { FORM_SELECTORS, MAX_FORM_FIELDS } from './constants';
import type { FormField } from './types';

export class FormFieldDetector {
  private detectedFields: Map<HTMLElement, FormField> = new Map();

  detect(): FormField[] {
    this.detectedFields.clear();

    const inputs = document.querySelectorAll('input, textarea, select');
    let count = 0;

    for (const element of inputs) {
      if (count >= MAX_FORM_FIELDS) break;

      const el = element as HTMLElement;
      if (this.isValidFormField(el)) {
        const field = this.createFormField(el);
        this.detectedFields.set(el, field);
        count++;
      }
    }

    console.log(`[FormDetector] Detected ${count} form fields`);
    return Array.from(this.detectedFields.values());
  }

  detectFieldForElement(element: Element | null): FormField | null {
    const candidate = this.findCandidateElement(element);

    if (!candidate || !this.isValidFormField(candidate)) {
      return null;
    }

    return this.createFormField(candidate);
  }

  private findCandidateElement(element: Element | null): HTMLElement | null {
    if (!element) {
      return null;
    }

    if (
      element instanceof HTMLInputElement ||
      element instanceof HTMLTextAreaElement ||
      element instanceof HTMLSelectElement
    ) {
      return element;
    }

    const closest = element.closest('input, textarea, select');
    return closest instanceof HTMLElement ? closest : null;
  }

  private isValidFormField(element: HTMLElement): boolean {
    if (element instanceof HTMLSelectElement) {
      if (this.isHidden(element)) return false;
      if (element.disabled) return false;
      return true;
    }

    if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
      const input = element;
      const type = input.type?.toLowerCase() || 'text';

      if (!FORM_SELECTORS.INPUT_TYPES.some((allowedType) => allowedType === type) && type !== 'textarea') {
        return false;
      }

      if (this.isHidden(input)) return false;
      if (input.disabled || input.readOnly) return false;

      return true;
    }

    return false;
  }

  private isHidden(element: HTMLElement): boolean {
    const style = window.getComputedStyle(element);

    if (style.display === 'none' || style.visibility === 'hidden') return true;
    if (style.opacity === '0') return true;
    if (element.getAttribute('aria-hidden') === 'true') return true;

    const rect = element.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) return true;

    return false;
  }

  private createFormField(element: HTMLElement): FormField {
    const input = element as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
    const type = input instanceof HTMLSelectElement ? 'select' : input.type || 'text';
    const placeholder = 'placeholder' in input ? input.placeholder || undefined : undefined;

    return {
      element: input,
      type,
      name: input.name || input.id || '',
      label: this.findLabel(input),
      placeholder,
      autocompleteType: this.getAutocompleteType(input),
    };
  }

  private findLabel(
    input: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
  ): string | undefined {
    const ariaLabel = input.getAttribute('aria-label');
    if (ariaLabel) return ariaLabel;

    if (input.id) {
      const label = document.querySelector(`label[for="${input.id}"]`);
      if (label) return label.textContent?.trim() || undefined;
    }

    const parentLabel = input.closest('label');
    if (parentLabel) {
      const text = parentLabel.textContent?.trim();
      const placeholder = 'placeholder' in input ? input.placeholder : '';
      if (text && text !== placeholder && text !== input.value) return text;
    }

    return undefined;
  }

  private getAutocompleteType(
    input: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
  ): string | undefined {
    const autocomplete = input.getAttribute('autocomplete');
    if (autocomplete && autocomplete !== 'off') return autocomplete;

    if (input instanceof HTMLSelectElement) {
      return undefined;
    }

    const name = input.name?.toLowerCase() || '';
    const type = input.type?.toLowerCase() || '';

    if (name.includes('email') || type === 'email') return 'email';
    if (name.includes('tel') || type === 'tel') return 'tel';
    if (name.includes('url') || type === 'url') return 'url';

    return undefined;
  }

  getFields(): FormField[] {
    return Array.from(this.detectedFields.values());
  }

  getFieldByElement(element: HTMLElement): FormField | undefined {
    return this.detectedFields.get(element);
  }

  clear(): void {
    this.detectedFields.clear();
  }
}
