const CONTENT_SCRIPT_FILE = 'content.js';
const INJECTION_RETRY_COUNT = 5;
const INJECTION_RETRY_DELAY_MS = 120;

const MISSING_RECEIVER_PATTERNS = [
  'Receiving end does not exist',
  'message port closed before a response was received',
];

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function isUnsupportedTabError(error: unknown): boolean {
  const message = getErrorMessage(error);
  return (
    message.includes('Cannot access a chrome:// URL') ||
    message.includes('The extensions gallery cannot be scripted')
  );
}

function isMissingPermissionError(error: unknown): boolean {
  const message = getErrorMessage(error);
  return (
    message.includes('Cannot access contents of url') ||
    message.includes('Extension manifest must request permission') ||
    message.includes('Missing host permission for the tab')
  );
}

function isMissingReceiverError(error: unknown): boolean {
  const message = getErrorMessage(error).toLowerCase();
  return MISSING_RECEIVER_PATTERNS.some((pattern) => message.includes(pattern.toLowerCase()));
}

export function canUseTabMessaging(url?: string): boolean {
  if (!url) {
    return false;
  }

  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

function getUnsupportedTabMessage(): string {
  return 'Open a regular http/https page before using this action.';
}

function normalizeTabMessagingError(error: unknown, url?: string): Error {
  if (!canUseTabMessaging(url) || isUnsupportedTabError(error)) {
    return new Error(getUnsupportedTabMessage());
  }

  if (isMissingPermissionError(error)) {
    return new Error(
      'The extension does not currently have access to this site. Reload the extension and refresh the page.'
    );
  }

  if (isMissingReceiverError(error)) {
    return new Error('The page is not ready for extension automation. Refresh the page and try again.');
  }

  return new Error(getErrorMessage(error) || 'Failed to communicate with the current page.');
}

async function injectContentScript(tabId: number): Promise<void> {
  await chrome.scripting.executeScript({
    target: { tabId },
    files: [CONTENT_SCRIPT_FILE],
  });
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

async function sendMessageWithRetry<TResponse>(
  tabId: number,
  message: unknown,
  attempts = INJECTION_RETRY_COUNT
): Promise<TResponse> {
  let lastError: unknown;

  for (let index = 0; index < attempts; index += 1) {
    try {
      return (await chrome.tabs.sendMessage(tabId, message)) as TResponse;
    } catch (error) {
      lastError = error;
      if (!isMissingReceiverError(error) || index === attempts - 1) {
        throw error;
      }

      await delay(INJECTION_RETRY_DELAY_MS);
    }
  }

  throw lastError instanceof Error ? lastError : new Error('Failed to reach the current page.');
}

export async function sendMessageToTabId<TResponse>(
  tabId: number,
  url: string | undefined,
  message: unknown
): Promise<TResponse> {
  if (!canUseTabMessaging(url)) {
    throw new Error(getUnsupportedTabMessage());
  }

  try {
    return (await chrome.tabs.sendMessage(tabId, message)) as TResponse;
  } catch (error) {
    if (!isMissingReceiverError(error)) {
      throw normalizeTabMessagingError(error, url);
    }

    try {
      await injectContentScript(tabId);
      return await sendMessageWithRetry<TResponse>(tabId, message);
    } catch (retryError) {
      throw normalizeTabMessagingError(retryError, url);
    }
  }
}

export async function sendMessageToTab<TResponse>(
  tab: chrome.tabs.Tab,
  message: unknown
): Promise<TResponse> {
  if (!tab.id) {
    throw new Error('No active tab available.');
  }

  return sendMessageToTabId<TResponse>(tab.id, tab.url, message);
}
