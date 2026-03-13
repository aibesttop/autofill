/**
 * Common utility functions for page automation
 */

/**
 * Wait for specified amount of time (in seconds)
 */
export async function waitFor(seconds: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, seconds * 1000));
}

/**
 * Scroll element into view if needed
 */
export async function scrollIntoViewIfNeeded(element: HTMLElement): Promise<void> {
  if (!element.scrollIntoViewIfNeeded) {
    element.scrollIntoView({ behavior: 'auto', block: 'center', inline: 'nearest' });
  } else {
    element.scrollIntoViewIfNeeded();
  }
}

/**
 * Get element by index from map
 */
export function getElementByIndex(
  index: number,
  map: Map<number, InteractiveElement>
): HTMLElement {
  const item = map.get(index);
  if (!item) {
    throw new Error(`No interactive element found at index ${index}`);
  }

  if (!item.ref) {
    throw new Error(`Element at index ${index} does not have a reference`);
  }

  if (!(item.ref instanceof HTMLElement)) {
    throw new Error(`Element at index ${index} is not an HTMLElement`);
  }

  return item.ref;
}

/**
 * Cached property descriptors
 */
const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
  window.HTMLInputElement.prototype,
  'value'
)?.set;

const nativeTextAreaValueSetter = Object.getOwnPropertyDescriptor(
  window.HTMLTextAreaElement.prototype,
  'value'
)?.set;

/**
 * Set input value natively
 */
export function setNativeValue(element: HTMLInputElement | HTMLTextAreaElement, value: string): void {
  if (!nativeInputValueSetter || !nativeTextAreaValueSetter) {
    throw new Error('Native value setters not available');
  }

  if (element instanceof HTMLTextAreaElement) {
    nativeTextAreaValueSetter.call(element, value);
  } else {
    nativeInputValueSetter.call(element, value);
  }
}

/**
 * Throttle function execution
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  let lastResult: ReturnType<T>;

  return function (this: any, ...args: Parameters<T>) {
    if (!inThrottle) {
      inThrottle = true;
      lastResult = func.apply(this, args);

      setTimeout(() => {
        inThrottle = false;
      }, limit);
    }

    return lastResult;
  };
}

/**
 * Convert array-like to array
 */
export function toArray<T>(arrayLike: NodeListOf<T> | HTMLCollectionOf<T>): T[] {
  return Array.from(arrayLike);
}
