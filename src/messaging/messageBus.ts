/**
 * Centralized message bus for type-safe communication between extension contexts.
 * Provides a unified API for sending and receiving messages across popup, content, and background scripts.
 *
 * Note: Uses WXT's globally provided `browser` object for cross-browser compatibility.
 */

import type {
  ExtensionMessage,
  PaginationProgressMessage,
  SortingStartMessage,
} from '../types/messages';

/**
 * Retry tuning for tab messaging. A "receiving end does not exist" error can
 * mean the content script is registered but hasn't finished initializing yet
 * (it runs at document_idle). A few short retries cover that transient window.
 *
 * The *persistent* case — a tab open before the extension installed/updated, so
 * no content script exists at all — is NOT handled here. Retrying can't fix it;
 * ChromeService.sendToTab catches that and re-injects the script. So we keep
 * this window short (~600ms) to fail fast into that recovery path.
 */
const TAB_RETRY = {
  /** Number of retries after the initial attempt. */
  MAX_RETRIES: 3,
  /** Base delay in ms before the first retry. */
  BASE_DELAY: 100,
  /** Backoff multiplier applied each retry. */
  BACKOFF: 1.5,
  /** Ceiling on any single retry delay in ms. */
  MAX_DELAY: 300,
} as const;

/** True for errors that mean "content script not ready yet" (worth retrying). */
function isConnectionNotReadyError(error: Error): boolean {
  return (
    error.message.includes('Could not establish connection') ||
    error.message.includes('Receiving end does not exist')
  );
}

/**
 * True when an error means the target tab has no content script listening.
 * The caller can recover by (re)injecting the content script and retrying.
 */
export function isContentScriptMissing(error: unknown): boolean {
  const err = error instanceof Error ? error : new Error(String(error));
  return isConnectionNotReadyError(err);
}

export class MessageBus {
  /**
   * Send a message to the background script or content script
   */
  static async send<T extends ExtensionMessage>(message: T): Promise<unknown> {
    try {
      return await browser.runtime.sendMessage(message);
    } catch (error) {
      console.error('[MessageBus] Failed to send message:', error);
      throw error;
    }
  }

  /**
   * Send a message to a specific tab with retry logic.
   *
   * "Receiving end does not exist" errors (content script not yet injected) are
   * retried with exponential backoff; any other error fails immediately.
   */
  static async sendToTab<T extends ExtensionMessage>(
    tabId: number,
    message: T,
    retries = TAB_RETRY.MAX_RETRIES
  ): Promise<unknown> {
    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        return await browser.tabs.sendMessage(tabId, message);
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        // Only retry when the content script simply isn't listening yet.
        if (isConnectionNotReadyError(lastError) && attempt < retries) {
          const delay = Math.min(
            TAB_RETRY.BASE_DELAY * Math.pow(TAB_RETRY.BACKOFF, attempt),
            TAB_RETRY.MAX_DELAY
          );
          console.warn(
            `[MessageBus] Content script not ready (attempt ${attempt + 1}/${retries + 1}), ` +
            `retrying in ${Math.round(delay)}ms...`
          );
          await new Promise((resolve) => setTimeout(resolve, delay));
          continue;
        }

        console.error(`[MessageBus] Failed to send message to tab ${tabId}:`, error);
        break;
      }
    }

    throw lastError || new Error('Failed to send message');
  }

  /**
   * Send a message to the active tab
   */
  static async sendToActiveTab<T extends ExtensionMessage>(
    message: T
  ): Promise<unknown> {
    try {
      const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
      if (!tab.id) {
        throw new Error('No active tab found');
      }
      return await this.sendToTab(tab.id, message);
    } catch (error) {
      console.error('[MessageBus] Failed to send message to active tab:', error);
      throw error;
    }
  }

  /**
   * Listen for messages of a specific type
   * @returns Cleanup function to remove the listener
   */
  static onMessage<T extends ExtensionMessage>(
    handler: (
      message: T,
      sender: Browser.runtime.MessageSender,
      sendResponse: (response?: unknown) => void
    ) => void | boolean | Promise<void>
  ): () => void {
    const listener = (message: unknown, sender: Browser.runtime.MessageSender, sendResponse: (response?: unknown) => void): boolean | Promise<void> => {
      try {
        const result = handler(message as T, sender, sendResponse);
        // Return true if handler is async or needs to send response later
        if (result instanceof Promise) {
          result.catch((error) => {
            console.error('[MessageBus] Message handler error:', error);
          });
          return true; // Keep channel open for async response
        }
        return result === true; // Convert to boolean
      } catch (error) {
        console.error('[MessageBus] Message handler error:', error);
        return false;
      }
    };

    browser.runtime.onMessage.addListener(listener as any);

    // Return cleanup function
    return () => {
      browser.runtime.onMessage.removeListener(listener as any);
    };
  }

  /**
   * Listen for messages from tabs only
   * @returns Cleanup function to remove the listener
   */
  static onMessageFromTab<T extends ExtensionMessage>(
    handler: (
      message: T,
      sender: Browser.runtime.MessageSender,
      sendResponse: (response?: unknown) => void
    ) => void | boolean | Promise<void>
  ): () => void {
    return this.onMessage<T>((message, sender, sendResponse) => {
      if (sender.tab) {
        return handler(message, sender, sendResponse);
      }
      return false;
    });
  }

  /**
   * Send a pagination progress update to the popup
   */
  static async sendPaginationProgress(
    offersLoaded: number,
    pagesLoaded: number
  ): Promise<void> {
    const message: PaginationProgressMessage = {
      type: 'PAGINATION_PROGRESS',
      offersLoaded,
      pagesLoaded,
    };
    await this.send(message);
  }

  /**
   * Send a sorting start notification to the popup
   */
  static async sendSortingStart(totalOffers: number): Promise<void> {
    const message: SortingStartMessage = {
      type: 'SORTING_START',
      totalOffers,
    };
    await this.send(message);
  }
}

/**
 * Type-safe message listener decorator
 * Usage: Use MessageBus.onMessage with type guards for specific message types
 * @returns Cleanup function to remove the listener
 */
export function createMessageListener<T extends ExtensionMessage>(
  typeGuard: (msg: unknown) => msg is T,
  handler: (
    message: T,
    sender: Browser.runtime.MessageSender,
    sendResponse: (response?: unknown) => void
  ) => void | boolean | Promise<void>
): () => void {
  return MessageBus.onMessage((message, sender, sendResponse) => {
    if (typeGuard(message)) {
      return handler(message, sender, sendResponse);
    }
    return false;
  });
}
