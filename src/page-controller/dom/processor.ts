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

export class DOMProcessor {
  private config: SelectorConfig;
  private elementCounter = 0;
  private selectorMap: Map<number, InteractiveElement> = new Map();
  private textMap: Map<number, string> = new Map();

  constructor(config: Partial<SelectorConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  getConfig(): SelectorConfig {
    return { ...this.config };
  }

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

          const tagName = node.tagName.toLowerCase();
          if (this.config.interactiveBlacklist.includes(tagName)) {
            return NodeFilter.FILTER_REJECT;
          }

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
      if (currentNode instanceof HTMLElement) {
        const node = this.processElement(currentNode);
        if (node) {
          rootNodes.push(node);
        }
      }
      const nextNode = walker.nextNode();
      if (!nextNode) break;
      currentNode = nextNode as HTMLElement;
    }

    return rootNodes;
  }

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

    if (element instanceof HTMLInputElement) {
      node.value = element.value;
      node.checked = element.checked;
    }

    if (element instanceof HTMLOptionElement) {
      node.selected = element.selected;
    }

    const expanded = element.getAttribute('aria-expanded');
    if (expanded) {
      node.expanded = expanded === 'true';
    }

    // Check disabled - use hasAttribute for generic HTMLElement, property for form elements
    if (
      element instanceof HTMLInputElement ||
      element instanceof HTMLButtonElement ||
      element instanceof HTMLSelectElement ||
      element instanceof HTMLTextAreaElement ||
      element instanceof HTMLFieldSetElement
    ) {
      if (element.disabled) {
        node.disabled = true;
      }
    } else if (element.getAttribute('disabled') !== null) {
      node.disabled = true;
    }

    if (isInteractive) {
      const interactive: InteractiveElement = {
        ref: element,
        index: node.id,
        text: node.name,
        selector: this.generateSelector(element),
        role: node.role || undefined,
        tagName,
        boundingRect: node.boundingRect!,
      };

      this.selectorMap.set(node.id, interactive);
      this.textMap.set(node.id, node.name);
    }

    return node;
  }

  private isInteractiveElement(element: HTMLElement): boolean {
    const tagName = element.tagName.toLowerCase();

    if (this.config.interactiveWhitelist.length > 0) {
      if (!this.config.interactiveWhitelist.includes(tagName)) {
        return false;
      }
    }

    if (this.config.interactiveBlacklist.includes(tagName)) {
      return false;
    }

    const interactiveTags = [
      'a', 'button', 'input', 'select', 'textarea', 'option', 'label', 'fieldset',
    ];

    if (interactiveTags.includes(tagName)) return true;

    const role = element.getAttribute('role');
    if (role) return true;

    const style = window.getComputedStyle(element);
    if (style.cursor === 'pointer') return true;

    if (element.tabIndex >= 0) return true;

    return false;
  }

  private getAriaRole(element: HTMLElement): string | null {
    const explicitRole = element.getAttribute('role');
    if (explicitRole) return explicitRole;

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

  private getAccessibleName(element: HTMLElement): string {
    const ariaLabel = element.getAttribute('aria-label');
    if (ariaLabel) return ariaLabel;

    if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
      if (element.placeholder) return element.placeholder;
      if (element.value) return element.value;
    }

    if (element instanceof HTMLImageElement) {
      return element.alt || 'Image';
    }

    return element.textContent?.trim() || '';
  }

  private generateSelector(element: HTMLElement): string {
    if (element.id) return `#${element.id}`;

    if (element.className && typeof element.className === 'string') {
      const classes = element.className.split(' ').filter((c) => c).join('.');
      if (classes) return `${element.tagName.toLowerCase()}.${classes}`;
    }

    return element.tagName.toLowerCase();
  }

  treeToString(nodes: DOMTreeNode[], indent = ''): string {
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

  private reset(): void {
    this.elementCounter = 0;
    this.selectorMap.clear();
    this.textMap.clear();
  }

  getElementByIndex(index: number): HTMLElement | null {
    const item = this.selectorMap.get(index);
    return item?.ref || null;
  }

  getSelectorMap(): Map<number, InteractiveElement> {
    return this.selectorMap;
  }
}
