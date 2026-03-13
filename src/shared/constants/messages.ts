// Message type constants

export const MESSAGE_TYPES = {
  TAB_CONTROL: 'TAB_CONTROL',
  PAGE_CONTROL: 'PAGE_CONTROL',
  TAB_CHANGE: 'TAB_CHANGE',
  AGENT_TAB_CONTROL: 'AGENT_TAB_CONTROL',
  AGENT_PAGE_CONTROL: 'AGENT_PAGE_CONTROL',
  AGENT_TAB_CHANGE: 'AGENT_TAB_CHANGE',
  AUTH_START: 'auth.start',
  AUTH_SUCCESS: 'auth.success',
  GET_WEBSITES: 'getWebsites',
  FETCH_IMAGE: 'fetchImage',
  X_OPEN_PANEL: 'x:open-panel',
  CONTEXT_MENU_TOGGLE: 'contextMenu:toggle',
  PLUGIN_TOGGLE: 'plugin:toggle',
  AUTO_DETECT_TOGGLE: 'autoDetect:toggle',
  SIDE_PANEL_TOGGLE: 'sidepanel:toggle',
  CONTEXT_MENU_OPEN_PANEL: 'contextmenu:open-panel',
} as const;

export const TAB_ACTIONS = {
  GET_ACTIVE_TAB: 'get_active_tab',
  GET_TAB_INFO: 'get_tab_info',
  OPEN_NEW_TAB: 'open_new_tab',
  CREATE_TAB_GROUP: 'create_tab_group',
  UPDATE_TAB_GROUP: 'update_tab_group',
  ADD_TAB_TO_GROUP: 'add_tab_to_group',
  CLOSE_TAB: 'close_tab',
} as const;

export const PAGE_HOOK_CHANNEL = 'x-exporter-bridge';
