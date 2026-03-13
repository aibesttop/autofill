/**
 * Type definitions for Page Controller
 * Handles page automation and DOM interaction
 */

/**
 * Interactive element in the DOM tree
 */
export interface InteractiveElement {
  ref: HTMLElement;
  index: number;
  text: string;
  selector: string;
  role?: string;
  tagName: string;
  boundingRect: DOMRect;
}

/**
 * DOM tree node for accessibility snapshot
 */
export interface DOMTreeNode {
  id: number;
  role: string | null;
  name: string;
  tagName: string;
  value?: string;
  checked?: boolean;
  selected?: boolean;
  expanded?: boolean;
  disabled?: boolean;
  children: DOMTreeNode[];
  boundingRect?: DOMRect;
}

/**
 * Page state information
 */
export interface PageState {
  url: string;
  title: string;
  viewport: {
    width: number;
    height: number;
    deviceScaleFactor: number;
  };
  scroll: {
    x: number;
    y: number;
  };
  content: string;
}

/**
 * Element selector configuration
 */
export interface SelectorConfig {
  doHighlightElements: boolean;
  focusHighlightIndex: number;
  viewportExpansion: number;
  debugMode: boolean;
  interactiveBlacklist: string[];
  interactiveWhitelist: string[];
  highlightOpacity: number;
  highlightLabelOpacity: number;
}

/**
 * Scroll direction
 */
export type ScrollDirection = 'up' | 'down' | 'left' | 'right';

/**
 * Scroll options
 */
export interface ScrollOptions {
  direction: ScrollDirection;
  amount?: number; // pixels to scroll
  targetElement?: HTMLElement; // scroll specific element
}

/**
 * File upload data
 */
export interface FileUploadData {
  name: string;
  mimeType: string;
  data: string; // base64 encoded
}

/**
 * Page control message types
 */
export type PageControlAction =
  | 'click'
  | 'input'
  | 'select'
  | 'scroll'
  | 'snapshot'
  | 'evaluate'
  | 'navigate'
  | 'upload'
  | 'get_state'
  | 'get_element_info'
  | 'close_dialog';

export interface PageControlMessage {
  type: 'PAGE_CONTROL';
  action: PageControlAction;
  payload?: any;
}

/**
 * Element reference by index
 */
export interface ElementRef {
  index: number;
}

/**
 * Text input options
 */
export interface TextInputOptions {
  element: ElementRef | HTMLElement;
  text: string;
  clearFirst?: boolean;
}

/**
 * Select option options
 */
export interface SelectOptionOptions {
  element: ElementRef | HTMLElement;
  option: string;
}

/**
 * DOM tree result
 */
export interface DOMTreeResult {
  tree: DOMTreeNode[];
  selectorMap: Map<number, HTMLElement>;
  textMap: Map<number, string>;
  flatString: string;
}
