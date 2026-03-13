/**
 * Page Hook Entry Point
 * Network interception for Twitter/X GraphQL and DM endpoints
 *
 * This script is injected into web pages to capture network traffic.
 * It communicates captured data back to the content script via postMessage.
 */

import { installXHRHooks } from './xhr';
import { installFetchHooks } from './fetch';
import { log, HOOK_CHANNEL } from './messenger';

const HOOK_INSTANCE_KEY = '__xExporterHooked';

/**
 * Check if hook is already installed
 */
function isAlreadyInstalled(): boolean {
  return !!(window as any)[HOOK_INSTANCE_KEY];
}

/**
 * Mark hook as installed
 */
function markAsInstalled(): void {
  try {
    (window as any)[HOOK_INSTANCE_KEY] = true;
  } catch {}
}

/**
 * Get channel name from current script element
 * The content script can configure this by setting data-channel attribute
 */
function getChannelName(): string {
  try {
    const script = document.currentScript as HTMLScriptElement;
    return script?.dataset.channel || HOOK_CHANNEL;
  } catch {
    return HOOK_CHANNEL;
  }
}

/**
 * Get extension origin from current script element
 * The content script should set data-origin attribute for security
 */
function getExtensionOrigin(): string {
  try {
    const script = document.currentScript as HTMLScriptElement;
    return script?.dataset.origin || '';
  } catch {
    return '';
  }
}

/**
 * Initialize page hook
 */
function initialize(): void {
  // Prevent duplicate installation
  if (isAlreadyInstalled()) {
    console.warn('[PageHook] Already installed, skipping');
    return;
  }

  markAsInstalled();

  // Get configuration from script element
  const channel = getChannelName();
  const origin = getExtensionOrigin();

  console.log('[PageHook] Initializing with channel:', channel, 'origin:', origin || '(not set)');

  // Install network hooks
  installXHRHooks();
  installFetchHooks();

  // Notify content script that hooks are installed
  log('info', 'Page hook installed successfully');

  console.log('[PageHook] Network interception active');
}

// Start initialization
initialize();
