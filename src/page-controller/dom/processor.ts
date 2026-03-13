/**
 * DOM tree processor for accessibility snapshots
 */

import type { DOMTreeNode, InteractiveElement, SelectorConfig, DOMTreeResult } from '../types';

const DEFAULT_CONFIG: SelectorConfig = {
  doHighlightElements: true,
  focusHighlightIndex: -1,
  viewportExpansion: 0,
  debugMode: false,
  interactiveBlacklist: [],
  interactiveWhitelist: [],
  highlightOpacity: 0.1,
  highlightLabelOpacity: 0.5,
};

/**
 * Process DOM tree and create accessibility snapshot
 */
export class DOMProcessor {
  private config: SelectorConfig;
  private elementCounter: number = 0;
  private selectorMap: Map<number, InteractiveElement> = new Map();
  private textMap: Map<number, string> = new Map();

  constructor(config: Partial<SelectorConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Get current configuration
   */
  getConfig(): SelectorConfig {
    return { ...this.config };
  }

  /**
   * Build flat DOM tree with interactive elements
   */
  buildFlatTree(): DOMTreeNode[] {
    this.reset();

    const rootNodes: DOMTreeNode[] = [];
    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_ELEMENT,
      {
        acceptNode: (node) => {
          if (!(node instanceof HTMLElement)) {
            return NodeFilter.FILTER_REJECT;
          }

          // Check blacklist
          const tagName = node.tagName.toLowerCase();
          if (this.config.interactiveBlacklist.includes(tagName)) {
            return NodeFilter.FILTER_REJECT;
          }

          // Check if element is visible
          const style = window.getComputedStyle(node);
          if (style.display === 'none' || style.visibility === 'hidden') {
            return NodeFilter.FILTER_SKIP;
          }

          return NodeFilter.FILTER_ACCEPT;
        },
      }
    );

    let currentNode = walker.currentNode as HTMLElement;
    while (currentNode) {
      const node = this.processElement(currentNode);
      if (node) {
        rootNodes.push(node);
      }
      currentNode = walker.nextNode() as HTMLElement;
    }

    return rootNodes;
  }

  /**
   * Process single element
   */
  private processElement(element: HTMLElement): DOMTreeNode | null {
    const tagName = element.tagName.toLowerCase();
    const isInteractive = this.isInteractiveElement(element);

    const node: DOMTreeNode = {
      id: this.elementCounter++,
      role: this.getAriaRole(element),
      name: this.getAccessibleName(element),
      tagName,
      children: [],
      boundingRect: element.getBoundingClientRect(),
    };

    // Add value for inputs
    if (element instanceof HTMLInputElement) {
      node.value = element.value;
      node.checked = element.checked;
    }

    // Add selected state for options
    if (element instanceof HTMLOptionElement) {
      node.selected = element.selected;
    }

    // Add expanded state
    const expanded = element.getAttribute('aria-expanded');
    if (expanded) {
      node.expanded = expanded === 'true';
    }

    // Add disabled state
    if (element.disabled) {
      node.disabled = true;
    }

    // Store interactive elements in map
    if (isInteractive) {
      const interactive: InteractiveElement = {
        ref: element,
        index: node.id,
        text: node.name,
        selector: this.generateSelector(element),
        role: node.role || undefined,
        tagName,
        boundingRect: node.boundingRect,
      };

      this.selectorMap.set(node.id, interactive);
      this.textMap.set(node.id, node.name);
    }

    return node;
  }

  /**
   * Check if element is interactive
   */
  private isInteractiveElement(element: HTMLElement): boolean {
    const tagName = element.tagName.toLowerCase();

    // Check whitelist
    if (this.config.interactiveWhitelist.length > 0) {
      if (!this.config.interactiveWhitelist.includes(tagName)) {
        return false;
      }
    }

    // Check blacklist
    if (this.config.interactiveBlacklist.includes(tagName)) {
      return false;
    }

    // Check common interactive elements
    const interactiveTags = [
      'a',
      'button',
      'input',
      'select',
      'textarea',
      'option',
      'label',
      'fieldset',
    ];

    if (interactiveTags.includes(tagName)) {
      return true;
    }

    // Check for ARIA roles
    const role = element.getAttribute('role');
    if (role) {
      return true;
    }

    // Check for event listeners
    const style = window.getComputedStyle(element);
    if (style.cursor === 'pointer') {
      return true;
    }

    // Check for tabindex
    if (element.tabIndex >= 0) {
      return true;
    }

    return false;
  }

  /**
   * Get ARIA role
   */
  private getAriaRole(element: HTMLElement): string | null {
    // Explicit role
    const explicitRole = element.getAttribute('role');
    if (explicitRole) {
      return explicitRole;
    }

    // Implicit role based on tag
    const tagName = element.tagName.toLowerCase();
    const implicitRoles: Record<string, string> = {
      button: 'button',
      a: 'link',
      input: 'textbox',
      textarea: 'textbox',
      select: 'combobox',
      option: 'option',
    };

    return implicitRoles[tagName] || null;
  }

  /**
   * Get accessible name
   */
  private getAccessibleName(element: HTMLElement): string {
    // Check aria-label
    const ariaLabel = element.getAttribute('aria-label');
    if (ariaLabel) {
      return ariaLabel;
    }

    // Check placeholder for inputs
    if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
      if (element.placeholder) {
        return element.placeholder;
      }
      if (element.value) {
        return element.value;
      }
    }

    // Check alt text for images
    if (element instanceof HTMLImageElement) {
      return element.alt || 'Image';
    }

    // Get text content
    return element.textContent?.trim() || '';
  }

  /**
   * Generate CSS selector for element
   */
  private generateSelector(element: HTMLElement): string {
    if (element.id) {
      return `#${element.id}`;
    }

    if (element.className) {
      const classes = element.className.split(' ').filter((c) => c).join('.');
      if (classes) {
        return `${element.tagName}.${classes}`;
      }
    }

    return element.tagName.toLowerCase();
  }

  /**
   * Convert tree to string representation
   */
  treeToString(nodes: DOMTreeNode[], indent: string = ''): string {
    let result = '';

    for (const node of nodes) {
      const prefix = `${indent}[${node.id}]`;
      const role = node.role || node.tagName;
      const name = node.name ? `"${node.name}"` : '';
      result += `${prefix} ${role} ${name}\n`;

      if (node.children && node.children.length > 0) {
        result += this.treeToString(node.children, indent + '  ');
      }
    }

    return result;
  }

  /**
   * Get complete result
   */
  getResult(): DOMTreeResult {
    const tree = this.buildFlatTree();
    const flatString = this.treeToString(tree);

    return {
      tree,
      selectorMap: this.selectorMap,
      textMap: this.textMap,
      flatString,
    };
  }

  /**
   * Reset processor state
   */
  private reset(): void {
    this.elementCounter = 0;
    this.selectorMap.clear();
    this.textMap.clear();
  }

  /**
   * Get element by index
   */
  getElementByIndex(index: number): HTMLElement | null {
    const item = this.selectorMap.get(index);
    return item?.ref || null;
  }
}
