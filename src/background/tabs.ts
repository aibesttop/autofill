/**
 * Tab management module
 */

import { TabControlMessage } from '@shared/types';

const PAGE_CONTROLLER_SCRIPT = 'content-scripts/page-controller.js';
const TAG = '[autofillAgent][TabsController.background]';

// Track tabs that have page controller injected
const injectedTabs = new Set<number>();

// Cleanup on tab remove/update
chrome.tabs.onRemoved.addListener((tabId) => {
  injectedTabs.delete(tabId);
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.status === 'loading') {
    injectedTabs.delete(tabId);
  }
});

/**
 * Inject page controller script into tab if not already injected
 */
export async function injectPageController(tabId: number): Promise<void> {
  if (injectedTabs.has(tabId)) {
    return;
  }

  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      files: [PAGE_CONTROLLER_SCRIPT],
    });
    injectedTabs.add(tabId);
  } catch (error) {
    console.error(`${TAG} Failed to inject page controller:`, error);
    throw error;
  }
}

/**
 * Handle TAB_CONTROL messages
 */
export async function handleTabControl(
  message: TabControlMessage,
  sender: chrome.runtime.MessageSender,
  sendResponse: (response?: any) => void
): Promise<boolean> {
  const { action, payload } = message;

  switch (action) {
    case 'get_active_tab':
      return getActiveTab(sendResponse);
    case 'get_tab_info':
      return getTabInfo(payload?.tabId, sendResponse);
    case 'open_new_tab':
      return openNewTab(payload?.url, sendResponse);
    case 'create_tab_group':
      return createTabGroup(payload, sendResponse);
    case 'update_tab_group':
      return updateTabGroup(payload, sendResponse);
    case 'add_tab_to_group':
      return addTabToGroup(payload, sendResponse);
    case 'close_tab':
      return closeTab(payload?.tabId, sendResponse);
    default:
      console.warn(TAG, 'Unknown tab action', action);
      sendResponse({ success: false, error: `Unknown action: ${action}` });
      return false;
  }
}

function getActiveTab(sendResponse: (response?: any) => void): boolean {
  chrome.tabs
    .query({ active: true, currentWindow: true })
    .then((tabs) => {
      sendResponse({ success: true, tabId: tabs[0]?.id ?? null });
    })
    .catch((error) => {
      sendResponse({ success: false, error: error.message });
    });
  return true; // Async response
}

function getTabInfo(tabId: number, sendResponse: (response?: any) => void): boolean {
  if (!tabId) {
    sendResponse({ success: false, error: 'Missing tabId' });
    return false;
  }

  chrome.tabs
    .get(tabId)
    .then((tab) => {
      sendResponse(tab);
    })
    .catch((error) => {
      sendResponse({ success: false, error: error.message });
    });
  return true; // Async response
}

function openNewTab(url: string, sendResponse: (response?: any) => void): boolean {
  if (!url) {
    sendResponse({ success: false, error: 'Missing url' });
    return false;
  }

  chrome.tabs
    .create({ url, active: false })
    .then((tab) => {
      sendResponse({
        success: true,
        tabId: tab.id ?? null,
        windowId: tab.windowId,
      });
    })
    .catch((error) => {
      sendResponse({ success: false, error: error.message });
    });
  return true; // Async response
}

function createTabGroup(
  payload: { tabIds?: number[]; windowId?: number },
  sendResponse: (response?: any) => void
): boolean {
  if (!payload?.tabIds) {
    sendResponse({ success: false, error: 'Missing tabIds' });
    return false;
  }

  chrome.tabs
    .group({
      tabIds: payload.tabIds,
      createProperties: { windowId: payload.windowId },
    })
    .then((groupId) => {
      sendResponse({ success: true, groupId });
    })
    .catch((error) => {
      sendResponse({ success: false, error: error.message });
    });
  return true; // Async response
}

function updateTabGroup(
  payload: { groupId?: number; properties?: chrome.tabGroups.UpdateProperties },
  sendResponse: (response?: any) => void
): boolean {
  if (!payload?.groupId) {
    sendResponse({ success: false, error: 'Missing groupId' });
    return false;
  }

  chrome.tabGroups
    .update(payload.groupId, payload.properties ?? {})
    .then(() => {
      sendResponse({ success: true });
    })
    .catch((error) => {
      sendResponse({ success: false, error: error.message });
    });
  return true; // Async response
}

function addTabToGroup(
  payload: { tabId?: number; groupId?: number },
  sendResponse: (response?: any) => void
): boolean {
  if (!payload?.tabId || !payload?.groupId) {
    sendResponse({ success: false, error: 'Missing tabId or groupId' });
    return false;
  }

  chrome.tabs
    .group({ tabIds: payload.tabId, groupId: payload.groupId })
    .then(() => {
      sendResponse({ success: true });
    })
    .catch((error) => {
      sendResponse({ success: false, error: error.message });
    });
  return true; // Async response
}

function closeTab(tabId: number, sendResponse: (response?: any) => void): boolean {
  if (!tabId) {
    sendResponse({ success: false, error: 'Missing tabId' });
    return false;
  }

  chrome.tabs
    .remove(tabId)
    .then(() => {
      sendResponse({ success: true });
    })
    .catch((error) => {
      sendResponse({ success: false, error: error.message });
    });
  return true; // Async response
}

/**
 * Setup tab event listeners for broadcasting tab changes
 */
export function setupTabListeners(): void {
  chrome.tabs.onCreated.addListener((tab) => {
    chrome.runtime
      .sendMessage({
        type: 'TAB_CHANGE',
        action: 'created',
        payload: { tab },
      })
      .catch(() => {});
  });

  chrome.tabs.onRemoved.addListener((tabId, removeInfo) => {
    chrome.runtime
      .sendMessage({
        type: 'TAB_CHANGE',
        action: 'removed',
        payload: { tabId, removeInfo },
      })
      .catch(() => {});
  });

  chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    chrome.runtime
      .sendMessage({
        type: 'TAB_CHANGE',
        action: 'updated',
        payload: { tabId, changeInfo, tab },
      })
      .catch(() => {});
  });
}
