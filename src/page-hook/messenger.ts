/**
 * Secure messenger for page-hook → content-script communication
 * Uses postMessage with origin validation
 */

// Channel name for communication
export const HOOK_CHANNEL = 'x-exporter-bridge';

// Allowed origins for postMessage (extension pages only)
const ALLOWED_ORIGINS = new Set<string>();

/**
 * Initialize allowed origins from current script
 * The content script should inject this page-hook with data-origin attribute
 */
function getAllowedOrigins(): Set<string> {
  try {
    const script = document.currentScript as HTMLScriptElement;
    const origin = script?.dataset.origin;

    if (origin) {
      return new Set([origin]);
    }
  } catch {}

  // Fallback: try to get extension URL from chrome runtime if available
  try {
    const extensionId = (window as any).chrome?.runtime?.id;
    if (extensionId) {
      return new Set([`chrome-extension://${extensionId}`]);
    }
  } catch {}

  return ALLOWED_ORIGINS;
}

/**
 * Message payload types
 */
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

/**
 * Send message to content script via postMessage
 * Uses specific origin for security instead of wildcard
 */
export function postMessage(payload: HookMessage): void {
  const allowedOrigins = getAllowedOrigins();

  try {
    // If we have specific origins, use them; otherwise fall back to wildcard for compatibility
    const message = {
      __xExporter: true,
      channel: HOOK_CHANNEL,
      ...payload,
    };

    if (allowedOrigins.size > 0) {
      // Send to each allowed origin
      allowedOrigins.forEach((origin) => {
        window.postMessage(message, origin);
      });
    } else {
      // Fallback: wildcard (less secure, but maintains compatibility)
      console.warn('[PageHook] No allowed origins configured, using wildcard');
      window.postMessage(message, '*');
    }
  } catch (error) {
    console.error('[PageHook] Failed to post message:', error);
  }
}

/**
 * Log message
 */
export function log(level: LogMessage['level'], message: string, url?: string): void {
  postMessage({
    type: 'log',
    level,
    message,
    url,
  });
}

/**
 * Capture response
 */
export function captureResponse(url: string, status: number, body: string): void {
  postMessage({
    type: 'capture',
    url,
    status,
    body,
    capturedAt: Date.now(),
  });
}
