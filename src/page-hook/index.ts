/**
 * Page Hook Entry Point
 */

import { installXHRHooks } from './xhr';
import { installFetchHooks } from './fetch';
import { log, HOOK_CHANNEL } from './messenger';

const HOOK_INSTANCE_KEY = '__xExporterHooked';

function isAlreadyInstalled(): boolean {
  return !!(window as any)[HOOK_INSTANCE_KEY];
}

function markAsInstalled(): void {
  try {
    (window as any)[HOOK_INSTANCE_KEY] = true;
  } catch {
    // Ignore
  }
}

function getChannelName(): string {
  try {
    const script = document.currentScript as HTMLScriptElement;
    return script?.dataset.channel || HOOK_CHANNEL;
  } catch {
    return HOOK_CHANNEL;
  }
}

function initialize(): void {
  if (isAlreadyInstalled()) {
    console.warn('[PageHook] Already installed, skipping');
    return;
  }

  markAsInstalled();

  const channel = getChannelName();
  console.log('[PageHook] Initializing with channel:', channel);

  installXHRHooks();
  installFetchHooks();

  log('info', 'Page hook installed successfully');
  console.log('[PageHook] Network interception active');
}

initialize();
