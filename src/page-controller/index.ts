/**
 * Page Controller Entry Point
 * Page automation and DOM interaction system
 *
 * This script is injected into pages by the background script
 * to perform automation actions (click, type, scroll, etc.)
 */

import { setupMessageListener } from './messaging';

const TAG = '[autofill PageController]';
const INSTANCE_KEY = '__pageControllerInstance__';

/**
 * Check if already initialized
 */
function isAlreadyInitialized(): boolean {
  return !!(window as any)[INSTANCE_KEY];
}

/**
 * Mark as initialized
 */
function markAsInitialized(): void {
  try {
    (window as any)[INSTANCE_KEY] = true;
  } catch {}
}

/**
 * Initialize page controller
 */
function initialize(): void {
  if (isAlreadyInitialized()) {
    console.warn(TAG, 'Already initialized, skipping');
    return;
  }

  markAsInitialized();

  console.log(TAG, 'Initializing...');

  // Setup message listener
  setupMessageListener();

  console.log(TAG, 'Page controller initialized');
  console.log(TAG, 'Ready to receive automation commands');
}

// Start initialization
initialize();
