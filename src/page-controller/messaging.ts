/**
 * Message handler for page-controller
 * Receives commands from background script
 */

import type { PageControlMessage } from './types';
import { DOMProcessor } from './dom/processor';
import { clickElement } from './actions/click';
import { inputText, selectOption } from './actions/input';
import { performScroll } from './actions/scroll';

export class MessageHandler {
  private domProcessor: DOMProcessor;

  constructor() {
    this.domProcessor = new DOMProcessor();
  }

  /**
   * Handle incoming message
   */
  async handleMessage(message: PageControlMessage): Promise<any> {
    const { action, payload } = message;

    try {
      switch (action) {
        case 'snapshot':
          return this.handleSnapshot();

        case 'click':
          return this.handleClick(payload);

        case 'input':
          return this.handleInput(payload);

        case 'select':
          return this.handleSelect(payload);

        case 'scroll':
          return this.handleScroll(payload);

        case 'get_state':
          return this.handleGetState();

        case 'get_element_info':
          return this.handleGetElementInfo(payload);

        case 'evaluate':
          return this.handleEvaluate(payload);

        default:
          throw new Error(`Unknown action: ${action}`);
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Handle DOM snapshot request
   */
  private handleSnapshot() {
    const result = this.domProcessor.getResult();

    return {
      success: true,
      tree: result.tree,
      flatString: result.flatString,
      elementCount: result.selectorMap.size,
    };
  }

  /**
   * Handle click action
   */
  private async handleClick(payload: { index: number }) {
    const { index } = payload;
    const map = this.domProcessor['selectorMap'];

    await clickElement({ index }, map);

    return { success: true, message: `Clicked element ${index}` };
  }

  /**
   * Handle input action
   */
  private async handleInput(payload: { index: number; text: string; clearFirst?: boolean }) {
    const { index, text, clearFirst } = payload;
    const map = this.domProcessor['selectorMap'];

    await inputText({ element: { index }, text, clearFirst }, map);

    return { success: true, message: `Input text into element ${index}` };
  }

  /**
   * Handle select action
   */
  private async handleSelect(payload: { index: number; option: string }) {
    const { index, option } = payload;
    const map = this.domProcessor['selectorMap'];

    await selectOption({ element: { index }, option }, map);

    return { success: true, message: `Selected option in element ${index}` };
  }

  /**
   * Handle scroll action
   */
  private async handleScroll(payload: {
    direction: 'up' | 'down' | 'left' | 'right';
    amount?: number;
    targetIndex?: number;
  }) {
    const { direction, amount, targetIndex } = payload;

    let targetElement: HTMLElement | undefined;
    if (targetIndex !== undefined) {
      targetElement = this.domProcessor.getElementByIndex(targetIndex) || undefined;
    }

    const message = await performScroll({
      direction,
      amount,
      targetElement,
    });

    return { success: true, message };
  }

  /**
   * Handle get state request
   */
  private handleGetState() {
    return {
      success: true,
      state: {
        url: window.location.href,
        title: document.title,
        viewport: {
          width: window.innerWidth,
          height: window.innerHeight,
          deviceScaleFactor: window.devicePixelRatio,
        },
        scroll: {
          x: window.scrollX,
          y: window.scrollY,
        },
      },
    };
  }

  /**
   * Handle get element info request
   */
  private handleGetElementInfo(payload: { index: number }) {
    const { index } = payload;
    const element = this.domProcessor.getElementByIndex(index);

    if (!element) {
      return { success: false, error: `Element ${index} not found` };
    }

    const rect = element.getBoundingClientRect();
    const computedStyle = window.getComputedStyle(element);

    return {
      success: true,
      info: {
        tagName: element.tagName,
        text: element.textContent?.trim() || '',
        visible: rect.width > 0 && rect.height > 0,
        rect: {
          x: rect.x,
          y: rect.y,
          width: rect.width,
          height: rect.height,
        },
        styles: {
          display: computedStyle.display,
          visibility: computedStyle.visibility,
          opacity: computedStyle.opacity,
        },
      },
    };
  }

  /**
   * Handle evaluate JavaScript request
   */
  private handleEvaluate(payload: { code: string }) {
    try {
      // eslint-disable-next-line no-eval
      const result = eval(payload.code);

      return {
        success: true,
        result,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }
}

/**
 * Setup message listener
 */
export function setupMessageListener(): void {
  const handler = new MessageHandler();

  chrome.runtime.onMessage.addListener((message: PageControlMessage, sender, sendResponse) => {
    if (message.type === 'PAGE_CONTROL') {
      handler.handleMessage(message).then(sendResponse);
      return true; // Async response
    }

    return false;
  });

  console.log('[PageController] Message listener setup complete');
}
