/**
 * Authentication Hook
 */

import { useState, useEffect } from 'react';
import type { AuthState } from '../types/ui';

const TOKEN_KEY = 'auth.token';

export function useAuth() {
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    token: null,
    user: null,
    isLoading: true,
    error: null,
  });

  useEffect(() => {
    loadAuthState();
  }, []);

  const loadAuthState = async () => {
    try {
      const result = await chrome.storage.local.get(TOKEN_KEY);
      const token = result[TOKEN_KEY];

      if (token) {
        setAuthState({
          isAuthenticated: true,
          token: token.access_token,
          user: { id: token.client_id },
          isLoading: false,
          error: null,
        });
      } else {
        setAuthState((prev) => ({ ...prev, isLoading: false }));
      }
    } catch {
      setAuthState({
        isAuthenticated: false,
        token: null,
        user: null,
        isLoading: false,
        error: 'Failed to load auth state',
      });
    }
  };

  const login = async () => {
    setAuthState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      await chrome.runtime.sendMessage({ type: 'auth.start' });

      return new Promise<void>((resolve, reject) => {
        const listener = (message: any) => {
          if (message.type === 'auth.success') {
            chrome.runtime.onMessage.removeListener(listener);
            loadAuthState().then(() => resolve());
          }
        };

        chrome.runtime.onMessage.addListener(listener);

        setTimeout(() => {
          chrome.runtime.onMessage.removeListener(listener);
          reject(new Error('Login timeout'));
        }, 120000);
      });
    } catch (error) {
      setAuthState({
        isAuthenticated: false,
        token: null,
        user: null,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Login failed',
      });
      throw error;
    }
  };

  const logout = async () => {
    try {
      await chrome.storage.local.remove(TOKEN_KEY);
      setAuthState({
        isAuthenticated: false,
        token: null,
        user: null,
        isLoading: false,
        error: null,
      });
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return {
    ...authState,
    login,
    logout,
    refresh: loadAuthState,
  };
}
