/**
 * Message router for background service worker
 */

import { injectPageController } from './tabs';
import { handleTabControl } from './tabs';
import { startAuthFlow } from './auth';
import { fetchWebsites, fetchImageAsDataUrl } from './api';
import { setupContextMenu, removeContextMenu } from './context-menu';
import { STORAGE_KEYS } from '@shared/constants';
import type { ExtensionMessage } from '@shared/types';

// Track tabs with open side panels
const openSidePanelTabs = new Set<number>();

/**
 * Handle PAGE_CONTROL messages
 * Injects page controller and forwards message to content script
 */
function handlePageControl(
  message: any,
  sender: chrome.runtime.MessageSender,
  sendResponse: (response?: any) => void
): boolean {
  const { action, payload, targetTabId } = message;

  // Special case: get_my_tab_id
  if (action === 'get_my_tab_id') {
    sendResponse({ tabId: sender?.tab?.id ?? null });
    return false;
  }

  if (!targetTabId) {
    sendResponse({ success: false, error: 'Missing targetTabId' });
    return false;
  }

  // Inject page controller and send message
  injectPageController(targetTabId)
    .then(() => chrome.tabs.sendMessage(targetTabId, { type: 'PAGE_CONTROL', action, payload }))
    .then((response) => sendResponse(response))
    .catch((error) => {
      sendResponse({ success: false, error: error.message });
    });

  return true; // Async response
}

/**
 * Handle x:open-panel messages (open side panel)
 */
function handleOpenSidePanel(
  sender: chrome.runtime.MessageSender,
  sendResponse: (response?: any) => void
): boolean {
  const tabId = sender?.tab?.id;
  const windowId = sender?.tab?.windowId;

  (async () => {
    try {
      if (!chrome.sidePanel) {
        sendResponse({ ok: false, error: 'Side panel not supported' });
        return;
      }

      // Check if already open
      if (tabId && openSidePanelTabs.has(tabId)) {
        sendResponse({ ok: true, action: 'already_open' });
        return;
      }

      // Open side panel
      if (chrome.sidePanel.open) {
        if (tabId) {
          await chrome.sidePanel.open({ tabId });
          openSidePanelTabs.add(tabId);

          // Notify content script
          try {
            chrome.tabs.sendMessage(tabId, { type: 'sidepanel:toggle', open: true });
          } catch {}
        } else if (windowId) {
          await chrome.sidePanel.open({ windowId });
        }

        sendResponse({ ok: true, action: 'opened' });
      } else {
        sendResponse({ ok: false, error: 'Side panel API not available' });
      }
    } catch (error) {
      console.warn('Failed to toggle side panel', error);
      sendResponse({ ok: false, error: String(error) });
    }
  })();

  return true; // Async response
}

/**
 * Handle contextMenu:toggle messages
 */
function handleToggleContextMenu(
  message: any,
  sendResponse: (response?: any) => void
): boolean {
  const enabled = message?.enabled !== false;

  chrome.storage.local.set({ contextMenuEnabled: enabled });

  chrome.storage.local.get(['pluginEnabled'], (result) => {
    const pluginEnabled = result.pluginEnabled !== false;

    if (pluginEnabled) {
      setupContextMenu();
    } else {
      removeContextMenu();
    }

    sendResponse({ ok: true });
  });

  return true; // Async response
}

/**
 * Handle plugin:toggle messages
 */
function handleTogglePlugin(
  message: any,
  sendResponse: (response?: any) => void
): boolean {
  const enabled = message?.enabled !== false;

  chrome.storage.local.set({ pluginEnabled: enabled });

  chrome.storage.local.get(['contextMenuEnabled'], (result) => {
    const contextMenuEnabled = result.contextMenuEnabled === true;

    if (enabled && contextMenuEnabled) {
      setupContextMenu();
    } else {
      removeContextMenu();
    }

    // Broadcast to all tabs
    chrome.tabs.query({}, (tabs) => {
      tabs.forEach((tab) => {
        if (tab?.id) {
          try {
            chrome.tabs.sendMessage(tab.id, { type: 'plugin:toggle', enabled }, () => {
              // Ignore lastError
              void chrome.runtime.lastError;
            });
          } catch {}
        }
      });
    });

    sendResponse({ ok: true });
  });

  return true; // Async response
}

/**
 * Handle autoDetect:toggle messages
 */
function handleToggleAutoDetect(
  message: any,
  sendResponse: (response?: any) => void
): boolean {
  const enabled = message?.enabled !== false;

  chrome.storage.local.set({ autoDetect: enabled });

  // Broadcast to all tabs
  chrome.tabs.query({}, (tabs) => {
    tabs.forEach((tab) => {
      if (tab?.id) {
        try {
          chrome.tabs.sendMessage(tab.id, { type: 'autoDetect:toggle', enabled }, () => {
            void chrome.runtime.lastError;
          });
        } catch {}
      }
    });
  });

  sendResponse({ ok: true });
  return false; // Sync response
}

/**
 * Handle getWebsites messages
 */
function handleGetWebsites(sendResponse: (response?: any) => void): boolean {
  fetchWebsites().then((websites) => {
    sendResponse({ websites });
  });

  return true; // Async response
}

/**
 * Handle fetchImage messages
 */
function handleFetchImage(message: any, sendResponse: (response?: any) => void): boolean {
  const { url } = message;

  if (!url) {
    sendResponse({ error: 'No URL provided' });
    return false;
  }

  fetchImageAsDataUrl(url).then((result) => {
    sendResponse(result);
  });

  return true; // Async response
}

/**
 * Main message router
 */
export function setupMessageRouter(): void {
  chrome.runtime.onMessage.addListener(
    (message: ExtensionMessage, sender: chrome.runtime.MessageSender, sendResponse) => {
      const type = message?.type;
      if (!type) return false;

      switch (type) {
        case 'TAB_CONTROL':
          return handleTabControl(message, sender, sendResponse);

        case 'PAGE_CONTROL':
          return handlePageControl(message, sender, sendResponse);

        case 'auth.start':
          startAuthFlow();
          try {
            sendResponse?.({ ok: true });
          } catch {}
          return true;

        case 'x:open-panel':
          return handleOpenSidePanel(sender, sendResponse);

        case 'contextMenu:toggle':
          return handleToggleContextMenu(message, sendResponse);

        case 'plugin:toggle':
          return handleTogglePlugin(message, sendResponse);

        case 'autoDetect:toggle':
          return handleToggleAutoDetect(message, sendResponse);

        case 'getWebsites':
          return handleGetWebsites(sendResponse);

        case 'fetchImage':
          return handleFetchImage(message, sendResponse);

        default:
          console.warn('[Background] Unknown message type:', type);
          return false;
      }
    }
  );
}
