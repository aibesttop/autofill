/**
 * Content Script Entry Point
 */

import { getStorageManager } from './storage';
import { setupMessageListener } from './messaging';
import { getPageHookBridge } from './page-hook-bridge';
import { getTwitterDetector } from './twitter';
import { FormFieldDetector } from './form-detector';

const TAG = '[autofill Content]';
const INSTANCE_KEY = '__contentScriptInstance__';

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

async function initialize(): Promise<void> {
  if (isAlreadyInitialized()) {
    console.warn(TAG, 'Already initialized, skipping');
    return;
  }

  markAsInitialized();
  console.log(TAG, 'Initializing...');

  const storage = getStorageManager();
  await storage.initialize();

  const state = storage.getState();
  console.log(TAG, 'Plugin state:', state);

  setupMessageListener();

  const bridge = getPageHookBridge();
  bridge.start();

  const twitter = getTwitterDetector();
  if (twitter.isTwitter()) {
    console.log(TAG, 'Running on Twitter/X platform');
    if (twitter.isDirectMessage()) console.log(TAG, 'Twitter DM page detected');
    if (twitter.isComposePage()) console.log(TAG, 'Twitter compose page detected');
  }

  const formDetector = new FormFieldDetector();

  if (storage.isAutoDetectEnabled()) {
    const fields = formDetector.detect();
    console.log(TAG, `Auto-detected ${fields.length} form fields`);
  }

  storage.subscribe((newState) => {
    console.log(TAG, 'State changed:', newState);
    if (newState.autoDetect && newState.enabled) {
      const fields = formDetector.detect();
      console.log(TAG, `Detected ${fields.length} form fields`);
    }
  });

  bridge.subscribe((message) => {
    if (message.type === 'capture') {
      console.log(TAG, 'Network captured:', message.url);
    }
  });

  console.log(TAG, 'Content script initialized');
}

initialize().catch((error) => {
  console.error(TAG, 'Initialization error:', error);
});
