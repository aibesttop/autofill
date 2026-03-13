/**
 * Authentication Hook
 */

import { useEffect, useState } from 'react';
import { LOCAL_TEST_AUTH_TOKEN, LOCAL_TEST_MODE } from '@shared/testing/local-test';
import type { AuthState } from '../types/ui';

const TOKEN_KEY = 'auth.token';

function getUnauthenticatedState(error: string | null = null): AuthState {
  return {
    isAuthenticated: false,
    token: null,
    user: null,
    isLoading: false,
    error,
  };
}

function getStateFromToken(token: any): AuthState {
  if (LOCAL_TEST_MODE) {
    return {
      isAuthenticated: true,
      token: LOCAL_TEST_AUTH_TOKEN.access_token,
      user: {
        id: LOCAL_TEST_AUTH_TOKEN.client_id,
        name: 'Local Test Mode',
      },
      isLoading: false,
      error: null,
    };
  }

  if (token?.access_token) {
    return {
      isAuthenticated: true,
      token: token.access_token,
      user: { id: token.client_id },
      isLoading: false,
      error: null,
    };
  }

  return getUnauthenticatedState();
}

async function readAuthState(): Promise<AuthState> {
  try {
    const result = await chrome.storage.local.get(TOKEN_KEY);
    return getStateFromToken(result[TOKEN_KEY]);
  } catch {
    return getUnauthenticatedState('Failed to load auth state');
  }
}

export function useAuth() {
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    token: null,
    user: null,
    isLoading: true,
    error: null,
  });

  useEffect(() => {
    let isMounted = true;

    void readAuthState().then((nextState) => {
      if (isMounted) {
        setAuthState(nextState);
      }
    });

    const handleStorageChange = (
      changes: Record<string, chrome.storage.StorageChange>,
      areaName: string
    ) => {
      if (areaName !== 'local' || !changes[TOKEN_KEY] || !isMounted) {
        return;
      }

      setAuthState(getStateFromToken(changes[TOKEN_KEY].newValue));
    };

    chrome.storage.onChanged.addListener(handleStorageChange);

    return () => {
      isMounted = false;
      chrome.storage.onChanged.removeListener(handleStorageChange);
    };
  }, []);

  const refresh = async () => {
    const nextState = await readAuthState();
    setAuthState(nextState);
  };

  const login = async () => {
    if (LOCAL_TEST_MODE) {
      setAuthState(getStateFromToken(LOCAL_TEST_AUTH_TOKEN));
      return;
    }

    setAuthState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      await chrome.runtime.sendMessage({ type: 'auth.start' });

      await new Promise<void>((resolve, reject) => {
        let settled = false;

        const listener = (message: any) => {
          if (message?.type !== 'auth.success' || settled) {
            return;
          }

          settled = true;
          chrome.runtime.onMessage.removeListener(listener);
          window.clearTimeout(timeoutId);

          void readAuthState()
            .then((nextState) => {
              setAuthState(nextState);
              resolve();
            })
            .catch(() => {
              const errorMessage = 'Failed to load auth state';
              setAuthState(getUnauthenticatedState(errorMessage));
              reject(new Error(errorMessage));
            });
        };

        const timeoutId = window.setTimeout(() => {
          if (settled) return;
          settled = true;
          chrome.runtime.onMessage.removeListener(listener);
          setAuthState((prev) => ({ ...prev, isLoading: false, error: 'Login timeout' }));
          reject(new Error('Login timeout'));
        }, 120000);

        chrome.runtime.onMessage.addListener(listener);
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Login failed';
      setAuthState(getUnauthenticatedState(message));
      throw error instanceof Error ? error : new Error(message);
    }
  };

  const logout = async () => {
    if (LOCAL_TEST_MODE) {
      setAuthState(getStateFromToken(LOCAL_TEST_AUTH_TOKEN));
      return;
    }

    try {
      await chrome.storage.local.remove(TOKEN_KEY);
      setAuthState(getUnauthenticatedState());
    } catch (error) {
      console.error('Logout error:', error);
      setAuthState((prev) => ({ ...prev, error: 'Failed to log out' }));
    }
  };

  return {
    ...authState,
    login,
    logout,
    refresh,
  };
}
