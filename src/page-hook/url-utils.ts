/**
 * URL utilities for filtering and normalizing URLs
 */

export function normalizeUrl(input: string | URL | undefined): string {
  if (!input) return '';

  try {
    return new URL(input, window.location.href).toString();
  } catch {
    return String(input);
  }
}

export function shouldCaptureUrl(url: string | undefined): boolean {
  if (!url) return false;

  const urlStr = String(url);

  if (/\/dm\//i.test(urlStr)) return true;
  if (/\/graphql\/[^/]+\//i.test(urlStr)) return true;

  return false;
}

export function extractUrl(xhrOrUrl: XMLHttpRequest | string | URL | undefined): string {
  if (typeof xhrOrUrl === 'string') return xhrOrUrl;
  if (xhrOrUrl instanceof URL) return xhrOrUrl.toString();
  if (xhrOrUrl instanceof XMLHttpRequest) {
    return (xhrOrUrl as any).__xUrl || xhrOrUrl.responseURL;
  }
  return '';
}
