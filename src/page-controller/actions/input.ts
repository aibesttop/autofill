/**
 * Input actions for page automation
 */

import type { ElementRef, TextInputOptions, SelectOptionOptions, InteractiveElement } from '../types';
import { getElementByIndex, setNativeValue, waitFor } from '../utils/common';
import { simulateClick, dispatchInputEvent, dispatchChangeEvent } from '../utils/events';

export async function inputText(
  options: TextInputOptions,
  selectorMap: Map<number, InteractiveElement>
): Promise<void> {
  let element: HTMLInputElement | HTMLTextAreaElement;

  if (options.element instanceof HTMLElement) {
    element = options.element as HTMLInputElement | HTMLTextAreaElement;
  } else {
    const el = getElementByIndex((options.element as ElementRef).index, selectorMap);
    element = el as HTMLInputElement | HTMLTextAreaElement;
  }

  if (!(element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement)) {
    throw new Error('Element is not an input or textarea');
  }

  await simulateClick(element);

  if (options.clearFirst) {
    element.select();
    setNativeValue(element, '');
    dispatchInputEvent(element);
  }

  setNativeValue(element, options.text);
  dispatchInputEvent(element);

  await waitFor(0.1);
}

export async function selectOption(
  options: SelectOptionOptions,
  selectorMap: Map<number, InteractiveElement>
): Promise<void> {
  let element: HTMLSelectElement;

  if (options.element instanceof HTMLElement) {
    element = options.element as HTMLSelectElement;
  } else {
    const el = getElementByIndex((options.element as ElementRef).index, selectorMap);
    element = el as HTMLSelectElement;
  }

  if (!(element instanceof HTMLSelectElement)) {
    throw new Error('Element is not a select element');
  }

  const option = Array.from(element.options).find(
    (opt) => opt.textContent?.trim() === options.option.trim()
  );

  if (!option) {
    throw new Error(`Option with text "${options.option}" not found in select element`);
  }

  element.value = option.value;
  dispatchChangeEvent(element);

  await waitFor(0.1);
}

export async function clearInput(
  elementRef: ElementRef | HTMLElement,
  selectorMap: Map<number, InteractiveElement>
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
