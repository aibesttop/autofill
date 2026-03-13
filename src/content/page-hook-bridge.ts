/**
 * Page-Hook Message Bridge
 * Listens for messages from page-hook script
 */

import { PAGE_HOOK_CHANNEL } from './constants';
import type { PageHookMessage } from './types';

/**
 * Message handler type
 */
export type PageHookMessageHandler = (message: PageHookMessage) => void;

/**
 * Page hook bridge class
 */
export class PageHookBridge {
  private listeners: Set<PageHookMessageHandler> = new Set();
  private isListening: boolean = false;

  /**
   * Start listening for page-hook messages
   */
  start(): void {
    if (this.isListening) {
      return;
    }

    window.addEventListener('message', this.handleMessage);
    this.isListening = true;

    console.log('[PageHookBridge] Started listening');
  }

  /**
   * Stop listening for page-hook messages
   */
  stop(): void {
    if (!this.isListening) {
      return;
    }

    window.removeEventListener('message', this.handleMessage);
    this.isListening = false;

    console.log('[PageHookBridge] Stopped listening');
  }

  /**
   * Handle window message event
   */
  private handleMessage = (event: MessageEvent): void => {
    // Validate message structure
    const data = event.data;

    if (!data || typeof data !== 'object') {
      return;
    }

    // Check if this is a page-hook message
    if (!data.__xExporter || data.channel !== PAGE_HOOK_CHANNEL) {
      return;
    }

    // Validate origin (should be from same page)
    if (event.source !== window) {
      console.warn('[PageHookBridge] Ignoring message from different source:', event.source);
      return;
    }

    // Process message
    this.processMessage(data as PageHookMessage);
  };

  /**
   * Process page-hook message
   */
  private processMessage(message: PageHookMessage): void {
    const { type } = message;

    switch (type) {
      case 'capture':
        this.handleCapture(message);
        break;

      case 'log':
        this.handleLog(message);
        break;

      default:
        console.warn('[PageHookBridge] Unknown message type:', type);
    }
  }

  /**
   * Handle capture message (network interception)
   */
  private handleCapture(message: PageHookMessage): void {
    const { url, status, body } = message;

    console.log('[PageHookBridge] Captured:', {
      url,
      status,
      bodyLength: body?.length || 0,
    });

    // Notify listeners
    this.notifyListeners(message);
  }

  /**
   * Handle log message
   */
  private handleLog(message: PageHookMessage): void {
    const { level, message: logMessage } = message;

    switch (level) {
      case 'info':
        console.info('[PageHook]', logMessage);
        break;
      case 'warn':
        console.warn('[PageHook]', logMessage);
        break;
      case 'error':
        console.error('[PageHook]', logMessage);
        break;
    }

    // Notify listeners
    this.notifyListeners(message);
  }

  /**
   * Subscribe to page-hook messages
   */
  subscribe(handler: PageHookMessageHandler): () => void {
    this.listeners.add(handler);

    // Return unsubscribe function
    return () => {
      this.listeners.delete(handler);
    };
  }

  /**
   * Notify all listeners
   */
  private notifyListeners(message: PageHookMessage): void {
    this.listeners.forEach((listener) => {
      try {
        listener(message);
      } catch (error) {
        console.error('[PageHookBridge] Listener error:', error);
      }
    });
  }

  /**
   * Check if currently listening
   */
  isActive(): boolean {
    return this.isListening;
  }
}

// Singleton instance
let bridgeInstance: PageHookBridge | null = null;

/**
 * Get page-hook bridge singleton
 */
export function getPageHookBridge(): PageHookBridge {
  if (!bridgeInstance) {
    bridgeInstance = new PageHookBridge();
  }
  return bridgeInstance;
}
