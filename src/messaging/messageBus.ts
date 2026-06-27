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
   * If the content script isn't present in the tab (Chrome throws
   * "Could not establish connection. Receiving end does not exist."), this
   * recovers by programmatically injecting the content script and retrying.
   * That happens when:
   *  - Capital One's SPA loaded at an entry URL that didn't trigger injection,
   *    or client-side-routed to the offers view without a full navigation, or
   *  - the tab was already open when the extension was installed/updated, which
   *    orphans the old content script (the classic "worked before, now broken").
   */
  static async sendToTab<T extends ExtensionMessage>(
    tabId: number,
    message: T,
    retries = 2
  ): Promise<unknown> {
    let lastError: Error | undefined;
    let didInject = false;

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        return await browser.tabs.sendMessage(tabId, message);
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        // Check if it's a "receiving end does not exist" error
        const isConnectionError = lastError.message.includes('Could not establish connection') ||
                                   lastError.message.includes('Receiving end does not exist');

        if (isConnectionError && attempt < retries) {
          // First recovery attempt: the content script isn't listening, so inject
          // it on demand (requires the `scripting` permission, granted for the
          // active tab via `activeTab` when the user opens the popup).
          if (!didInject) {
            didInject = true;
            const injected = await this.injectContentScript(tabId);
            if (injected) {
              // Give the freshly injected script time to register its listener
              await new Promise(resolve => setTimeout(resolve, 300));
              continue;
            }
          }

          console.warn(`[MessageBus] Connection attempt ${attempt + 1} failed, retrying in 100ms...`);
          await new Promise(resolve => setTimeout(resolve, 100));
          continue;
        }

        console.error(`[MessageBus] Failed to send message to tab ${tabId}:`, error);
        break;
      }
    }

    throw lastError || new Error('Failed to send message');
  }

  /**
   * Programmatically inject the content script into a tab.
   * Used as a recovery path when no content script is listening.
   * @returns true if injection succeeded, false otherwise
   */
  private static async injectContentScript(tabId: number): Promise<boolean> {
    try {
      if (!browser.scripting?.executeScript) {
        console.warn('[MessageBus] scripting API unavailable, cannot inject content script');
        return false;
      }
      console.warn('[MessageBus] No content script in tab, injecting on demand...');
      await browser.scripting.executeScript({
        target: { tabId },
        files: ['content-scripts/content.js'],
      });
      console.log('[MessageBus] Content script injected successfully');
      return true;
    } catch (injectError) {
      console.error('[MessageBus] Failed to inject content script:', injectError);
      return false;
    }
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
