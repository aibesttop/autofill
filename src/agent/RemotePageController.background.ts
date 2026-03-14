/**
 * Background logics for RemotePageController
 * - redirects messages from RemotePageController (Agent, extension pages) to ContentScript
 */

import { AGENT_MESSAGE_TYPES } from './message-types';

const NO_RECEIVER_ERROR = 'Could not establish connection. Receiving end does not exist.';

function isNoReceiverError(error: unknown): boolean {
  return error instanceof Error && error.message.includes(NO_RECEIVER_ERROR);
}

export function handlePageControlMessage(
  message: {
    type: typeof AGENT_MESSAGE_TYPES.PAGE_CONTROL;
    action: string;
    payload: any;
    targetTabId: number;
  },
  sender: chrome.runtime.MessageSender,
  sendResponse: (response: unknown) => void
): true | undefined {
  const PREFIX = '[RemotePageController.background]';

  function debug(...messages: any[]) {
    console.debug(`\x1b[90m${PREFIX}\x1b[0m`, ...messages);
  }

  const { action, payload, targetTabId } = message;

  if (action === 'get_my_tab_id') {
    debug('get_my_tab_id', sender.tab?.id);
    sendResponse({ tabId: sender.tab?.id || null });
    return;
  }

  // proxy to content script
  chrome.tabs
    .sendMessage(targetTabId, {
      type: AGENT_MESSAGE_TYPES.PAGE_CONTROL,
      action,
      payload,
    })
    .then((result) => {
      sendResponse(result);
    })
    .catch((error) => {
      if (!isNoReceiverError(error)) {
        console.error(PREFIX, error);
      }

      sendResponse({
        success: false,
        error: isNoReceiverError(error)
          ? 'The page is not ready for agent automation. Refresh the tab and try again.'
          : error instanceof Error
            ? error.message
            : String(error),
      });
    });

  return true; // async response
}
