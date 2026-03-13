import { useEffect, useState } from 'react';

interface ActiveTabState {
  tab: chrome.tabs.Tab | null;
  isLoading: boolean;
  error: string | null;
}

async function readActiveTab(): Promise<chrome.tabs.Tab | null> {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  return tabs[0] ?? null;
}

export function useActiveTab() {
  const [state, setState] = useState<ActiveTabState>({
    tab: null,
    isLoading: true,
    error: null,
  });

  useEffect(() => {
    let isMounted = true;

    const refreshState = async () => {
      try {
        const tab = await readActiveTab();
        if (isMounted) {
          setState({
            tab,
            isLoading: false,
            error: tab ? null : 'No active tab found',
          });
        }
        return tab;
      } catch {
        if (isMounted) {
          setState({
            tab: null,
            isLoading: false,
            error: 'Failed to read active tab',
          });
        }
        return null;
      }
    };

    void refreshState();

    const handleActivated = () => {
      void refreshState();
    };

    const handleUpdated = (
      _tabId: number,
      changeInfo: chrome.tabs.TabChangeInfo,
      tab: chrome.tabs.Tab
    ) => {
      if (!tab.active) {
        return;
      }

      if (changeInfo.status === 'complete' || typeof changeInfo.url === 'string') {
        setState({
          tab,
          isLoading: false,
          error: null,
        });
      }
    };

    chrome.tabs.onActivated.addListener(handleActivated);
    chrome.tabs.onUpdated.addListener(handleUpdated);

    return () => {
      isMounted = false;
      chrome.tabs.onActivated.removeListener(handleActivated);
      chrome.tabs.onUpdated.removeListener(handleUpdated);
    };
  }, []);

  const refresh = async () => {
    try {
      const tab = await readActiveTab();
      setState({
        tab,
        isLoading: false,
        error: tab ? null : 'No active tab found',
      });
      return tab;
    } catch {
      setState({
        tab: null,
        isLoading: false,
        error: 'Failed to read active tab',
      });
      return null;
    }
  };

  return {
    tab: state.tab,
    isLoading: state.isLoading,
    error: state.error,
    refresh,
  };
}
