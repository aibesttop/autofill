/**
 * Click action for page automation
 */

import type { ElementRef } from '../types';
import { getElementByIndex } from '../utils/common';
import { simulateClick } from '../utils/events';

/**
 * Click element by index or reference
 */
export async function clickElement(
  elementRef: ElementRef | HTMLElement,
  selectorMap: Map<number, any>
): Promise<void> {
  let element: HTMLElement;

  if (elementRef instanceof HTMLElement) {
    element = elementRef;
  } else {
    element = getElementByIndex(elementRef.index, selectorMap);
  }

  await simulateClick(element);
}

/**
 * Double click element
 */
export async function doubleClickElement(
  elementRef: ElementRef | HTMLElement,
  selectorMap: Map<number, any>
): Promise<void> {
  let element: HTMLElement;

  if (elementRef instanceof HTMLElement) {
    element = elementRef;
  } else {
    element = getElementByIndex(elementRef.index, selectorMap);
  }

  await simulateClick(element);
  await simulateClick(element);
}

/**
 * Hover over element
 */
export async function hoverElement(
  elementRef: ElementRef | HTMLElement,
  selectorMap: Map<number, any>
): Promise<void> {
  let element: HTMLElement;

  if (elementRef instanceof HTMLElement) {
    element = elementRef;
  } else {
    element = getElementByIndex(elementRef.index, selectorMap);
  }

  element.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true, cancelable: true }));
  element.dispatchEvent(new MouseEvent('mouseover', { bubbles: true, cancelable: true }));
}
