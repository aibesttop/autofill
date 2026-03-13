/**
 * Content Script Entry Point
 * Main initialization for content script functionality
 */

import { getStorageManager } from './storage';
import { setupMessageListener } from './messaging';
import { getPageHookBridge } from './page-hook-bridge';
import { getTwitterDetector } from './twitter';
import { FormFieldDetector } from './form-detector';

const TAG = '[autofill Content]';
const INSTANCE_KEY = '__contentScriptInstance__';

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
 * Initialize content script
 */
async function initialize(): Promise<void> {
  if (isAlreadyInitialized()) {
    console.warn(TAG, 'Already initialized, skipping');
    return;
  }

  markAsInitialized();

  console.log(TAG, 'Initializing...');

  // Initialize storage manager
  const storage = getStorageManager();
  await storage.initialize();

  const state = storage.getState();
  console.log(TAG, 'Plugin state:', state);

  // Setup message listener from background
  setupMessageListener();

  // Start page-hook bridge (listen for network interception)
  const bridge = getPageHookBridge();
  bridge.start();

  // Detect Twitter/X
  const twitter = getTwitterDetector();
  if (twitter.isTwitter()) {
    console.log(TAG, 'Running on Twitter/X platform');

    if (twitter.isDirectMessage()) {
      console.log(TAG, 'Twitter DM page detected');
    }

    if (twitter.isComposePage()) {
      console.log(TAG, 'Twitter compose page detected');
    }
  }

  // Initialize form detector
  const formDetector = new FormFieldDetector();

  // Auto-detect form fields if enabled
  if (storage.isAutoDetectEnabled()) {
    const fields = formDetector.detect();
    console.log(TAG, `Auto-detected ${fields.length} form fields`);
  }

  // Subscribe to storage changes
  storage.subscribe((newState) => {
    console.log(TAG, 'State changed:', newState);

    if (newState.autoDetect && newState.enabled) {
      const fields = formDetector.detect();
      console.log(TAG, `Detected ${fields.length} form fields`);
    }
  });

  // Subscribe to page-hook messages
  bridge.subscribe((message) => {
    // Handle captured network data
    if (message.type === 'capture') {
      console.log(TAG, 'Network captured:', message.url);
    }
  });

  console.log(TAG, 'Content script initialized');
}

// Start initialization
initialize().catch((error) => {
  console.error(TAG, 'Initialization error:', error);
});
