/**
 * Fetch API hook for intercepting network requests
 */

import { shouldCaptureUrl, normalizeUrl } from './url-utils';
import { captureResponse, log } from './messenger';

export function hookFetch(): void {
  const originalFetch = window.fetch;

  window.fetch = function (
    input: RequestInfo | URL,
    init?: RequestInit
  ): Promise<Response> {
    const requestUrl = typeof input === 'string'
      ? input
      : input instanceof URL
        ? input.toString()
        : (input as Request).url;

    return originalFetch.apply(window, [input, init]).then((response) => {
      try {
        if (!shouldCaptureUrl(requestUrl)) return response;

        const clonedResponse = response.clone();

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

export function installFetchHooks(): void {
  try {
    hookFetch();
    log('info', 'Fetch hooks installed successfully');
  } catch (error) {
    log('error', 'Fetch hook installation failed: ' + String(error));
  }
}
