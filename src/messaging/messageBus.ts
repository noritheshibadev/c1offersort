/**
 * Centralized message bus for type-safe communication between extension contexts.
 * Provides a unified API for sending and receiving messages across popup, content, and background scripts.
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
      return await chrome.runtime.sendMessage(message);
    } catch (error) {
      console.error('[MessageBus] Failed to send message:', error);
      throw error;
    }
  }

  /**
   * Send a message to a specific tab with retry logic
   */
  static async sendToTab<T extends ExtensionMessage>(
    tabId: number,
    message: T,
    retries = 5
  ): Promise<unknown> {
    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        return await chrome.tabs.sendMessage(tabId, message);
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        // Check if it's a "receiving end does not exist" error
        const isConnectionError = lastError.message.includes('Could not establish connection') ||
                                   lastError.message.includes('Receiving end does not exist');

        if (isConnectionError && attempt < retries) {
          // Use exponential backoff: 50ms, 100ms, 200ms, 400ms, 800ms
          const delay = 50 * Math.pow(2, attempt);
          console.warn(`[MessageBus] Connection attempt ${attempt + 1} failed, retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
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
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
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
   */
  static onMessage<T extends ExtensionMessage>(
    handler: (
      message: T,
      sender: chrome.runtime.MessageSender,
      sendResponse: (response?: unknown) => void
    ) => void | boolean | Promise<void>
  ): void {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      try {
        const result = handler(message as T, sender, sendResponse);
        // Return true if handler is async or needs to send response later
        if (result instanceof Promise) {
          result.catch((error) => {
            console.error('[MessageBus] Message handler error:', error);
          });
          return true; // Keep channel open for async response
        }
        return result;
      } catch (error) {
        console.error('[MessageBus] Message handler error:', error);
        return false;
      }
    });
  }

  /**
   * Listen for messages from tabs only
   */
  static onMessageFromTab<T extends ExtensionMessage>(
    handler: (
      message: T,
      sender: chrome.runtime.MessageSender,
      sendResponse: (response?: unknown) => void
    ) => void | boolean | Promise<void>
  ): void {
    this.onMessage<T>((message, sender, sendResponse) => {
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
 */
export function createMessageListener<T extends ExtensionMessage>(
  typeGuard: (msg: unknown) => msg is T,
  handler: (
    message: T,
    sender: chrome.runtime.MessageSender,
    sendResponse: (response?: unknown) => void
  ) => void | boolean | Promise<void>
): void {
  MessageBus.onMessage((message, sender, sendResponse) => {
    if (typeGuard(message)) {
      return handler(message, sender, sendResponse);
    }
    return false;
  });
}
