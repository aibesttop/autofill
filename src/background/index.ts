/**
 * Background Service Worker Entry Point
 * Main initialization and event listener setup
 */

import { setupTabListeners } from './tabs';
import { setupMessageRouter } from './messages';
import { setupContextMenu, setupContextMenuListener } from './context-menu';
import { STORAGE_KEYS } from '@shared/constants';

const TAG = '[autofill Background]';

console.log(TAG, 'Initializing...');

/**
 * Setup side panel behavior
 */
function setupSidePanel(): void {
  try {
    if (chrome.sidePanel?.setPanelBehavior) {
      chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
    }
  } catch (error) {
    console.warn(TAG, 'Failed to set side panel behavior:', error);
  }
}

/**
 * Handle extension installation/update
 */
function handleInstall(): void {
  chrome.runtime.onInstalled.addListener(() => {
    console.log(TAG, 'Extension installed/updated');

    setupSidePanel();

    // Initialize settings from storage
    chrome.storage.local.get(['pluginEnabled', 'contextMenuEnabled'], (result) => {
      const pluginEnabled = result.pluginEnabled !== false;
      const contextMenuEnabled = result.contextMenuEnabled === true;

      // Setup context menu if plugin is enabled and context menu is enabled
      if (pluginEnabled && contextMenuEnabled) {
        setupContextMenu();
      }
    });
  });
}

/**
 * Handle extension icon click
 */
function handleActionClick(): void {
  chrome.action.onClicked.addListener(async (tab) => {
    console.log(TAG, 'Extension icon clicked, opening side panel');

    try {
      if (chrome.sidePanel?.open) {
        if (tab?.id) {
          await chrome.sidePanel.open({ tabId: tab.id });
        } else if (tab?.windowId) {
          await chrome.sidePanel.open({ windowId: tab.windowId });
        }
      }
    } catch (error) {
      console.warn(TAG, 'Failed to open side panel from action click:', error);
    }
  });
}

/**
 * Initialize background service worker
 */
function initialize(): void {
  console.log(TAG, 'Setting up event listeners...');

  // Setup tab change listeners
  setupTabListeners();

  // Setup message router
  setupMessageRouter();

  // Setup context menu
  setupContextMenuListener();

  // Setup install handler
  handleInstall();

  // Setup action click handler
  handleActionClick();

  console.log(TAG, 'Background service worker initialized');
}

// Start initialization
initialize();
