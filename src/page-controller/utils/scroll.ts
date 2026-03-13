/**
 * Scrolling utilities for page automation
 */

import { waitFor } from './common';

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

  if (delta > 0 && endY >= maxScroll - 1) {
    return `✅ Scrolled page by ${scrolled}px. Reached the bottom of the page.`;
  }
  if (delta < 0 && endY <= 1) {
    return `✅ Scrolled page by ${scrolled}px. Reached the top of the page.`;
  }

  return `✅ Scrolled page by ${scrolled}px.`;
}

async function scrollPageHorizontally(delta: number): Promise<string> {
  const startX = window.scrollX;
  const maxScroll = document.documentElement.scrollWidth - window.innerWidth;

  window.scrollBy(delta, 0);
  await waitFor(0.1);

  const endX = window.scrollX;
  const scrolled = endX - startX;

  if (Math.abs(scrolled) < 1) {
    return delta > 0
      ? '⚠️ Already at the right edge of the page.'
      : '⚠️ Already at the left edge of the page.';
  }

  if (delta > 0 && endX >= maxScroll - 1) {
    return `✅ Scrolled page by ${scrolled}px. Reached the right edge.`;
  }
  if (delta < 0 && endX <= 1) {
    return `✅ Scrolled page by ${scrolled}px. Reached the left edge.`;
  }

  return `✅ Scrolled page horizontally by ${scrolled}px.`;
}

async function scrollElementVertically(element: HTMLElement, delta: number): Promise<string> {
  const startY = element.scrollTop;
  const maxScroll = element.scrollHeight - element.clientHeight;

  element.scrollBy({ top: delta, behavior: 'smooth' });
  await waitFor(0.1);

  const endY = element.scrollTop;
  const scrolled = endY - startY;

  if (Math.abs(scrolled) < 1) {
    return delta > 0
      ? `⚠️ Already at the bottom of container (${element.tagName}).`
      : `⚠️ Already at the top of container (${element.tagName}).`;
  }

  if (delta > 0 && endY >= maxScroll - 1) {
    return `✅ Scrolled container (${element.tagName}) by ${scrolled}px. Reached the bottom.`;
  }
  if (delta < 0 && endY <= 1) {
    return `✅ Scrolled container (${element.tagName}) by ${scrolled}px. Reached the top.`;
  }

  return `✅ Scrolled container (${element.tagName}) by ${scrolled}px.`;
}

async function scrollElementHorizontally(element: HTMLElement, delta: number): Promise<string> {
  const startX = element.scrollLeft;
  const maxScroll = element.scrollWidth - element.clientWidth;

  element.scrollBy({ left: delta, behavior: 'smooth' });
  await waitFor(0.1);

  const endX = element.scrollLeft;
  const scrolled = endX - startX;

  if (Math.abs(scrolled) < 1) {
    return delta > 0
      ? `⚠️ Already at the right edge of container (${element.tagName}).`
      : `⚠️ Already at the left edge of container (${element.tagName}).`;
  }

  if (delta > 0 && endX >= maxScroll - 1) {
    return `✅ Scrolled container (${element.tagName}) by ${scrolled}px. Reached the right edge.`;
  }
  if (delta < 0 && endX <= 1) {
    return `✅ Scrolled container (${element.tagName}) by ${scrolled}px. Reached the left edge.`;
  }

  return `✅ Scrolled container (${element.tagName}) horizontally by ${scrolled}px.`;
}
