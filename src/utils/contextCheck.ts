/**
 * Chrome Extension Context Validity Checker
 * Provides utilities to check if the extension context is still valid
 * and handle context invalidation gracefully.
 */

import browser from 'webextension-polyfill';

/**
 * Checks if the Chrome extension context is still valid.
 * Returns false if the extension has been reloaded, updated, or disabled.
 */
export function isExtensionContextValid(): boolean {
  try {
    // Attempt to access browser.runtime.id
    // This will throw if the context is invalidated
    if (!browser?.runtime?.id) {
      return false;
    }
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Checks if an error is due to extension context invalidation
 */
export function isContextInvalidatedError(error: unknown): boolean {
  if (error instanceof Error) {
    return (
      error.message.includes('Extension context invalidated') ||
      error.message.includes('Cannot access') ||
      error.message.includes('chrome.runtime') ||
      error.message.includes('browser.runtime')
    );
  }
  return false;
}

/**
 * Wraps a Chrome API call with context validity checking.
 * Returns null if the context is invalid instead of throwing.
 *
 * @param fn - The async function to execute
 * @param fallbackValue - Value to return if context is invalid
 */
export async function withContextCheck<T>(
  fn: () => Promise<T>,
  fallbackValue: T
): Promise<T> {
  if (!isExtensionContextValid()) {
    console.warn('[Context] Extension context invalid, returning fallback value');
    return fallbackValue;
  }

  try {
    return await fn();
  } catch (error) {
    if (isContextInvalidatedError(error)) {
      console.warn('[Context] Extension context invalidated during operation');
      return fallbackValue;
    }
    throw error;
  }
}

/**
 * Safe wrapper for browser.storage.local.get that handles context invalidation
 */
export async function safeStorageGet<T = any>(
  keys: string | string[],
  defaultValue: { [key: string]: T } = {}
): Promise<{ [key: string]: T }> {
  return withContextCheck(
    async () => {
      const result = await browser.storage.local.get(keys);
      return result as { [key: string]: T };
    },
    defaultValue
  );
}

/**
 * Safe wrapper for browser.storage.local.set that handles context invalidation
 */
export async function safeStorageSet(
  items: { [key: string]: any }
): Promise<boolean> {
  return withContextCheck(
    async () => {
      await browser.storage.local.set(items);
      return true;
    },
    false
  );
}
