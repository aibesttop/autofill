// Message type definitions for extension communication

// Base message type
interface BaseMessage {
  type: string;
  id?: string;
  timestamp?: number;
}

// Background → Content messages
interface TabChangeMessage extends BaseMessage {
  type: 'TAB_CHANGE';
  action: 'created' | 'removed' | 'updated';
  payload: {
    tab?: chrome.tabs.Tab;
    tabId?: number;
    changeInfo?: chrome.tabs.TabChangeInfo;
  };
}

// Content → Background messages
interface TabControlMessage extends BaseMessage {
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
    properties?: object;
  };
}

interface PageControlMessage extends BaseMessage {
  type: 'PAGE_CONTROL';
  action: string;
  payload?: any;
  targetTabId: number;
}

interface AuthStartMessage extends BaseMessage {
  type: 'auth.start';
}

interface GetWebsitesMessage extends BaseMessage {
  type: 'getWebsites';
}

interface FetchImageMessage extends BaseMessage {
  type: 'fetchImage';
  url: string;
}

// Union type for all messages
type ExtensionMessage = 
  | TabControlMessage
  | PageControlMessage
  | AuthStartMessage
  | GetWebsitesMessage
  | FetchImageMessage
  | TabChangeMessage;

export type {
  BaseMessage,
  TabChangeMessage,
  TabControlMessage,
  PageControlMessage,
  AuthStartMessage,
  GetWebsitesMessage,
  FetchImageMessage,
  ExtensionMessage,
};
