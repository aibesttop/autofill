/**
 * Chrome Storage Manager for Content Script
 */

import { STORAGE_KEYS, DEFAULTS } from './constants';
import type { PluginState } from './types';

export class StorageManager {
  private state: PluginState = {
    enabled: DEFAULTS.PLUGIN_ENABLED,
    autoDetect: DEFAULTS.AUTO_DETECT,
    floatingButton: DEFAULTS.FLOATING_BUTTON,
    contextMenu: DEFAULTS.CONTEXT_MENU,
  };
  private listeners: Set<(state: PluginState) => void> = new Set();

  async initialize(): Promise<void> {
    const result = await chrome.storage.local.get(Object.values(STORAGE_KEYS));

    this.state = {
      enabled: result[STORAGE_KEYS.PLUGIN_ENABLED] ?? DEFAULTS.PLUGIN_ENABLED,
      autoDetect: result[STORAGE_KEYS.AUTO_DETECT] ?? DEFAULTS.AUTO_DETECT,
      floatingButton: result[STORAGE_KEYS.FLOATING_BUTTON] ?? DEFAULTS.FLOATING_BUTTON,
      contextMenu: result[STORAGE_KEYS.CONTEXT_MENU] ?? DEFAULTS.CONTEXT_MENU,
    };

    chrome.storage.onChanged.addListener((changes, areaName) => {
      if (areaName === 'local') {
        this.handleStorageChanges(changes);
      }
    });

    console.log('[Content Storage] Initialized with state:', this.state);
  }

  private handleStorageChanges(changes: { [key: string]: chrome.storage.StorageChange }): void {
    let changed = false;

    if (changes[STORAGE_KEYS.PLUGIN_ENABLED]) {
      this.state.enabled = changes[STORAGE_KEYS.PLUGIN_ENABLED].newValue ?? DEFAULTS.PLUGIN_ENABLED;
      changed = true;
    }

    if (changes[STORAGE_KEYS.AUTO_DETECT]) {
      this.state.autoDetect = changes[STORAGE_KEYS.AUTO_DETECT].newValue ?? DEFAULTS.AUTO_DETECT;
      changed = true;
    }

    if (changes[STORAGE_KEYS.FLOATING_BUTTON]) {
      this.state.floatingButton =
        changes[STORAGE_KEYS.FLOATING_BUTTON].newValue ?? DEFAULTS.FLOATING_BUTTON;
      changed = true;
    }

    if (changes[STORAGE_KEYS.CONTEXT_MENU]) {
      this.state.contextMenu =
        changes[STORAGE_KEYS.CONTEXT_MENU].newValue ?? DEFAULTS.CONTEXT_MENU;
      changed = true;
    }

    if (changed) {
      this.notifyListeners();
    }
  }

  getState(): PluginState {
    return { ...this.state };
  }

  isEnabled(): boolean {
    return this.state.enabled;
  }

  isAutoDetectEnabled(): boolean {
    return this.state.autoDetect && this.state.enabled;
  }

  showFloatingButton(): boolean {
    return this.state.floatingButton && this.state.enabled;
  }

  async update<K extends keyof PluginState>(key: K, value: PluginState[K]): Promise<void> {
    const keyMap: Record<string, string> = {
      enabled: STORAGE_KEYS.PLUGIN_ENABLED,
      autoDetect: STORAGE_KEYS.AUTO_DETECT,
      floatingButton: STORAGE_KEYS.FLOATING_BUTTON,
      contextMenu: STORAGE_KEYS.CONTEXT_MENU,
    };

    const storageKey = keyMap[key];
    if (storageKey) {
      await chrome.storage.local.set({ [storageKey]: value });
    }
  }

  subscribe(listener: (state: PluginState) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners(): void {
    const state = this.getState();
    this.listeners.forEach((listener) => {
      try {
        listener(state);
      } catch (error) {
        console.error('[Content Storage] Listener error:', error);
      }
    });
  }
}

let storageInstance: StorageManager | null = null;

export function getStorageManager(): StorageManager {
  if (!storageInstance) {
    storageInstance = new StorageManager();
  }
  return storageInstance;
}
