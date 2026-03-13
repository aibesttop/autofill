// Message type definitions for extension communication

// Base message type
export interface BaseMessage {
  type: string;
  id?: string;
  timestamp?: number;
}

// Background → Content messages
export interface TabChangeMessage extends BaseMessage {
  type: 'TAB_CHANGE';
  action: 'created' | 'removed' | 'updated';
  payload: {
    tab?: chrome.tabs.Tab;
    tabId?: number;
    changeInfo?: chrome.tabs.TabChangeInfo;
    removeInfo?: chrome.tabs.TabRemoveInfo;
  };
}

export interface AgentTabChangeMessage extends BaseMessage {
  type: 'AGENT_TAB_CHANGE';
  action: 'created' | 'removed' | 'updated';
  payload: {
    tab?: chrome.tabs.Tab;
    tabId?: number;
    changeInfo?: chrome.tabs.TabChangeInfo;
    removeInfo?: chrome.tabs.TabRemoveInfo;
  };
}

// Content → Background messages
export interface TabControlMessage extends BaseMessage {
  type: 'TAB_CONTROL';
  action:
    | 'get_active_tab'
    | 'get_tab_info'
    | 'open_new_tab'
    | 'create_tab_group'
    | 'update_tab_group'
    | 'add_tab_to_group'
    | 'close_tab';
  payload?: {
    tabId?: number;
    tabIds?: number[];
    url?: string;
    groupId?: number;
    windowId?: number;
    properties?: chrome.tabGroups.UpdateProperties;
  };
}

export interface AgentTabControlMessage extends BaseMessage {
  type: 'AGENT_TAB_CONTROL';
  action:
    | 'get_active_tab'
    | 'get_tab_info'
    | 'open_new_tab'
    | 'create_tab_group'
    | 'update_tab_group'
    | 'add_tab_to_group'
    | 'close_tab';
  payload?: {
    tabId?: number;
    tabIds?: number[];
    url?: string;
    groupId?: number;
    windowId?: number;
    properties?: chrome.tabGroups.UpdateProperties;
  };
}

export interface PageControlMessage extends BaseMessage {
  type: 'PAGE_CONTROL';
  action: string;
  payload?: any;
  targetTabId?: number;
}

export interface AgentPageControlMessage extends BaseMessage {
  type: 'AGENT_PAGE_CONTROL';
  action: string;
  payload?: any;
  targetTabId?: number;
}

export interface AuthStartMessage extends BaseMessage {
  type: 'auth.start';
}

export interface GetWebsitesMessage extends BaseMessage {
  type: 'getWebsites';
}

export interface FetchImageMessage extends BaseMessage {
  type: 'fetchImage';
  url: string;
}

export interface OpenPanelMessage extends BaseMessage {
  type: 'x:open-panel';
}

export interface ContextMenuToggleMessage extends BaseMessage {
  type: 'contextMenu:toggle';
  enabled?: boolean;
}

export interface PluginToggleMessage extends BaseMessage {
  type: 'plugin:toggle';
  enabled?: boolean;
}

export interface AutoDetectToggleMessage extends BaseMessage {
  type: 'autoDetect:toggle';
  enabled?: boolean;
}

// Union type for all messages
export type ExtensionMessage =
  | TabControlMessage
  | PageControlMessage
  | AgentTabControlMessage
  | AgentPageControlMessage
  | AuthStartMessage
  | GetWebsitesMessage
  | FetchImageMessage
  | TabChangeMessage
  | AgentTabChangeMessage
  | OpenPanelMessage
  | ContextMenuToggleMessage
  | PluginToggleMessage
  | AutoDetectToggleMessage;
