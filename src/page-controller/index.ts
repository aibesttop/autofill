/**
 * Page Controller Entry Point
 */

import { setupMessageListener } from './messaging';

const TAG = '[autofill PageController]';
const INSTANCE_KEY = '__pageControllerInstance__';

function isAlreadyInitialized(): boolean {
  return !!(window as any)[INSTANCE_KEY];
}

function markAsInitialized(): void {
  try {
    (window as any)[INSTANCE_KEY] = true;
  } catch {
    // Ignore
  }
}

function initialize(): void {
  if (isAlreadyInitialized()) {
    console.warn(TAG, 'Already initialized, skipping');
    return;
  }

  markAsInitialized();
  console.log(TAG, 'Initializing...');

  setupMessageListener();

  console.log(TAG, 'Page controller initialized');
  console.log(TAG, 'Ready to receive automation commands');
}

initialize();
