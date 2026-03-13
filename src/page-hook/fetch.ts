/**
 * Fetch API hook for intercepting network requests
 * Captures Twitter/X specific endpoints
 */

import { shouldCaptureUrl, normalizeUrl } from './url-utils';
import { captureResponse, log } from './messenger';

/**
 * Hook window.fetch to capture requests and responses
 */
export function hookFetch(): void {
  const originalFetch = window.fetch;

  window.fetch = function (
    input: RequestInfo | URL,
    init?: RequestInit
  ): Promise<Response> {
    // Extract URL from request
    const requestUrl = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;

    // Call original fetch
    return originalFetch.apply(window, [input, init]).then((response) => {
      try {
        if (!shouldCaptureUrl(requestUrl)) {
          return response;
        }

        // Clone response to avoid consuming it
        const clonedResponse = response.clone();

        // Read response body and capture it
        clonedResponse.text()
          .then((body) => {
            const normalizedUrl = normalizeUrl(requestUrl);
            captureResponse(normalizedUrl, clonedResponse.status, body);
          })
          .catch((error) => {
            log('warn', 'Failed to read fetch response body: ' + String(error));
          });
      } catch (error) {
        log('warn', 'Fetch hook error: ' + String(error));
      }

      return response;
    });
  };
}

/**
 * Install Fetch hooks
 */
export function installFetchHooks(): void {
  try {
    hookFetch();
    log('info', 'Fetch hooks installed successfully');
  } catch (error) {
    log('error', 'Fetch hook installation failed: ' + String(error));
  }
}
