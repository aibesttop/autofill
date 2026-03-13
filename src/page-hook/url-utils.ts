/**
 * URL utilities for filtering and normalizing URLs
 */

/**
 * Normalize URL to absolute URL string
 */
export function normalizeUrl(input: string | URL | undefined): string {
  if (!input) {
    return '';
  }

  try {
    return new URL(input, window.location.href).toString();
  } catch {
    return String(input);
  }
}

/**
 * Check if URL should be captured
 * Targets Twitter/X DM endpoints and GraphQL queries
 */
export function shouldCaptureUrl(url: string | undefined): boolean {
  if (!url) {
    return false;
  }

  const urlStr = String(url);

  // Capture DM endpoints
  if (/\/dm\//i.test(urlStr)) {
    return true;
  }

  // Capture GraphQL queries
  if (/\/graphql\/[^/]+\//i.test(urlStr)) {
    return true;
  }

  return false;
}

/**
 * Extract URL from XHR or fetch request
 */
export function extractUrl(xhrOrUrl: XMLHttpRequest | string | URL | undefined): string {
  if (typeof xhrOrUrl === 'string') {
    return xhrOrUrl;
  }

  if (xhrOrUrl instanceof URL) {
    return xhrOrUrl.toString();
  }

  if (xhrOrUrl instanceof XMLHttpRequest) {
    return (xhrOrUrl as any).__xUrl || xhrOrUrl.responseURL;
  }

  return '';
}
