/**
 * Scrolling utilities for page automation
 */

import { waitFor } from './common';

/**
 * Scroll vertically by specified amount
 */
export async function scrollVertically(
  direction: 'up' | 'down',
  amount?: number,
  targetElement?: HTMLElement
): Promise<string> {
  const pixels = amount || 300;
  const delta = direction === 'down' ? pixels : -pixels;

  if (targetElement) {
    return scrollElementVertically(targetElement, delta);
  }

  return scrollPageVertically(delta);
}

/**
 * Scroll horizontally by specified amount
 */
export async function scrollHorizontally(
  direction: 'left' | 'right',
  amount?: number,
  targetElement?: HTMLElement
): Promise<string> {
  const pixels = amount || 300;
  const delta = direction === 'right' ? pixels : -pixels;

  if (targetElement) {
    return scrollElementHorizontally(targetElement, delta);
  }

  return scrollPageHorizontally(delta);
}

/**
 * Scroll page vertically
 */
async function scrollPageVertically(delta: number): Promise<string> {
  const startY = window.scrollY;
  const maxScroll = document.documentElement.scrollHeight - window.innerHeight;

  window.scrollBy(0, delta);
  await waitFor(0.1);

  const endY = window.scrollY;
  const scrolled = endY - startY;

  if (Math.abs(scrolled) < 1) {
    return delta > 0
      ? '⚠️ Already at the bottom of the page, cannot scroll down further.'
      : '⚠️ Already at the top of the page, cannot scroll up further.';
  }

  const atBottom = delta > 0 && endY >= maxScroll - 1;
  const atTop = delta < 0 && endY <= 1;

  if (atBottom) {
    return `✅ Scrolled page by ${scrolled}px. Reached the bottom of the page.`;
  }

  if (atTop) {
    return `✅ Scrolled page by ${scrolled}px. Reached the top of the page.`;
  }

  return `✅ Scrolled page by ${scrolled}px.`;
}

/**
 * Scroll page horizontally
 */
async function scrollPageHorizontally(delta: number): Promise<string> {
  const startX = window.scrollX;
  const maxScroll = document.documentElement.scrollWidth - window.innerWidth;

  window.scrollBy(delta, 0);
  await waitFor(0.1);

  const endX = window.scrollX;
  const scrolled = endX - startX;

  if (Math.abs(scrolled) < 1) {
    return delta > 0
      ? '⚠️ Already at the right edge of the page, cannot scroll right further.'
      : '⚠️ Already at the left edge of the page, cannot scroll left further.';
  }

  const atRight = delta > 0 && endX >= maxScroll - 1;
  const atLeft = delta < 0 && endX <= 1;

  if (atRight) {
    return `✅ Scrolled page by ${scrolled}px. Reached the right edge of the page.`;
  }

  if (atLeft) {
    return `✅ Scrolled page by ${scrolled}px. Reached the left edge of the page.`;
  }

  return `✅ Scrolled page horizontally by ${scrolled}px.`;
}

/**
 * Scroll element vertically
 */
async function scrollElementVertically(element: HTMLElement, delta: number): Promise<string> {
  const startY = element.scrollTop;
  const maxScroll = element.scrollHeight - element.clientHeight;

  element.scrollBy({ top: delta, behavior: 'smooth' });
  await waitFor(0.1);

  const endY = element.scrollTop;
  const scrolled = endY - startY;

  if (Math.abs(scrolled) < 1) {
    return delta > 0
      ? `⚠️ Already at the bottom of container (${element.tagName}), cannot scroll down further.`
      : `⚠️ Already at the top of container (${element.tagName}), cannot scroll up further.`;
  }

  const atBottom = delta > 0 && endY >= maxScroll - 1;
  const atTop = delta < 0 && endY <= 1;

  if (atBottom) {
    return `✅ Scrolled container (${element.tagName}) by ${scrolled}px. Reached the bottom.`;
  }

  if (atTop) {
    return `✅ Scrolled container (${element.tagName}) by ${scrolled}px. Reached the top.`;
  }

  return `✅ Scrolled container (${element.tagName}) by ${scrolled}px.`;
}

/**
 * Scroll element horizontally
 */
async function scrollElementHorizontally(element: HTMLElement, delta: number): Promise<string> {
  const startX = element.scrollLeft;
  const maxScroll = element.scrollWidth - element.clientWidth;

  element.scrollBy({ left: delta, behavior: 'smooth' });
  await waitFor(0.1);

  const endX = element.scrollLeft;
  const scrolled = endX - startX;

  if (Math.abs(scrolled) < 1) {
    return delta > 0
      ? `⚠️ Already at the right edge of container (${element.tagName}), cannot scroll right further.`
      : `⚠️ Already at the left edge of container (${element.tagName}), cannot scroll left further.`;
  }

  const atRight = delta > 0 && endX >= maxScroll - 1;
  const atLeft = delta < 0 && endX <= 1;

  if (atRight) {
    return `✅ Scrolled container (${element.tagName}) by ${scrolled}px. Reached the right edge.`;
  }

  if (atLeft) {
    return `✅ Scrolled container (${element.tagName}) by ${scrolled}px. Reached the left edge.`;
  }

  return `✅ Scrolled container (${element.tagName}) horizontally by ${scrolled}px.`;
}
