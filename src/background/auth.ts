/**
 * Authentication module for OAuth flow
 */

import { API_BASE_URL, API_ENDPOINT, STORAGE_KEYS } from '@shared/constants';

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
 * Uses localStorage first, falls back to chrome.storage.local
 */
export function getOrCreateClientId(): string {
  const clientId = tryGetClientIdFromLocalStorage() || generateClientId();
  saveClientIdToStorages(clientId);
  return clientId;
}

function tryGetClientIdFromLocalStorage(): string | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.CLIENT_ID);
    if (stored) return stored;
  } catch {}
  return null;
}

function generateClientId(): string {
  try {
    // Try crypto.randomUUID() first, fall back to random values
    return crypto.randomUUID?.() ?? generateFallbackId();
  } catch {
    return generateFallbackId();
  }
}

function generateFallbackId(): string {
  const values = crypto.getRandomValues(new Uint32Array(4));
  return Array.from(values).join('');
}

function saveClientIdToStorages(clientId: string): void {
  try {
    localStorage.setItem(STORAGE_KEYS.CLIENT_ID, clientId);
  } catch {}
  try {
    chrome.storage.local.set({ [STORAGE_KEYS.CLIENT_ID]: clientId });
  } catch {}
}

/**
 * Start OAuth authentication flow
 * Opens a new tab with OAuth URL and polls for token
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
      this.authTabId = await new Promise<number>((resolve) => {
        chrome.tabs.create({ url: authUrl, active: true }, (tab) => {
          resolve(tab?.id ?? 0);
        });
      });

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

            // Save token
            await saveToken(token);

            // Notify all listeners
            chrome.runtime.sendMessage({
              type: 'auth.success',
              payload: token,
            }).catch(() => {});

            // Close auth tab
            if (this.authTabId !== null) {
              try {
                chrome.tabs.remove(this.authTabId);
              } catch {}
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
  if (!authFlowInstance) {
    authFlowInstance = new AuthFlow();
  }
  authFlowInstance.start();
}
