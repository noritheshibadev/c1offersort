/**
 * Background service worker for C1 Offers Sorter extension.
 * Handles message routing, state coordination, and extension lifecycle events.
 */

import { MessageBus } from '@/messaging/messageBus';
import { config } from '@/config';
import type { ExtensionMessage } from '@/types/messages';

export default defineBackground(() => {
  console.log(`${config.logging.contexts.background} Initializing...`);

  /**
   * Handle extension installation and updates
   */
  browser.runtime.onInstalled.addListener((details) => {
    console.log(
      `${config.logging.contexts.background} Extension installed/updated:`,
      details.reason
    );

    if (details.reason === 'install') {
      console.log(`${config.logging.contexts.background} First-time installation`);
      // Could open welcome page or set default settings here
    } else if (details.reason === 'update') {
      const previousVersion = details.previousVersion;
      console.log(
        `${config.logging.contexts.background} Updated from version ${previousVersion} to ${config.app.version}`
      );
    }
  });

  /**
   * Central message router
   * Routes messages between popup and content scripts
   */
  MessageBus.onMessage<ExtensionMessage>((message, sender, _sendResponse) => {
    console.log(`${config.logging.contexts.background} Message received:`, message.type, sender);

    // Route messages based on type
    switch (message.type) {
      case 'PAGINATION_PROGRESS':
        // Forward pagination progress from content script to popup
        // The popup is listening for these messages directly
        console.log(
          `${config.logging.contexts.background} Pagination progress: ${message.offersLoaded} offers, ${message.pagesLoaded} pages`
        );
        break;

      case 'SORTING_START':
        console.log(
          `${config.logging.contexts.background} Sorting started: ${message.totalOffers} offers`
        );
        break;

      case 'SORT_REQUEST':
        console.log(
          `${config.logging.contexts.background} Sort request: ${message.criteria} (${message.order})`
        );
        break;

      case 'FILTER_REQUEST':
        console.log(
          `${config.logging.contexts.background} Filter request: showFavoritesOnly=${message.showFavoritesOnly}`
        );
        break;

      case 'INJECT_FAVORITES_REQUEST':
        console.log(`${config.logging.contexts.background} Inject favorites request`);
        break;

      case 'REMOVE_FAVORITES_REQUEST':
        console.log(`${config.logging.contexts.background} Remove favorites request`);
        break;

      default:
        console.warn(`${config.logging.contexts.background} Unknown message type:`, message);
    }

    // Allow messages to pass through
    return false;
  });

  /**
   * Handle extension startup
   */
  browser.runtime.onStartup.addListener(() => {
    console.log(`${config.logging.contexts.background} Extension started`);
  });

  /**
   * Handle errors
   */
  self.addEventListener('error', (event) => {
    console.error(`${config.logging.contexts.background} Global error:`, event.error);
  });

  self.addEventListener('unhandledrejection', (event) => {
    console.error(
      `${config.logging.contexts.background} Unhandled promise rejection:`,
      event.reason
    );
  });

  console.log(`${config.logging.contexts.background} Initialization complete`);
});
