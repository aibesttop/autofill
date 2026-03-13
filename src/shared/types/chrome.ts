// Chrome Extension API type declarations

declare global {
  interface Chrome {
    runtime: {
      sendMessage: (
        message: ExtensionMessage,
        callback?: (response: any) => void
      ) => void;
      onMessage: ChromeEvent;
      getManifest: () => chrome.runtime.Manifest;
      id: string;
    };
    storage: {
      local: {
        get: (keys: string | string[] | null) => Promise<Record<string, any>>;
        set: (items: Record<string, any>) => Promise<void>;
        onChanged: ChromeEvent;
      };
    };
    tabs: {
      query: (queryInfo: chrome.tabs.QueryInfo) => Promise<chrome.tabs.Tab[]>;
      create: (createProperties: chrome.tabs.CreateProperties) => Promise<chrome.tabs.Tab>;
      sendMessage: (tabId: number, message: any, options?: any) => Promise<any>;
      onCreated: ChromeEvent;
      onUpdated: ChromeEvent;
      onRemoved: ChromeEvent;
    };
    scripting: {
      executeScript: (options: {
        target: { tabId: number };
        files?: string[];
        func?: () => void;
      }) => Promise<chrome.scripting.InjectionResult[]>;
    };
    sidePanel: {
      open: (options?: { tabId?: number; windowId?: number }) => Promise<void>;
      setPanelBehavior: (options: { openPanelOnActionClick?: boolean }) => Promise<void>;
    };
  }
}

export {};
