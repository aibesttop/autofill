/**
 * Authentication module for OAuth flow
 */

import { API_BASE_URL, API_ENDPOINT, STORAGE_KEYS } from '@shared/constants';
import { LOCAL_TEST_AUTH_TOKEN, LOCAL_TEST_MODE } from '@shared/testing/local-test';

export interface AuthToken {
  access_token: string;
  client_id: string;
  token_type: string;
}

/**
 * Save auth token to chrome.storage.local
 */
export async function saveToken(token: AuthToken): Promise<void> {
  try {
    await chrome.storage.local.set({ [STORAGE_KEYS.AUTH_TOKEN]: token });
  } catch (error) {
    console.error('[Auth] Failed to save token:', error);
  }
}

/**
 * Get auth token from chrome.storage.local
 */
export async function getToken(): Promise<AuthToken | null> {
  if (LOCAL_TEST_MODE) {
    return LOCAL_TEST_AUTH_TOKEN;
  }

  try {
    const result = await chrome.storage.local.get(STORAGE_KEYS.AUTH_TOKEN);
    const token = result[STORAGE_KEYS.AUTH_TOKEN];
    return token?.access_token ? token : null;
  } catch (error) {
    console.error('[Auth] Failed to get token:', error);
    return null;
  }
}

/**
 * Get or create client ID
 */
export function getOrCreateClientId(): string {
  const clientId = generateClientId();
  saveClientIdToStorage(clientId);
  return clientId;
}

function generateClientId(): string {
  try {
    return crypto.randomUUID?.() ?? generateFallbackId();
  } catch {
    return generateFallbackId();
  }
}

function generateFallbackId(): string {
  const values = crypto.getRandomValues(new Uint32Array(4));
  return Array.from(values).join('');
}

function saveClientIdToStorage(clientId: string): void {
  try {
    chrome.storage.local.set({ [STORAGE_KEYS.CLIENT_ID]: clientId });
  } catch {
    // Ignore storage errors
  }
}

/**
 * Start OAuth authentication flow
 */
export class AuthFlow {
  private isActive = false;
  private authTabId: number | null = null;
  private pollingTimer: ReturnType<typeof setTimeout> | null = null;

  async start(): Promise<void> {
    if (this.isActive) {
      return;
    }

    this.isActive = true;
    this.stopPolling();

    try {
      const clientId = getOrCreateClientId();
      const authUrl = `${API_BASE_URL}/auth/signin?client_id=${encodeURIComponent(clientId)}&redirect_uri=chrome`;

      // Open OAuth tab
      const tab = await chrome.tabs.create({ url: authUrl, active: true });
      this.authTabId = tab?.id ?? null;

      // Start polling for token
      await this.pollForToken(clientId);
    } catch (error) {
      console.error('[AuthFlow] Error during auth flow:', error);
      this.stop();
    }
  }

  private async pollForToken(clientId: string): Promise<void> {
    const poll = async (): Promise<void> => {
      try {
        const response = await fetch(
          `${API_ENDPOINT}/auth/client?client_id=${encodeURIComponent(clientId)}`
        );

        if (response.ok) {
          const data = await response.json();

          if (data?.code === 0 && data.data?.access_token) {
            const token: AuthToken = {
              client_id: data.data.client_id,
              access_token: data.data.access_token,
              token_type: data.data.token_type || 'Bearer',
            };

            await saveToken(token);

            chrome.runtime.sendMessage({
              type: 'auth.success',
              payload: token,
            }).catch(() => {});

            if (this.authTabId !== null) {
              try {
                chrome.tabs.remove(this.authTabId);
              } catch {
                // Tab may already be closed
              }
            }

            this.stop();
            return;
          }
        }
      } catch (error) {
        console.error('[AuthFlow] Polling error:', error);
      }

      // Continue polling
      this.pollingTimer = setTimeout(poll, 3000);
    };

    await poll();
  }

  private stopPolling(): void {
    if (this.pollingTimer !== null) {
      clearTimeout(this.pollingTimer);
      this.pollingTimer = null;
    }
  }

  stop(): void {
    this.stopPolling();
    this.isActive = false;
  }
}

// Singleton instance
let authFlowInstance: AuthFlow | null = null;

export function startAuthFlow(): void {
  if (LOCAL_TEST_MODE) {
    void saveToken(LOCAL_TEST_AUTH_TOKEN);
    chrome.runtime.sendMessage({
      type: 'auth.success',
      payload: LOCAL_TEST_AUTH_TOKEN,
    }).catch(() => {});
    return;
  }

  if (!authFlowInstance) {
    authFlowInstance = new AuthFlow();
  }
  authFlowInstance.start();
}
