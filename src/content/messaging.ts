/**
 * Message Handler for Content Script
 */

import type { ContentMessageType } from './types';
import { getStorageManager } from './storage';
import { getTwitterDetector } from './twitter';

export class ContentMessageHandler {
  async handleMessage(
    type: ContentMessageType,
    payload?: any,
    _sender?: chrome.runtime.MessageSender
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

  private async handlePluginToggle(payload: { enabled: boolean }) {
    const storage = getStorageManager();
    await storage.update('enabled', payload.enabled);
    console.log('[Content Messaging] Plugin toggled:', payload.enabled);
    return { success: true, enabled: payload.enabled };
  }

  private async handleAutoDetectToggle(payload: { enabled: boolean }) {
    const storage = getStorageManager();
    await storage.update('autoDetect', payload.enabled);
    console.log('[Content Messaging] Auto-detect toggled:', payload.enabled);
    return { success: true, enabled: payload.enabled };
  }

  private handleInsert(payload: { text: string }) {
    const { text } = payload;
    const twitter = getTwitterDetector();

    if (twitter.isTwitter() && twitter.hasComposeBox()) {
      const success = twitter.insertIntoComposeBox(text);
      if (success) return { success: true, method: 'twitter-compose' };
    }

    const activeElement = document.activeElement;

    if (
      activeElement &&
      (activeElement instanceof HTMLInputElement ||
        activeElement instanceof HTMLTextAreaElement ||
        (activeElement as HTMLElement).isContentEditable)
    ) {
      if (activeElement instanceof HTMLInputElement || activeElement instanceof HTMLTextAreaElement) {
        activeElement.value = text;
        activeElement.dispatchEvent(new Event('input', { bubbles: true }));
      } else {
        (activeElement as HTMLElement).textContent = text;
      }
      return { success: true, method: 'active-element' };
    }

    return { success: false, error: 'No editable element found' };
  }

  private handleSidepanelToggle() {
    chrome.runtime.sendMessage({ type: 'x:open-panel' });
    return { success: true };
  }

  private handleContextMenu() {
    chrome.runtime.sendMessage({ type: 'x:open-panel' });
    return { success: true };
  }

  private async handleFloatingButtonToggle(payload: { enabled: boolean }) {
    const storage = getStorageManager();
    await storage.update('floatingButton', payload.enabled);
    console.log('[Content Messaging] Floating button toggled:', payload.enabled);
    return { success: true, enabled: payload.enabled };
  }
}

export function setupMessageListener(): void {
  const handler = new ContentMessageHandler();

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    const { type, payload } = message;
    if (!type) return false;

    handler
      .handleMessage(type, payload, sender)
      .then((response) => sendResponse(response))
      .catch((error) => {
        sendResponse({
          success: false,
          error: error instanceof Error ? error.message : String(error),
        });
      });

    return true;
  });

  console.log('[Content Messaging] Message listener setup complete');
}
