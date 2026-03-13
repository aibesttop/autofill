import {
  DEFAULT_BUTTON_CONFIG,
  FORM_DETECTION_DEBOUNCE,
  MUTATION_OBSERVER_CONFIG,
} from './constants';
import { FormFieldDetector } from './form-detector';
import type { FormField, PluginState } from './types';

const BUTTON_ID = 'autofill-floating-button';
const BUTTON_WIDTH = 52;
const BUTTON_HEIGHT = 34;

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export class FloatingButtonManager {
  private button: HTMLButtonElement | null = null;
  private targetField: FormField | null = null;
  private state: PluginState = {
    enabled: true,
    autoDetect: false,
    floatingButton: true,
    contextMenu: true,
  };
  private observer: MutationObserver | null = null;
  private formDetector = new FormFieldDetector();
  private detectTimer: ReturnType<typeof setTimeout> | null = null;
  private cleanupFocusListeners: (() => void) | null = null;
  private cleanupViewportListeners: (() => void) | null = null;

  start(initialState: PluginState): void {
    this.state = initialState;
    this.ensureButton();
    this.installListeners();
    this.syncWithState(initialState);
  }

  syncWithState(nextState: PluginState): void {
    this.state = nextState;

    if (!this.shouldRenderButton()) {
      this.hideButton();
      this.disconnectObserver();
      return;
    }

    if (nextState.autoDetect) {
      this.scheduleDetect();
      this.ensureObserver();
    } else {
      this.disconnectObserver();
    }

    this.refreshTargetFromActiveElement();
  }

  destroy(): void {
    this.disconnectObserver();

    if (this.detectTimer) {
      clearTimeout(this.detectTimer);
      this.detectTimer = null;
    }

    this.cleanupFocusListeners?.();
    this.cleanupViewportListeners?.();
    this.cleanupFocusListeners = null;
    this.cleanupViewportListeners = null;

    if (this.button) {
      this.button.remove();
      this.button = null;
    }
  }

  private ensureButton(): void {
    if (this.button || !document.body) {
      return;
    }

    const button = document.createElement('button');
    button.id = BUTTON_ID;
    button.type = 'button';
    button.textContent = 'Fill';
    button.setAttribute('aria-label', 'Open autofill panel');
    button.title = 'Open autofill panel';
    Object.assign(button.style, {
      position: 'fixed',
      top: '0',
      left: '0',
      display: 'none',
      alignItems: 'center',
      justifyContent: 'center',
      minWidth: `${BUTTON_WIDTH}px`,
      height: `${BUTTON_HEIGHT}px`,
      padding: '0 12px',
      border: '0',
      borderRadius: '999px',
      background: 'linear-gradient(135deg, #2563eb 0%, #0f766e 100%)',
      color: '#ffffff',
      fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      fontSize: '12px',
      fontWeight: '700',
      letterSpacing: '0.01em',
      boxShadow: '0 12px 24px rgba(15, 23, 42, 0.18)',
      cursor: 'pointer',
      zIndex: String(DEFAULT_BUTTON_CONFIG.zIndex),
      transition: 'transform 120ms ease, box-shadow 120ms ease, opacity 120ms ease',
      opacity: '0',
      pointerEvents: 'none',
    } satisfies Partial<CSSStyleDeclaration>);

    button.addEventListener('mouseenter', () => {
      button.style.transform = 'translateY(-1px)';
      button.style.boxShadow = '0 14px 28px rgba(15, 23, 42, 0.24)';
    });

    button.addEventListener('mouseleave', () => {
      button.style.transform = 'translateY(0)';
      button.style.boxShadow = '0 12px 24px rgba(15, 23, 42, 0.18)';
    });

    button.addEventListener('mousedown', (event) => {
      event.preventDefault();
    });

    button.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      void chrome.runtime.sendMessage({ type: 'x:open-panel' });
    });

    document.body.appendChild(button);
    this.button = button;
  }

  private installListeners(): void {
    if (!this.cleanupFocusListeners) {
      const handleFocusIn = (event: FocusEvent) => {
        if (!this.shouldRenderButton()) {
          return;
        }

        const field = this.formDetector.detectFieldForElement(event.target as Element | null);
        if (!field) {
          return;
        }

        this.setTargetField(field);
      };

      const handleFocusOut = () => {
        window.setTimeout(() => {
          this.refreshTargetFromActiveElement();
        }, 0);
      };

      document.addEventListener('focusin', handleFocusIn, true);
      document.addEventListener('focusout', handleFocusOut, true);

      this.cleanupFocusListeners = () => {
        document.removeEventListener('focusin', handleFocusIn, true);
        document.removeEventListener('focusout', handleFocusOut, true);
      };
    }

    if (!this.cleanupViewportListeners) {
      const handleViewportChange = () => {
        this.updateButtonPosition();
      };

      window.addEventListener('scroll', handleViewportChange, true);
      window.addEventListener('resize', handleViewportChange);

      this.cleanupViewportListeners = () => {
        window.removeEventListener('scroll', handleViewportChange, true);
        window.removeEventListener('resize', handleViewportChange);
      };
    }
  }

  private shouldRenderButton(): boolean {
    return this.state.enabled && this.state.floatingButton;
  }

  private refreshTargetFromActiveElement(): void {
    if (!this.shouldRenderButton()) {
      this.hideButton();
      return;
    }

    const activeElement = document.activeElement;
    const field = this.formDetector.detectFieldForElement(activeElement);

    if (!field) {
      this.clearTargetField();
      return;
    }

    this.setTargetField(field);
  }

  private setTargetField(field: FormField): void {
    this.targetField = field;
    this.updateButtonPosition();
  }

  private clearTargetField(): void {
    this.targetField = null;
    this.hideButton();
  }

  private hideButton(): void {
    if (!this.button) {
      return;
    }

    this.button.style.display = 'none';
    this.button.style.opacity = '0';
    this.button.style.pointerEvents = 'none';
  }

  private showButton(): void {
    if (!this.button) {
      return;
    }

    this.button.style.display = 'inline-flex';
    this.button.style.opacity = '1';
    this.button.style.pointerEvents = 'auto';
  }

  private updateButtonPosition(): void {
    if (!this.button || !this.targetField || !this.shouldRenderButton()) {
      this.hideButton();
      return;
    }

    const element = this.targetField.element;
    if (!(element instanceof HTMLElement) || !document.contains(element)) {
      this.clearTargetField();
      return;
    }

    const rect = element.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) {
      this.hideButton();
      return;
    }

    const offset = DEFAULT_BUTTON_CONFIG.offset ?? 10;
    const preferredTop = rect.top - BUTTON_HEIGHT - offset;
    const top =
      preferredTop < 12 ? rect.bottom + offset : preferredTop;
    const left = clamp(
      rect.right - BUTTON_WIDTH,
      12,
      window.innerWidth - BUTTON_WIDTH - 12
    );

    this.button.style.top = `${top}px`;
    this.button.style.left = `${left}px`;
    this.showButton();
  }

  private ensureObserver(): void {
    if (this.observer || !document.body) {
      return;
    }

    this.observer = new MutationObserver(() => {
      this.scheduleDetect();
    });

    this.observer.observe(document.body, {
      ...MUTATION_OBSERVER_CONFIG,
      attributeFilter: [...MUTATION_OBSERVER_CONFIG.attributeFilter],
    });
  }

  private disconnectObserver(): void {
    this.observer?.disconnect();
    this.observer = null;
  }

  private scheduleDetect(): void {
    if (this.detectTimer) {
      clearTimeout(this.detectTimer);
    }

    this.detectTimer = setTimeout(() => {
      this.detectTimer = null;
      this.formDetector.detect();
      this.refreshTargetFromActiveElement();
    }, FORM_DETECTION_DEBOUNCE);
  }
}

let floatingButtonManagerInstance: FloatingButtonManager | null = null;

export function getFloatingButtonManager(): FloatingButtonManager {
  if (!floatingButtonManagerInstance) {
    floatingButtonManagerInstance = new FloatingButtonManager();
  }

  return floatingButtonManagerInstance;
}
