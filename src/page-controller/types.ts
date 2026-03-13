/**
 * Type definitions for Page Controller
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

export type ScrollDirection = 'up' | 'down' | 'left' | 'right';

export interface ScrollOptions {
  direction: ScrollDirection;
  amount?: number;
  targetElement?: HTMLElement;
}

export interface FileUploadData {
  name: string;
  mimeType: string;
  data: string;
}

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

export interface ElementRef {
  index: number;
}

export interface TextInputOptions {
  element: ElementRef | HTMLElement;
  text: string;
  clearFirst?: boolean;
}

export interface SelectOptionOptions {
  element: ElementRef | HTMLElement;
  option: string;
}

/**
 * DOM tree result - selectorMap uses InteractiveElement (matches implementation)
 */
export interface DOMTreeResult {
  tree: DOMTreeNode[];
  selectorMap: Map<number, InteractiveElement>;
  textMap: Map<number, string>;
  flatString: string;
}
