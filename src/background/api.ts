/**
 * API client module
 */

import { API_ENDPOINT } from '@shared/constants';
import type { AuthToken, Website } from '@shared/types';
import { getToken } from './auth';

/**
 * Fetch websites from the API
 */
export async function fetchWebsites(): Promise<Website[]> {
  try {
    console.log('[autofill Background] Getting websites...');

    const token = await getToken();
    console.log('[autofill Background] Token:', token ? 'exists' : 'null');

    if (!token) {
      return [];
    }

    const url = `${API_ENDPOINT}/websites`;
    console.log('[autofill Background] Fetching from:', url);

    const response = await fetch(url, {
      headers: {
        Authorization: `${token.token_type} ${token.access_token}`,
      },
    });

    console.log('[autofill Background] Response status:', response.status);

    if (!response.ok) {
      console.error('[autofill Background] Response not ok:', response.status);
      return [];
    }

    const data = await response.json();
    console.log('[autofill Background] Response data:', data);

    const websites = data.data?.list || data.data || [];
    console.log('[autofill Background] Websites count:', websites.length);

    return websites;
  } catch (error) {
    console.error('[autofill Background] Error:', error);
    return [];
  }
}

/**
 * Fetch an image and convert to data URL
 */
export async function fetchImageAsDataUrl(url: string): Promise<{ dataUrl?: string; error?: string }> {
  try {
    if (!url) {
      return { error: 'No URL provided' };
    }

    const response = await fetch(url);

    if (!response.ok) {
      return { error: `Failed to fetch: ${response.status}` };
    }

    const blob = await response.blob();
    const reader = new FileReader();

    return new Promise((resolve) => {
      reader.onloadend = () => {
        resolve({ dataUrl: reader.result as string });
      };
      reader.onerror = () => {
        resolve({ error: 'Failed to read blob' });
      };
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    return { error: String(error) };
  }
}
