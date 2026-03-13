/**
 * Page-Hook Message Bridge
 */

import { PAGE_HOOK_CHANNEL } from './constants';
import type { PageHookMessage } from './types';

export type PageHookMessageHandler = (message: PageHookMessage) => void;

export class PageHookBridge {
  private listeners: Set<PageHookMessageHandler> = new Set();
  private isListening = false;

  start(): void {
    if (this.isListening) return;

    window.addEventListener('message', this.handleMessage);
    this.isListening = true;
    console.log('[PageHookBridge] Started listening');
  }

  stop(): void {
    if (!this.isListening) return;

    window.removeEventListener('message', this.handleMessage);
    this.isListening = false;
    console.log('[PageHookBridge] Stopped listening');
  }

  private handleMessage = (event: MessageEvent): void => {
    const data = event.data;
    if (!data || typeof data !== 'object') return;
    if (!data.__xExporter || data.channel !== PAGE_HOOK_CHANNEL) return;
    if (event.source !== window) {
      console.warn('[PageHookBridge] Ignoring message from different source');
      return;
    }

    this.processMessage(data as PageHookMessage);
  };

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

  private handleCapture(message: PageHookMessage): void {
    console.log('[PageHookBridge] Captured:', {
      url: message.url,
      status: message.status,
      bodyLength: message.body?.length || 0,
    });
    this.notifyListeners(message);
  }

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
    this.notifyListeners(message);
  }

  subscribe(handler: PageHookMessageHandler): () => void {
    this.listeners.add(handler);
    return () => { this.listeners.delete(handler); };
  }

  private notifyListeners(message: PageHookMessage): void {
    this.listeners.forEach((listener) => {
      try {
        listener(message);
      } catch (error) {
        console.error('[PageHookBridge] Listener error:', error);
      }
    });
  }

  isActive(): boolean {
    return this.isListening;
  }
}

let bridgeInstance: PageHookBridge | null = null;

export function getPageHookBridge(): PageHookBridge {
  if (!bridgeInstance) {
    bridgeInstance = new PageHookBridge();
  }
  return bridgeInstance;
}
