/**
 * Event handling utilities for page automation
 */

import { waitFor } from './common';

let lastClickedElement: HTMLElement | null = null;

/**
 * Blur the last clicked element
 */
export function blurLastClickedElement(): void {
  if (lastClickedElement) {
    lastClickedElement.blur();
    lastClickedElement.dispatchEvent(
      new MouseEvent('mouseout', { bubbles: true, cancelable: true })
    );
    lastClickedElement = null;
  }
}

/**
 * Move pointer to element (for visual feedback)
 */
export async function movePointerToElement(element: HTMLElement): Promise<void> {
  const rect = element.getBoundingClientRect();
  const x = rect.left + rect.width / 2;
  const y = rect.top + rect.height / 2;

  window.dispatchEvent(
    new CustomEvent('PageAgent::MovePointerTo', {
      detail: { x, y },
    })
  );

  await waitFor(0.3);
}

/**
 * Dispatch pointer click event
 */
export function dispatchPointerClick(): void {
  window.dispatchEvent(new CustomEvent('PageAgent::ClickPointer'));
}

/**
 * Simulate click on element with full event sequence
 */
export async function simulateClick(element: HTMLElement): Promise<void> {
  blurLastClickedElement();
  lastClickedElement = element;

  // Scroll into view
  element.scrollIntoView({ behavior: 'auto', block: 'center', inline: 'nearest' });
  await waitFor(0.1);

  // Move pointer
  await movePointerToElement(element);

  // Dispatch pointer click
  dispatchPointerClick();
  await waitFor(0.1);

  // Mouse events sequence
  element.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true, cancelable: true }));
  element.dispatchEvent(new MouseEvent('mouseover', { bubbles: true, cancelable: true }));
  element.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
  element.focus();

  element.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true }));
  element.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));

  await waitFor(0.2);
}

/**
 * Dispatch input event on element
 */
export function dispatchInputEvent(element: HTMLInputElement | HTMLTextAreaElement): void {
  const event = new Event('input', { bubbles: true });
  element.dispatchEvent(event);
}

/**
 * Dispatch change event on element
 */
export function dispatchChangeEvent(element: HTMLElement): void {
  const event = new Event('change', { bubbles: true });
  element.dispatchEvent(event);
}

/**
 * Get event listeners info (for debugging)
 */
export function getEventListenersDebugInfo(element: HTMLElement): Record<string, number> {
  const listeners: Record<string, number> = {};

  // This only works in Chrome DevTools context
  if ((window as any).getEventListeners) {
    const events = (window as any).getEventListeners(element);
    for (const [eventType, eventList] of Object.entries(events)) {
      listeners[eventType] = eventList.length;
    }
  }

  return listeners;
}
