/**
 * Input actions for page automation
 */

import type { ElementRef, TextInputOptions, SelectOptionOptions } from '../types';
import { getElementByIndex, setNativeValue } from '../utils/common';
import { simulateClick, dispatchInputEvent, dispatchChangeEvent } from '../utils/events';
import { waitFor } from '../utils/common';

/**
 * Input text into element
 */
export async function inputText(
  options: TextInputOptions,
  selectorMap: Map<number, any>
): Promise<void> {
  let element: HTMLInputElement | HTMLTextAreaElement;

  if (options.element instanceof HTMLElement) {
    element = options.element as HTMLInputElement | HTMLTextAreaElement;
  } else {
    const el = getElementByIndex(options.element.index, selectorMap);
    element = el as HTMLInputElement | HTMLTextAreaElement;
  }

  if (!(element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement)) {
    throw new Error('Element is not an input or textarea');
  }

  // Click element first to focus
  await simulateClick(element);

  // Clear if requested
  if (options.clearFirst) {
    element.select();
    setNativeValue(element, '');
    dispatchInputEvent(element);
  }

  // Set value natively
  setNativeValue(element, options.text);

  // Dispatch input event
  dispatchInputEvent(element);

  await waitFor(0.1);
}

/**
 * Select option from dropdown
 */
export async function selectOption(
  options: SelectOptionOptions,
  selectorMap: Map<number, any>
): Promise<void> {
  let element: HTMLSelectElement;

  if (options.element instanceof HTMLElement) {
    element = options.element as HTMLSelectElement;
  } else {
    const el = getElementByIndex(options.element.index, selectorMap);
    element = el as HTMLSelectElement;
  }

  if (!(element instanceof HTMLSelectElement)) {
    throw new Error('Element is not a select element');
  }

  // Find option by text
  const option = Array.from(element.options).find(
    (opt) => opt.textContent?.trim() === options.option.trim()
  );

  if (!option) {
    throw new Error(`Option with text "${options.option}" not found in select element`);
  }

  // Set value
  element.value = option.value;

  // Dispatch change event
  dispatchChangeEvent(element);

  await waitFor(0.1);
}

/**
 * Clear input field
 */
export async function clearInput(
  elementRef: ElementRef | HTMLElement,
  selectorMap: Map<number, any>
): Promise<void> {
  let element: HTMLInputElement | HTMLTextAreaElement;

  if (elementRef instanceof HTMLElement) {
    element = elementRef as HTMLInputElement | HTMLTextAreaElement;
  } else {
    const el = getElementByIndex(elementRef.index, selectorMap);
    element = el as HTMLInputElement | HTMLTextAreaElement;
  }

  if (!(element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement)) {
    throw new Error('Element is not an input or textarea');
  }

  await simulateClick(element);
  element.select();
  setNativeValue(element, '');
  dispatchInputEvent(element);
}
