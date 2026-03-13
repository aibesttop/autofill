/**
 * Twitter/X Specific Logic
 */

import { TWITTER_DOMAINS } from './constants';

export class TwitterDetector {
  isTwitter(): boolean {
    const hostname = window.location.hostname.toLowerCase();
    return TWITTER_DOMAINS.some((domain) => hostname === domain || hostname.endsWith(`.${domain}`));
  }

  isDirectMessage(): boolean {
    if (!this.isTwitter()) return false;
    const pathname = window.location.pathname.toLowerCase();
    return pathname.includes('/messages') || pathname.includes('/dm/');
  }

  isComposePage(): boolean {
    if (!this.isTwitter()) return false;
    const pathname = window.location.pathname.toLowerCase();
    return pathname.includes('/compose/tweet');
  }

  getTweetText(): string | null {
    const selectors = [
      '[data-testid="tweet"] [data-testid="tweetText"]',
      '[data-testid="tweet"]',
      'article[role="article"]',
    ];

    for (const selector of selectors) {
      const element = document.querySelector(selector);
      if (element) return element.textContent?.trim() || null;
    }

    return null;
  }

  getTweetId(): string | null {
    const match = window.location.pathname.match(/\/status\/(\d+)/);
    return match ? match[1] : null;
  }

  hasComposeBox(): boolean {
    return document.querySelector('[data-testid="tweetTextarea"]') !== null;
  }

  getComposeBox(): HTMLTextAreaElement | HTMLInputElement | null {
    const element = document.querySelector('[data-testid="tweetTextarea"]');
    if (element && (element instanceof HTMLTextAreaElement || element instanceof HTMLInputElement)) {
      return element;
    }
    return null;
  }

  insertIntoComposeBox(text: string): boolean {
    const composeBox = this.getComposeBox();
    if (!composeBox) return false;

    composeBox.focus();
    composeBox.value = text;
    composeBox.dispatchEvent(new Event('input', { bubbles: true }));

    return true;
  }

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

let twitterDetector: TwitterDetector | null = null;

export function getTwitterDetector(): TwitterDetector {
  if (!twitterDetector) {
    twitterDetector = new TwitterDetector();
  }
  return twitterDetector;
}
