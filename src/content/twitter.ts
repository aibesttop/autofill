/**
 * Twitter/X Specific Logic
 * Handles Twitter/X platform-specific features
 */

import { TWITTER_DOMAINS } from './constants';

/**
 * Twitter detector
 */
export class TwitterDetector {
  /**
   * Check if current page is Twitter/X
   */
  isTwitter(): boolean {
    const hostname = window.location.hostname.toLowerCase();
    return TWITTER_DOMAINS.some((domain) => hostname === domain || hostname.endsWith(`.${domain}`));
  }

  /**
   * Check if current page is Twitter DM page
   */
  isDirectMessage(): boolean {
    if (!this.isTwitter()) {
      return false;
    }

    const pathname = window.location.pathname.toLowerCase();
    return pathname.includes('/messages') || pathname.includes('/dm/');
  }

  /**
   * Check if current page is Twitter compose page
   */
  isComposePage(): boolean {
    if (!this.isTwitter()) {
      return false;
    }

    const pathname = window.location.pathname.toLowerCase();
    return pathname.includes('/compose/tweet');
  }

  /**
   * Get tweet text from current page
   */
  getTweetText(): string | null {
    // Look for tweet text in various selectors
    const selectors = [
      '[data-testid="tweet"] [data-testid="tweetText"]',
      '[data-testid="tweet"]',
      'article[role="article"]',
    ];

    for (const selector of selectors) {
      const element = document.querySelector(selector);
      if (element) {
        return element.textContent?.trim() || null;
      }
    }

    return null;
  }

  /**
   * Get current tweet ID from URL
   */
  getTweetId(): string | null {
    const match = window.location.pathname.match(/\/status\/(\d+)/);
    return match ? match[1] : null;
  }

  /**
   * Check if page has compose box
   */
  hasComposeBox(): boolean {
    const composeBox = document.querySelector('[data-testid="tweetTextarea"]');
    return composeBox !== null;
  }

  /**
   * Get compose box element
   */
  getComposeBox(): HTMLTextAreaElement | HTMLInputElement | null {
    const selector = '[data-testid="tweetTextarea"]';
    const element = document.querySelector(selector);

    if (element && (element instanceof HTMLTextAreaElement || element instanceof HTMLInputElement)) {
      return element;
    }

    return null;
  }

  /**
   * Insert text into compose box
   */
  insertIntoComposeBox(text: string): boolean {
    const composeBox = this.getComposeBox();

    if (!composeBox) {
      return false;
    }

    // Focus and set value
    composeBox.focus();
    composeBox.value = text;

    // Dispatch input event
    const event = new Event('input', { bubbles: true });
    composeBox.dispatchEvent(event);

    return true;
  }

  /**
   * Click tweet button
   */
  clickTweetButton(): boolean {
    const selectors = [
      '[data-testid="tweetButtonInline"]',
      '[data-testid="tweetButton"]',
      'button[data-testid="tweet"]',
    ];

    for (const selector of selectors) {
      const button = document.querySelector(selector);
      if (button instanceof HTMLButtonElement) {
        button.click();
        return true;
      }
    }

    return false;
  }
}

/**
 * Get Twitter detector singleton
 */
let twitterDetector: TwitterDetector | null = null;

export function getTwitterDetector(): TwitterDetector {
  if (!twitterDetector) {
    twitterDetector = new TwitterDetector();
  }
  return twitterDetector;
}
