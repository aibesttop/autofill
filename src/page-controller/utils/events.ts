/**
 * Event handling utilities for page automation
 */

import { waitFor } from './common';

let lastClickedElement: HTMLElement | null = null;

export function blurLastClickedElement(): void {
  if (lastClickedElement) {
    lastClickedElement.blur();
    lastClickedElement.dispatchEvent(
      new MouseEvent('mouseout', { bubbles: true, cancelable: true })
    );
    lastClickedElement = null;
  }
}

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

export function dispatchPointerClick(): void {
  window.dispatchEvent(new CustomEvent('PageAgent::ClickPointer'));
}

export async function simulateClick(element: HTMLElement): Promise<void> {
  blurLastClickedElement();
  lastClickedElement = element;

  element.scrollIntoView({ behavior: 'auto', block: 'center', inline: 'nearest' });
  await waitFor(0.1);

  await movePointerToElement(element);

  dispatchPointerClick();
  await waitFor(0.1);

  element.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true, cancelable: true }));
  element.dispatchEvent(new MouseEvent('mouseover', { bubbles: true, cancelable: true }));
  element.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
  element.focus();

  element.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true }));
  element.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));

  await waitFor(0.2);
}

export function dispatchInputEvent(element: HTMLInputElement | HTMLTextAreaElement): void {
  element.dispatchEvent(new Event('input', { bubbles: true }));
}

export function dispatchChangeEvent(element: HTMLElement): void {
  element.dispatchEvent(new Event('change', { bubbles: true }));
}

export function getEventListenersDebugInfo(element: HTMLElement): Record<string, number> {
  const listeners: Record<string, number> = {};

  if ((window as any).getEventListeners) {
    const events = (window as any).getEventListeners(element);
    for (const [eventType, eventList] of Object.entries(events)) {
      listeners[eventType] = (eventList as any[]).length;
    }
  }

  return listeners;
}
