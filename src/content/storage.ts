/**
 * Chrome Storage Manager for Content Script
 */

import { STORAGE_KEYS, DEFAULTS } from './constants';
import type { PluginState } from './types';

/**
 * Storage manager class
 */
export class StorageManager {
  private state: PluginState = { ...DEFAULTS };
  private listeners: Set<(state: PluginState) => void> = new Set();

  /**
   * Initialize storage manager
   */
  async initialize(): Promise<void> {
    // Load initial state from storage
    const result = await chrome.storage.local.get(Object.values(STORAGE_KEYS));

    this.state = {
      enabled: result[STORAGE_KEYS.PLUGIN_ENABLED] ?? DEFAULTS.PLUGIN_ENABLED,
      autoDetect: result[STORAGE_KEYS.AUTO_DETECT] ?? DEFAULTS.AUTO_DETECT,
      floatingButton: result[STORAGE_KEYS.FLOATING_BUTTON] ?? DEFAULTS.FLOATING_BUTTON,
      contextMenu: result[STORAGE_KEYS.CONTEXT_MENU] ?? DEFAULTS.CONTEXT_MENU,
    };

    // Listen for storage changes
    chrome.storage.onChanged.addListener((changes, areaName) => {
      if (areaName === 'local') {
        this.handleStorageChanges(changes);
      }
    });

    console.log('[Content Storage] Initialized with state:', this.state);
  }

  /**
   * Handle storage changes
   */
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

  /**
   * Get current state
   */
  getState(): PluginState {
    return { ...this.state };
  }

  /**
   * Check if plugin is enabled
   */
  isEnabled(): boolean {
    return this.state.enabled;
  }

  /**
   * Check if auto-detect is enabled
   */
  isAutoDetectEnabled(): boolean {
    return this.state.autoDetect && this.state.enabled;
  }

  /**
   * Check if floating button should be shown
   */
  showFloatingButton(): boolean {
    return this.state.floatingButton && this.state.enabled;
  }

  /**
   * Update state value
   */
  async update<K extends keyof PluginState>(key: K, value: PluginState[K]): Promise<void> {
    const storageKey = STORAGE_KEYS[key.toUpperCase() as keyof typeof STORAGE_KEYS];

    await chrome.storage.local.set({
      [storageKey]: value,
    });
  }

  /**
   * Subscribe to state changes
   */
  subscribe(listener: (state: PluginState) => void): () => void {
    this.listeners.add(listener);

    // Return unsubscribe function
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Notify all listeners of state change
   */
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

// Singleton instance
let storageInstance: StorageManager | null = null;

/**
 * Get storage manager singleton
 */
export function getStorageManager(): StorageManager {
  if (!storageInstance) {
    storageInstance = new StorageManager();
  }
  return storageInstance;
}
