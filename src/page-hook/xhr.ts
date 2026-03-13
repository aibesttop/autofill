/**
 * XMLHttpRequest (XHR) hook for intercepting network requests
 * Captures Twitter/X specific endpoints
 */

import { shouldCaptureUrl, normalizeUrl } from './url-utils';
import { captureResponse, log } from './messenger';

/**
 * Read response body from XHR object
 * Handles different response types
 */
function readResponseBody(xhr: XMLHttpRequest): string {
  try {
    const responseType = xhr.responseType;

    // Text response
    if (responseType === '' || responseType === 'text' || responseType == null) {
      return xhr.responseText || '';
    }

    // ArrayBuffer response
    if (responseType === 'arraybuffer' && xhr.response instanceof ArrayBuffer) {
      try {
        const decoder = new TextDecoder('utf-8');
        const bytes = new Uint8Array(xhr.response);
        return decoder.decode(bytes);
      } catch {
        return '';
      }
    }

    // JSON response
    if (responseType === 'json' && xhr.response) {
      try {
        return typeof xhr.response === 'string' ? xhr.response : JSON.stringify(xhr.response);
      } catch {
        return '';
      }
    }
  } catch (error) {
    log('error', 'Failed to read XHR response body', String(error));
  }

  return '';
}

/**
 * Hook XMLHttpRequest.prototype.open to capture URLs
 */
export function hookXHROpen(): void {
  const originalOpen = XMLHttpRequest.prototype.open;

  XMLHttpRequest.prototype.open = function (
    this: XMLHttpRequest & { __xUrl?: string },
    ...args: Parameters<typeof XMLHttpRequest.prototype.open>
  ) {
    try {
      // Capture URL from first argument (method) and second argument (URL)
      // @ts-ignore - storing custom property
      this.__xUrl = args[1];
    } catch (error) {
      log('warn', 'Failed to capture XHR URL in open()');
    }

    return originalOpen.apply(this, args);
  };
}

/**
 * Hook XMLHttpRequest.prototype.send to capture responses
 */
export function hookXHRSend(): void {
  const originalSend = XMLHttpRequest.prototype.send;

  XMLHttpRequest.prototype.send = function (
    this: XMLHttpRequest & { __xUrl?: string },
    ...args: Parameters<typeof XMLHttpRequest.prototype.send>
  ) {
    try {
      // Add listener for response
      this.addEventListener('loadend', function (this: XMLHttpRequest) {
        try {
          const url = this.__xUrl || this.responseURL;

          if (!shouldCaptureUrl(url)) {
            return;
          }

          const body = readResponseBody(this);
          const normalizedUrl = normalizeUrl(url);

          captureResponse(normalizedUrl, this.status, body);
        } catch (error) {
          const url = this.__xUrl || this.responseURL;
          log('error', String(error), normalizeUrl(url));
        }
      });
    } catch (error) {
      log('warn', 'Failed to add XHR event listener');
    }

    return originalSend.apply(this, args);
  };
}

/**
 * Install XHR hooks
 */
export function installXHRHooks(): void {
  try {
    hookXHROpen();
    hookXHRSend();
    log('info', 'XHR hooks installed successfully');
  } catch (error) {
    log('error', 'XHR hook installation failed: ' + String(error));
  }
}
