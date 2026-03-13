/**
 * Form Field Detection
 * Detects form fields on the page for AI autofill
 */

import { FORM_SELECTORS, MAX_FORM_FIELDS } from './constants';
import type { FormField } from './types';

/**
 * Form field detector
 */
export class FormFieldDetector {
  private detectedFields: Map<HTMLElement, FormField> = new Map();

  /**
   * Detect all form fields on current page
   */
  detect(): FormField[] {
    this.detectedFields.clear();

    const inputs = document.querySelectorAll('input, textarea');
    let count = 0;

    for (const element of inputs) {
      if (count >= MAX_FORM_FIELDS) {
        break;
      }

      if (this.isValidFormField(element)) {
        const field = this.createFormField(element);
        this.detectedFields.set(element, field);
        count++;
      }
    }

    console.log(`[FormDetector] Detected ${count} form fields`);
    return Array.from(this.detectedFields.values());
  }

  /**
   * Check if element is a valid form field
   */
  private isValidFormField(element: HTMLElement): boolean {
    if (!(element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement)) {
      return false;
    }

    const input = element as HTMLInputElement | HTMLTextAreaElement;

    // Check type
    const type = input.type?.toLowerCase() || 'text';
    if (!FORM_SELECTORS.INPUT_TYPES.includes(type) && type !== 'textarea') {
      return false;
    }

    // Check if hidden
    if (this.isHidden(input)) {
      return false;
    }

    // Check if disabled or readonly
    if (input.disabled || input.readOnly) {
      return false;
    }

    return true;
  }

  /**
   * Check if element is hidden
   */
  private isHidden(element: HTMLElement): boolean {
    const style = window.getComputedStyle(element);

    // Check display and visibility
    if (style.display === 'none' || style.visibility === 'hidden') {
      return true;
    }

    // Check opacity
    if (style.opacity === '0') {
      return true;
    }

    // Check aria-hidden
    if (element.getAttribute('aria-hidden') === 'true') {
      return true;
    }

    // Check if element is not in viewport
    const rect = element.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) {
      return true;
    }

    return false;
  }

  /**
   * Create form field object
   */
  private createFormField(element: HTMLElement): FormField {
    const input = element as HTMLInputElement | HTMLTextAreaElement;

    return {
      element: input,
      type: input.type || 'text',
      name: input.name || input.id || '',
      label: this.findLabel(input),
      placeholder: input.placeholder || undefined,
      autocompleteType: this.getAutocompleteType(input),
    };
  }

  /**
   * Find label for input element
   */
  private findLabel(input: HTMLInputElement | HTMLTextAreaElement): string | undefined {
    // Check aria-label
    const ariaLabel = input.getAttribute('aria-label');
    if (ariaLabel) {
      return ariaLabel;
    }

    // Check associated label element
    if (input.id) {
      const label = document.querySelector(`label[for="${input.id}"]`);
      if (label) {
        return label.textContent?.trim() || undefined;
      }
    }

    // Check parent label
    const parentLabel = input.closest('label');
    if (parentLabel) {
      const text = parentLabel.textContent?.trim();
      // Exclude the input's own placeholder/text
      if (text && text !== input.placeholder && text !== input.value) {
        return text;
      }
    }

    return undefined;
  }

  /**
   * Get autocomplete type
   */
  private getAutocompleteType(input: HTMLInputElement | HTMLTextAreaElement): string | undefined {
    const autocomplete = input.getAttribute('autocomplete');
    if (autocomplete && autocomplete !== 'off') {
      return autocomplete;
    }

    // Try to infer from name/type
    const name = input.name?.toLowerCase() || '';
    const type = input.type?.toLowerCase() || '';

    if (name.includes('email') || type === 'email') {
      return 'email';
    }
    if (name.includes('tel') || type === 'tel') {
      return 'tel';
    }
    if (name.includes('url') || type === 'url') {
      return 'url';
    }

    return undefined;
  }

  /**
   * Get detected fields
   */
  getFields(): FormField[] {
    return Array.from(this.detectedFields.values());
  }

  /**
   * Get field by element
   */
  getFieldByElement(element: HTMLElement): FormField | undefined {
    return this.detectedFields.get(element);
  }

  /**
   * Clear detected fields
   */
  clear(): void {
    this.detectedFields.clear();
  }
}
