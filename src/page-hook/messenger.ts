/**
 * Secure messenger for page-hook → content-script communication
 */

export const HOOK_CHANNEL = 'x-exporter-bridge';

export interface CaptureMessage {
  type: 'capture';
  url: string;
  status: number;
  body: string;
  capturedAt: number;
}

export interface LogMessage {
  type: 'log';
  level: 'info' | 'warn' | 'error';
  url?: string;
  message: string;
}

export type HookMessage = CaptureMessage | LogMessage;

export function postHookMessage(payload: HookMessage): void {
  try {
    const message = {
      __xExporter: true,
      channel: HOOK_CHANNEL,
      ...payload,
    };

    window.postMessage(message, '*');
  } catch (error) {
    console.error('[PageHook] Failed to post message:', error);
  }
}

export function log(level: LogMessage['level'], message: string, url?: string): void {
  postHookMessage({
    type: 'log',
    level,
    message,
    url,
  });
}

export function captureResponse(url: string, status: number, body: string): void {
  postHookMessage({
    type: 'capture',
    url,
    status,
    body,
    capturedAt: Date.now(),
  });
}
