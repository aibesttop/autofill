interface PageControlResponse<T = unknown> {
  success?: boolean;
  error?: string;
  tree?: unknown;
  flatString?: string;
  elementCount?: number;
  message?: string;
  info?: T;
}

interface PageSnapshotResult {
  success: boolean;
  flatString: string;
  elementCount: number;
}

interface PageElementInfo {
  tagName?: string;
  text?: string;
  visible?: boolean;
  value?: string;
  checked?: boolean;
  selectedText?: string;
}

let tabIdPromise: Promise<number | null> | null = null;

async function getCurrentTabId(): Promise<number | null> {
  if (!tabIdPromise) {
    tabIdPromise = chrome.runtime
      .sendMessage({
        type: 'PAGE_CONTROL',
        action: 'get_my_tab_id',
      })
      .then((response) => {
        return (response as { tabId?: number | null })?.tabId ?? null;
      })
      .catch(() => null);
  }

  return tabIdPromise;
}

async function sendPageControlMessage<T = unknown>(
  action: string,
  payload?: Record<string, unknown>
): Promise<PageControlResponse<T>> {
  const tabId = await getCurrentTabId();

  if (!tabId) {
    throw new Error('Could not resolve the current tab ID for page automation.');
  }

  const response = (await chrome.runtime.sendMessage({
    type: 'PAGE_CONTROL',
    action,
    payload,
    targetTabId: tabId,
  })) as PageControlResponse<T>;

  if (!response?.success) {
    throw new Error(response?.error || `Page automation failed for action "${action}".`);
  }

  return response;
}

export async function getPageSnapshot(): Promise<PageSnapshotResult> {
  const response = await sendPageControlMessage('snapshot');

  return {
    success: Boolean(response.success),
    flatString: response.flatString || '',
    elementCount: response.elementCount || 0,
  };
}

export async function clickPageElement(index: number): Promise<void> {
  await sendPageControlMessage('click', { index });
}

export async function inputPageElement(index: number, text: string, clearFirst = true): Promise<void> {
  await sendPageControlMessage('input', { index, text, clearFirst });
}

export async function selectPageElement(index: number, option: string): Promise<void> {
  await sendPageControlMessage('select', { index, option });
}

export async function getPageElementInfo(index: number): Promise<PageElementInfo> {
  const response = await sendPageControlMessage<PageElementInfo>('get_element_info', { index });
  return response.info || {};
}
