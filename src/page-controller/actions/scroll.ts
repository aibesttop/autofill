/**
 * Scroll actions for page automation
 */

import type { ScrollOptions } from '../types';
import { scrollVertically, scrollHorizontally } from '../utils/scroll';

export async function performScroll(options: ScrollOptions): Promise<string> {
  if (options.direction === 'up' || options.direction === 'down') {
    return scrollVertically(options.direction, options.amount, options.targetElement);
  }

  if (options.direction === 'left' || options.direction === 'right') {
    return scrollHorizontally(options.direction, options.amount, options.targetElement);
  }

  throw new Error(`Invalid scroll direction: ${options.direction}`);
}

export async function scrollToTop(): Promise<void> {
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

export async function scrollToBottom(): Promise<void> {
  window.scrollTo({
    top: document.documentElement.scrollHeight,
    behavior: 'smooth',
  });
}

export async function scrollElementIntoView(element: HTMLElement): Promise<void> {
  element.scrollIntoView({ behavior: 'smooth', block: 'center' });
}
