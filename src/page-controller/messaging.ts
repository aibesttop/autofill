/**
 * Message handler for page-controller
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

  private handleSnapshot() {
    const result = this.domProcessor.getResult();

    return {
      success: true,
      tree: result.tree,
      flatString: result.flatString,
      elementCount: result.selectorMap.size,
    };
  }

  private async handleClick(payload: { index: number }) {
    const { index } = payload;
    const map = this.domProcessor.getSelectorMap();

    await clickElement({ index }, map);

    return { success: true, message: `Clicked element ${index}` };
  }

  private async handleInput(payload: { index: number; text: string; clearFirst?: boolean }) {
    const { index, text, clearFirst } = payload;
    const map = this.domProcessor.getSelectorMap();

    await inputText({ element: { index }, text, clearFirst }, map);

    return { success: true, message: `Input text into element ${index}` };
  }

  private async handleSelect(payload: { index: number; option: string }) {
    const { index, option } = payload;
    const map = this.domProcessor.getSelectorMap();

    await selectOption({ element: { index }, option }, map);

    return { success: true, message: `Selected option in element ${index}` };
  }

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

    const message = await performScroll({ direction, amount, targetElement });

    return { success: true, message };
  }

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

  private handleEvaluate(payload: { code: string }) {
    try {
      const result = new Function(payload.code)();
      return { success: true, result };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }
}

export function setupMessageListener(): void {
  const handler = new MessageHandler();

  chrome.runtime.onMessage.addListener((message: PageControlMessage, _sender, sendResponse) => {
    if (message.type === 'PAGE_CONTROL') {
      handler.handleMessage(message).then(sendResponse);
      return true;
    }
    return false;
  });

  console.log('[PageController] Message listener setup complete');
}
