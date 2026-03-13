/**
 * Background Service Worker Entry Point
 */

import { setupTabListeners } from './tabs';
import { setupMessageRouter } from './messages';
import { setupContextMenu, setupContextMenuListener } from './context-menu';

const TAG = '[autofill Background]';

console.log(TAG, 'Initializing...');

function syncContextMenuState(): void {
  chrome.storage.local.get(['pluginEnabled', 'contextMenuEnabled'], (result) => {
    const pluginEnabled = result.pluginEnabled !== false;
    const contextMenuEnabled = result.contextMenuEnabled !== false;

    if (pluginEnabled && contextMenuEnabled) {
      setupContextMenu();
      return;
    }

    chrome.contextMenus.removeAll();
  });
}

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
    syncContextMenuState();
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

  setupSidePanel();
  syncContextMenuState();
  setupTabListeners();
  setupMessageRouter();
  setupContextMenuListener();
  handleInstall();
  handleActionClick();

  console.log(TAG, 'Background service worker initialized');
}

initialize();
