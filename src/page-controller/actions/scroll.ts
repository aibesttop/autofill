/**
 * Scroll actions for page automation
 */

import type { ScrollOptions } from '../types';
import { scrollVertically, scrollHorizontally } from '../utils/scroll';

/**
 * Perform scroll action
 */
export async function performScroll(options: ScrollOptions): Promise<string> {
  if (options.direction === 'up' || options.direction === 'down') {
    return scrollVertically(
      options.direction === 'down' ? 'down' : 'up',
      options.amount,
      options.targetElement
    );
  }

  if (options.direction === 'left' || options.direction === 'right') {
    return scrollHorizontally(
      options.direction === 'right' ? 'right' : 'left',
      options.amount,
      options.targetElement
    );
  }

  throw new Error(`Invalid scroll direction: ${options.direction}`);
}

/**
 * Scroll to top of page
 */
export async function scrollToTop(): Promise<void> {
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/**
 * Scroll to bottom of page
 */
export async function scrollToBottom(): Promise<void> {
  window.scrollTo({
    top: document.documentElement.scrollHeight,
    behavior: 'smooth',
  });
}

/**
 * Scroll element into view
 */
export async function scrollElementIntoView(element: HTMLElement): Promise<void> {
  element.scrollIntoView({ behavior: 'smooth', block: 'center' });
}
