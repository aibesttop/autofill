/**
 * Click action for page automation
 */

import type { ElementRef, InteractiveElement } from '../types';
import { getElementByIndex } from '../utils/common';
import { simulateClick } from '../utils/events';

export async function clickElement(
  elementRef: ElementRef | HTMLElement,
  selectorMap: Map<number, InteractiveElement>
): Promise<void> {
  let element: HTMLElement;

  if (elementRef instanceof HTMLElement) {
    element = elementRef;
  } else {
    element = getElementByIndex(elementRef.index, selectorMap);
  }

  await simulateClick(element);
}

export async function doubleClickElement(
  elementRef: ElementRef | HTMLElement,
  selectorMap: Map<number, InteractiveElement>
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

export async function hoverElement(
  elementRef: ElementRef | HTMLElement,
  selectorMap: Map<number, InteractiveElement>
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
