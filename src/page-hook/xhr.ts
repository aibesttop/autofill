/**
 * XMLHttpRequest hook for intercepting network requests
 */

import { shouldCaptureUrl, normalizeUrl } from './url-utils';
import { captureResponse, log } from './messenger';

interface XHRWithUrl extends XMLHttpRequest {
  __xUrl?: string;
}

function readResponseBody(xhr: XMLHttpRequest): string {
  try {
    const responseType = xhr.responseType;

    if (responseType === '' || responseType === 'text' || responseType == null) {
      return xhr.responseText || '';
    }

    if (responseType === 'arraybuffer' && xhr.response instanceof ArrayBuffer) {
      try {
        const decoder = new TextDecoder('utf-8');
        return decoder.decode(new Uint8Array(xhr.response));
      } catch {
        return '';
      }
    }

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

export function hookXHROpen(): void {
  const originalOpen = XMLHttpRequest.prototype.open;

  XMLHttpRequest.prototype.open = function (
    this: XHRWithUrl,
    method: string,
    url: string | URL,
    async?: boolean,
    username?: string | null,
    password?: string | null
  ) {
    try {
      this.__xUrl = typeof url === 'string' ? url : url.toString();
    } catch {
      log('warn', 'Failed to capture XHR URL in open()');
    }

    return originalOpen.call(this, method, url, async ?? true, username, password);
  };
}

export function hookXHRSend(): void {
  const originalSend = XMLHttpRequest.prototype.send;

  XMLHttpRequest.prototype.send = function (
    this: XHRWithUrl,
    body?: Document | XMLHttpRequestBodyInit | null
  ) {
    try {
      this.addEventListener('loadend', function (this: XHRWithUrl) {
        try {
          const url = this.__xUrl || this.responseURL;
          if (!shouldCaptureUrl(url)) return;

          const responseBody = readResponseBody(this);
          const normalizedUrl = normalizeUrl(url);

          captureResponse(normalizedUrl, this.status, responseBody);
        } catch (error) {
          const url = this.__xUrl || this.responseURL;
          log('error', String(error), normalizeUrl(url));
        }
      });
    } catch {
      log('warn', 'Failed to add XHR event listener');
    }

    return originalSend.call(this, body);
  };
}

export function installXHRHooks(): void {
  try {
    hookXHROpen();
    hookXHRSend();
    log('info', 'XHR hooks installed successfully');
  } catch (error) {
    log('error', 'XHR hook installation failed: ' + String(error));
  }
}
