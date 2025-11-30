/**
 * Unified service layer for all Chrome Extension API interactions.
 * Provides type-safe wrappers around Chrome APIs for tabs, storage, and messaging.
 *
 * Benefits:
 * - Single source of truth for Chrome API calls
 * - Easier testing (can mock this service)
 * - Cross-browser compatibility layer (supports Chrome and Firefox)
 * - Consistent error handling
 *
 * Note: Uses WXT's globally provided `browser` object for cross-browser compatibility.
 */

import { MessageBus } from '../messaging/messageBus';
import { getWithTimeout, setWithTimeout } from '../utils/storageWithTimeout';
import type {
  SortConfig,
  SortResult,
  FavoritesResult,
  OfferType,
} from '../types';
import type {
  SearchResult,
  ExtensionMessage,
} from '../types/messages';

/**
 * Response type for pagination status query
 */
export interface PaginationStatusResponse {
  fullyPaginated: boolean;
  offerCount?: number;
}

/**
 * Response type for search index building
 */
export interface SearchIndexResponse {
  success: boolean;
  offerCount: number;
}

/**
 * Response type for scroll to offer action
 */
export interface ScrollToOfferResponse {
  success: boolean;
  error?: string;
}

/**
 * Response type for search query
 */
export interface SearchQueryResponse {
  success: boolean;
  results: SearchResult[];
  totalMatches: number;
  searchEnabled: boolean;
  error?: string;
}

/**
 * Progress state for sort/filter operations
 */
export interface ProgressState {
  isActive: boolean;
  progress: {
    type: 'pagination' | 'sorting';
    offersLoaded?: number;
    pagesLoaded?: number;
    totalOffers?: number;
  } | null;
}

/**
 * Storage keys used by the extension
 */
const STORAGE_KEYS = {
  FAVORITES_ENABLED: 'c1-favorites-enabled',
  SORT_CONFIG: 'c1-last-sort-config',
} as const;

/**
 * ChromeService - Unified interface for all Chrome Extension APIs
 */
class ChromeService {
  // ============================================================================
  // TAB MANAGEMENT
  // ============================================================================

  /**
   * Get the currently active tab
   */
  async getCurrentTab(): Promise<Browser.tabs.Tab> {
    const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
    if (!tab) {
      throw new Error('No active tab found');
    }
    return tab;
  }

  /**
   * Send a message to a specific tab with retry logic
   */
  async sendToTab<TResponse = unknown>(
    tabId: number,
    message: ExtensionMessage
  ): Promise<TResponse> {
    return MessageBus.sendToTab(tabId, message) as Promise<TResponse>;
  }

  /**
   * Send a message to the currently active tab
   */
  async sendToActiveTab<TResponse = unknown>(
    message: ExtensionMessage
  ): Promise<TResponse> {
    return MessageBus.sendToActiveTab(message) as Promise<TResponse>;
  }

  // ============================================================================
  // STORAGE MANAGEMENT
  // ============================================================================

  /**
   * Get whether favorites feature is enabled
   */
  async getFavoritesEnabled(): Promise<boolean> {
    try {
      const result = await getWithTimeout<boolean>([STORAGE_KEYS.FAVORITES_ENABLED]);
      return result[STORAGE_KEYS.FAVORITES_ENABLED] ?? false;
    } catch (error) {
      console.error('[ChromeService] Failed to get favorites enabled:', error);
      return false;
    }
  }

  /**
   * Set whether favorites feature is enabled
   */
  async setFavoritesEnabled(enabled: boolean): Promise<void> {
    try {
      await setWithTimeout({ [STORAGE_KEYS.FAVORITES_ENABLED]: enabled });
    } catch (error) {
      console.error('[ChromeService] Failed to set favorites enabled:', error);
      throw error;
    }
  }

  /**
   * Get the last used sort configuration
   */
  async getSortConfig(): Promise<SortConfig | null> {
    try {
      const result = await getWithTimeout<SortConfig>([STORAGE_KEYS.SORT_CONFIG]);
      return result[STORAGE_KEYS.SORT_CONFIG] ?? null;
    } catch (error) {
      console.error('[ChromeService] Failed to get sort config:', error);
      return null;
    }
  }

  /**
   * Save the sort configuration
   */
  async setSortConfig(config: SortConfig): Promise<void> {
    try {
      await setWithTimeout({ [STORAGE_KEYS.SORT_CONFIG]: config });
    } catch (error) {
      console.error('[ChromeService] Failed to set sort config:', error);
      throw error;
    }
  }

  // ============================================================================
  // SORTING
  // ============================================================================

  /**
   * Send a sort request to the content script
   */
  async sendSortRequest(
    tabId: number,
    config: SortConfig,
    offerTypeFilter: OfferType = 'all'
  ): Promise<SortResult> {
    return this.sendToTab<SortResult>(tabId, {
      type: 'SORT_REQUEST',
      criteria: config.criteria,
      order: config.order,
      offerTypeFilter,
    });
  }

