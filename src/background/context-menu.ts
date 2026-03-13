/**
 * Context menu management
 */

const CONTEXT_MENU_ID = 'autofill-open-panel';

/**
 * Create or update context menu
 */
export function setupContextMenu(): void {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: CONTEXT_MENU_ID,
      title: chrome.i18n.getMessage('contextMenuFill') || 'autofill Fill',
      contexts: ['page', 'editable', 'selection'],
    });
  });
}

/**
 * Remove context menu
 */
export function removeContextMenu(): void {
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
    try {
      chrome.tabs.sendMessage(tab.id, { type: 'contextmenu:open-panel' });
    } catch (error) {
      console.error('[ContextMenu] Failed to send message:', error);
    }
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
