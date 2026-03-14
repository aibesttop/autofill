/**
 * Context menu management
 */

const CONTEXT_MENU_ID = 'autofill-open-panel';
let contextMenuRevision = 0;

function createContextMenu(): void {
  chrome.contextMenus.create(
    {
      id: CONTEXT_MENU_ID,
      title: chrome.i18n.getMessage('contextMenuFill') || 'autofill Fill',
      contexts: ['page', 'editable', 'selection'],
    },
    () => {
      const lastError = chrome.runtime.lastError;
      if (!lastError) {
        return;
      }

      // Concurrent setup calls can briefly overlap in MV3 service workers.
      // If the item already exists, the desired final state is already reached.
      if (lastError.message?.includes('duplicate id')) {
        return;
      }

      console.warn('[ContextMenu] Failed to create context menu:', lastError.message);
    }
  );
}

/**
 * Create or update context menu
 */
export function setupContextMenu(): void {
  const revision = ++contextMenuRevision;
  chrome.contextMenus.removeAll(() => {
    if (revision !== contextMenuRevision) {
      return;
    }

    createContextMenu();
  });
}

/**
 * Remove context menu
 */
export function removeContextMenu(): void {
  contextMenuRevision += 1;
  chrome.contextMenus.removeAll();
}

/**
 * Handle context menu click
 */
export function handleContextMenuClick(
  info: chrome.contextMenus.OnClickData,
  tab?: chrome.tabs.Tab
): void {
  if (info.menuItemId === CONTEXT_MENU_ID && tab?.id) {
    if (!chrome.sidePanel.open) {
      return;
    }

    void chrome.sidePanel.open({ tabId: tab.id }).catch((error) => {
      console.error('[ContextMenu] Failed to open side panel:', error);
    });
  }
}

/**
 * Setup context menu click listener
 */
export function setupContextMenuListener(): void {
  chrome.contextMenus.onClicked.addListener((info, tab) => {
    handleContextMenuClick(info, tab);
  });
}