  /**
   * Query the current sort progress (for when popup reopens during sort)
   */
  async getSortProgress(tabId: number): Promise<ProgressState | null> {
    try {
      const response = await this.sendToTab<ProgressState>(tabId, {
        type: 'GET_SORT_PROGRESS',
      });
      return response;
    } catch (error) {
      console.log('[ChromeService] Failed to get sort progress:', error);
      return null;
    }
  }

  // ============================================================================
  // FAVORITES
  // ============================================================================

  /**
   * Request to inject favorites stars into the page
   */
  async injectFavorites(tabId: number): Promise<FavoritesResult> {
    return this.sendToTab<FavoritesResult>(tabId, {
      type: 'INJECT_FAVORITES_REQUEST',
    });
  }

  /**
   * Request to remove favorites stars from the page
   */
  async removeFavorites(tabId: number): Promise<FavoritesResult> {
    return this.sendToTab<FavoritesResult>(tabId, {
      type: 'REMOVE_FAVORITES_REQUEST',
    });
  }

  /**
   * Apply or remove favorites filter
   */
  async sendFilterRequest(
    tabId: number,
    showFavoritesOnly: boolean,
    offerTypeFilter: OfferType = 'all'
  ): Promise<FavoritesResult> {
    return this.sendToTab<FavoritesResult>(tabId, {
      type: 'FILTER_REQUEST',
      showFavoritesOnly,
      offerTypeFilter,
    });
  }

  /**
   * Query the current filter progress (for when popup reopens during filter)
   */
  async getFilterProgress(tabId: number): Promise<ProgressState | null> {
    try {
      const response = await this.sendToTab<ProgressState>(tabId, {
        type: 'GET_FILTER_PROGRESS',
      });
      return response;
    } catch (error) {
      console.log('[ChromeService] Failed to get filter progress:', error);
      return null;
    }
  }

  /**
   * Update the favorited state of a specific offer
   */
  async updateStarState(tabId: number, merchantTLD: string, isFavorited: boolean): Promise<void> {
    await this.sendToTab(tabId, {
      type: 'UPDATE_STAR_STATE',
      merchantTLD,
      isFavorited,
    });
  }

  // ============================================================================
  // SEARCH
  // ============================================================================

  /**
   * Build the search index in the content script
   */
  async buildSearchIndex(tabId: number): Promise<SearchIndexResponse> {
    return this.sendToTab<SearchIndexResponse>(tabId, {
      type: 'BUILD_SEARCH_INDEX',
    });
  }

  /**
   * Execute a search query
   */
  async sendSearchQuery(tabId: number, query: string): Promise<SearchQueryResponse> {
    return this.sendToTab<SearchQueryResponse>(tabId, {
      type: 'SEARCH_QUERY',
      query,
    });
  }

  /**
   * Scroll to a specific offer on the page
   */
  async scrollToOffer(tabId: number, merchantTLD: string): Promise<ScrollToOfferResponse> {
    return this.sendToTab<ScrollToOfferResponse>(tabId, {
      type: 'SCROLL_TO_OFFER',
      merchantTLD,
    });
  }

  /**
   * Get the pagination status (whether all offers are loaded)
   */
  async getPaginationStatus(tabId: number): Promise<PaginationStatusResponse> {
    return this.sendToTab<PaginationStatusResponse>(tabId, {
      type: 'GET_PAGINATION_STATUS',
    });
  }

  // ============================================================================
  // MESSAGING
  // ============================================================================

  /**
   * Register a message listener
   * Returns a cleanup function to remove the listener
   */
  onMessage<T extends ExtensionMessage>(
    handler: (
      message: T,
      sender: Browser.runtime.MessageSender,
      sendResponse: (response?: unknown) => void
    ) => void | boolean | Promise<void>
  ): () => void {
    const listener = (
      message: unknown,
      sender: Browser.runtime.MessageSender,
      sendResponse: (response?: unknown) => void
    ): boolean | Promise<void> => {
      const result = handler(message as T, sender, sendResponse);
      // Convert void to false, keep true as true, keep Promise as is
      if (result instanceof Promise) {
        return result;
      }
      return result === true;
    };

    browser.runtime.onMessage.addListener(listener as any);

    // Return cleanup function
    return () => {
      browser.runtime.onMessage.removeListener(listener as any);
    };
  }

  /**
   * Send a message to the background script or content script
   */
  async send<TResponse = unknown>(message: ExtensionMessage): Promise<TResponse> {
    return MessageBus.send(message) as Promise<TResponse>;
  }
}

// Export singleton instance
export const chromeService = new ChromeService();

// Export class for testing/mocking
export { ChromeService };
