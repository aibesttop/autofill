import { useEffect, useState } from 'react';
import { STORAGE_KEYS } from '@shared/constants';

export interface ExtensionSettingsState {
  enabled: boolean;
  autoDetect: boolean;
  showFloatingButton: boolean;
  contextMenu: boolean;
  isLoading: boolean;
  error: string | null;
}

const DEFAULT_SETTINGS = {
  enabled: true,
  autoDetect: false,
  showFloatingButton: true,
  contextMenu: true,
} satisfies Omit<ExtensionSettingsState, 'isLoading' | 'error'>;

async function readSettings(): Promise<Omit<ExtensionSettingsState, 'isLoading' | 'error'>> {
  const result = await chrome.storage.local.get([
    STORAGE_KEYS.PLUGIN_ENABLED,
    STORAGE_KEYS.AUTO_DETECT,
    STORAGE_KEYS.FLOATING_BUTTON,
    STORAGE_KEYS.CONTEXT_MENU_ENABLED,
  ]);

  return {
    enabled: result[STORAGE_KEYS.PLUGIN_ENABLED] ?? DEFAULT_SETTINGS.enabled,
    autoDetect: result[STORAGE_KEYS.AUTO_DETECT] ?? DEFAULT_SETTINGS.autoDetect,
    showFloatingButton: result[STORAGE_KEYS.FLOATING_BUTTON] ?? DEFAULT_SETTINGS.showFloatingButton,
    contextMenu: result[STORAGE_KEYS.CONTEXT_MENU_ENABLED] ?? DEFAULT_SETTINGS.contextMenu,
  };
}

export function useExtensionSettings() {
  const [state, setState] = useState<ExtensionSettingsState>({
    ...DEFAULT_SETTINGS,
    isLoading: true,
    error: null,
  });

  useEffect(() => {
    let isMounted = true;

    void readSettings()
      .then((settings) => {
        if (isMounted) {
          setState({ ...settings, isLoading: false, error: null });
        }
      })
      .catch(() => {
        if (isMounted) {
          setState((prev) => ({
            ...prev,
            isLoading: false,
            error: 'Failed to load extension settings',
          }));
        }
      });

    const handleStorageChange = (
      changes: Record<string, chrome.storage.StorageChange>,
      areaName: string
    ) => {
      if (areaName !== 'local' || !isMounted) {
        return;
      }

      const nextState: Partial<ExtensionSettingsState> = {};
      let hasChanges = false;

      if (changes[STORAGE_KEYS.PLUGIN_ENABLED]) {
        nextState.enabled = changes[STORAGE_KEYS.PLUGIN_ENABLED].newValue ?? DEFAULT_SETTINGS.enabled;
        hasChanges = true;
      }

      if (changes[STORAGE_KEYS.AUTO_DETECT]) {
        nextState.autoDetect =
          changes[STORAGE_KEYS.AUTO_DETECT].newValue ?? DEFAULT_SETTINGS.autoDetect;
        hasChanges = true;
      }

      if (changes[STORAGE_KEYS.FLOATING_BUTTON]) {
        nextState.showFloatingButton =
          changes[STORAGE_KEYS.FLOATING_BUTTON].newValue ?? DEFAULT_SETTINGS.showFloatingButton;
        hasChanges = true;
      }

      if (changes[STORAGE_KEYS.CONTEXT_MENU_ENABLED]) {
        nextState.contextMenu =
          changes[STORAGE_KEYS.CONTEXT_MENU_ENABLED].newValue ?? DEFAULT_SETTINGS.contextMenu;
        hasChanges = true;
      }

      if (hasChanges) {
        setState((prev) => ({
          ...prev,
          ...nextState,
          isLoading: false,
        }));
      }
    };

    chrome.storage.onChanged.addListener(handleStorageChange);

    return () => {
      isMounted = false;
      chrome.storage.onChanged.removeListener(handleStorageChange);
    };
  }, []);

  const refresh = async () => {
    try {
      const settings = await readSettings();
      setState({ ...settings, isLoading: false, error: null });
    } catch {
      setState((prev) => ({ ...prev, isLoading: false, error: 'Failed to refresh settings' }));
    }
  };

  const withRuntimeToggle = async (
    nextValue: boolean,
    optimisticUpdate: Partial<ExtensionSettingsState>,
    messageType: string,
    errorMessage: string
  ) => {
    setState((prev) => ({ ...prev, ...optimisticUpdate, error: null }));

    try {
      await chrome.runtime.sendMessage({ type: messageType, enabled: nextValue });
    } catch {
      await refresh();
      setState((prev) => ({ ...prev, error: errorMessage }));
    }
  };

  const togglePlugin = async (enabled: boolean) => {
    await withRuntimeToggle(
      enabled,
      { enabled },
      'plugin:toggle',
      'Failed to update plugin status'
    );
  };

  const toggleAutoDetect = async (enabled: boolean) => {
    await withRuntimeToggle(
      enabled,
      { autoDetect: enabled },
      'autoDetect:toggle',
      'Failed to update auto-detect'
    );
  };

  const toggleContextMenu = async (enabled: boolean) => {
    await withRuntimeToggle(
      enabled,
      { contextMenu: enabled },
      'contextMenu:toggle',
      'Failed to update context menu'
    );
  };

  const toggleFloatingButton = async (enabled: boolean) => {
    setState((prev) => ({ ...prev, showFloatingButton: enabled, error: null }));

    try {
      await chrome.storage.local.set({ [STORAGE_KEYS.FLOATING_BUTTON]: enabled });
    } catch {
      await refresh();
      setState((prev) => ({ ...prev, error: 'Failed to update floating button preference' }));
    }
  };

  return {
    settings: {
      enabled: state.enabled,
      autoDetect: state.autoDetect,
      showFloatingButton: state.showFloatingButton,
      contextMenu: state.contextMenu,
    },
    isLoading: state.isLoading,
    error: state.error,
    refresh,
    togglePlugin,
    toggleAutoDetect,
    toggleContextMenu,
    toggleFloatingButton,
  };
}
