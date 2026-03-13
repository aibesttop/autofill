/**
 * Message Handler for Content Script
 * Handles messages from background script
 */

import type { ContentMessageType } from './types';
import { getStorageManager } from './storage';
import { getTwitterDetector } from './twitter';

/**
 * Message handler class
 */
export class ContentMessageHandler {
  /**
   * Handle message from background
   */
  async handleMessage(
    type: ContentMessageType,
    payload?: any,
    sender?: chrome.runtime.MessageSender
  ): Promise<any> {
    try {
      switch (type) {
        case 'plugin:toggle':
          return this.handlePluginToggle(payload);

        case 'autoDetect:toggle':
          return this.handleAutoDetectToggle(payload);

        case 'insert':
          return this.handleInsert(payload);

        case 'sidepanel:toggle':
          return this.handleSidepanelToggle();

        case 'contextmenu:open-panel':
          return this.handleContextMenu();

        case 'floatingButton:toggle':
          return this.handleFloatingButtonToggle(payload);

        default:
          console.warn('[Content Messaging] Unknown message type:', type);
          return { success: false, error: 'Unknown message type' };
      }
    } catch (error) {
      console.error('[Content Messaging] Error handling message:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Handle plugin toggle
   */
  private async handlePluginToggle(payload: { enabled: boolean }) {
    const { enabled } = payload;
    const storage = getStorageManager();

    await storage.update('enabled', enabled);

    console.log('[Content Messaging] Plugin toggled:', enabled);

    return { success: true, enabled };
  }

  /**
   * Handle auto-detect toggle
   */
  private async handleAutoDetectToggle(payload: { enabled: boolean }) {
    const { enabled } = payload;
    const storage = getStorageManager();

    await storage.update('autoDetect', enabled);

    console.log('[Content Messaging] Auto-detect toggled:', enabled);

    return { success: true, enabled };
  }

  /**
   * Handle insert (text insertion)
   */
  private handleInsert(payload: { text: string }) {
    const { text } = payload;
    const twitter = getTwitterDetector();

    // If on Twitter, try to insert into compose box
    if (twitter.isTwitter() && twitter.hasComposeBox()) {
      const success = twitter.insertIntoComposeBox(text);

      if (success) {
        return { success: true, method: 'twitter-compose' };
      }
    }

    // Try to find active input and insert
    const activeElement = document.activeElement;

    if (
      activeElement &&
      (activeElement instanceof HTMLInputElement ||
        activeElement instanceof HTMLTextAreaElement ||
        activeElement.isContentEditable)
    ) {
      if (activeElement instanceof HTMLInputElement || activeElement instanceof HTMLTextAreaElement) {
        activeElement.value = text;
        activeElement.dispatchEvent(new Event('input', { bubbles: true }));
      } else {
        // Content editable element
        activeElement.textContent = text;
      }

      return { success: true, method: 'active-element' };
    }

    return { success: false, error: 'No editable element found' };
  }

  /**
   * Handle sidepanel toggle
   */
  private handleSidepanelToggle() {
    // Open side panel via background
    chrome.runtime.sendMessage({ type: 'x:open-panel' });

    return { success: true };
  }

  /**
   * Handle context menu action
   */
  private handleContextMenu() {
    // Open side panel via background
    chrome.runtime.sendMessage({ type: 'x:open-panel' });

    return { success: true };
  }

  /**
   * Handle floating button toggle
   */
  private async handleFloatingButtonToggle(payload: { enabled: boolean }) {
    const { enabled } = payload;
    const storage = getStorageManager();

    await storage.update('floatingButton', enabled);

    console.log('[Content Messaging] Floating button toggled:', enabled);

    return { success: true, enabled };
  }
}

/**
 * Setup message listener
 */
export function setupMessageListener(): void {
  const handler = new ContentMessageHandler();

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    const { type, payload } = message;

    if (!type) {
      return false;
    }

    // Handle message async
    handler
      .handleMessage(type, payload, sender)
      .then((response) => {
        sendResponse(response);
      })
      .catch((error) => {
        sendResponse({
          success: false,
          error: error instanceof Error ? error.message : String(error),
        });
      });

    return true; // Async response
  });

  console.log('[Content Messaging] Message listener setup complete');
}
