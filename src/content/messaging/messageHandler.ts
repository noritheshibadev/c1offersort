import { executeSorting } from '../modules/sorting/executeSorting';
import { applyFavoritesFilter, loadAllOffers } from '../modules/favorites/filter';
import { injectFavorites, removeFavoritesStars } from '../modules/favorites/inject';
import { updateStarState } from '../modules/favorites/updateStarState';
import { getWatcherCleanup } from '../index';
import { buildSearchIndex, executeSearch, scrollToOffer, isSearchIndexReady } from '../modules/search';
import { findAllTiles } from '../../shared/domHelpers';

/**
 * Sets up the Chrome message listener for handling requests from the popup.
 *
 * @param fullyPaginated - Reference to track if pagination is complete
 * @param processedTiles - WeakMap to track which tiles have been processed (auto GC)
 * @param favoritesObserver - Reference to the favorites MutationObserver
 * @param reinjectStarsCallback - Callback to re-inject stars after sorting
 * @param progressState - In-memory progress tracking state
 */
export function setupMessageHandler(
  fullyPaginated: { value: boolean },
  processedTiles: WeakMap<HTMLElement, boolean>,
  favoritesObserver: { current: MutationObserver | null },
  reinjectStarsCallback: () => Promise<void>,
  progressState: {
    sort: {
      isActive: boolean;
      progress: {
        type: "pagination" | "sorting";
        offersLoaded?: number;
        pagesLoaded?: number;
        totalOffers?: number;
      } | null;
    };
    filter: {
      isActive: boolean;
      progress: {
        offersLoaded: number;
        pagesLoaded: number;
      } | null;
    };
  }
) {
  console.log('[MessageHandler] Setting up message listener...');

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    console.log('[MessageHandler] Received message:', message);

    if (!message || typeof message !== 'object' || !('type' in message)) {
      console.log('[MessageHandler] Invalid message format');
      return false;
    }

    const handleAsync = async () => {
      console.log('[MessageHandler] Handling message type:', message.type);
      switch (message.type) {
        case 'SORT_REQUEST':
          console.log('[MessageHandler] Processing SORT_REQUEST');
          progressState.sort.isActive = true;
          progressState.sort.progress = null;
          const sortResult = await executeSorting(
            message.criteria,
            message.order,
            fullyPaginated,
            processedTiles,
            reinjectStarsCallback,
            progressState
          );
          progressState.sort.isActive = false;
          progressState.sort.progress = null;

          // Send completion message to popup in case it reopened during sorting
          try {
            chrome.runtime.sendMessage({
              type: 'SORT_COMPLETE',
              result: sortResult
            }).catch(() => console.log('[MessageHandler] Popup not available for completion message'));
          } catch (e) {
            console.log('[MessageHandler] Failed to send completion message:', e);
          }

          return sortResult;
        case 'FILTER_REQUEST':
          progressState.filter.isActive = message.showFavoritesOnly;
          progressState.filter.progress = null;
          const filterResult = await applyFavoritesFilter(message.showFavoritesOnly, fullyPaginated);
          progressState.filter.isActive = false;
          progressState.filter.progress = null;
          return filterResult;
        case 'LOAD_ALL_REQUEST':
          return await loadAllOffers(fullyPaginated);
        case 'INJECT_FAVORITES_REQUEST':
          return await injectFavorites(favoritesObserver);
        case 'REMOVE_FAVORITES_REQUEST':
          const watcherCleanup = getWatcherCleanup();
          if (watcherCleanup) {
            watcherCleanup.cleanupAll();
          }
          return await removeFavoritesStars(favoritesObserver);
        case 'UPDATE_STAR_STATE':
          updateStarState(message.merchantTLD, message.isFavorited);
          return { success: true };
        case 'GET_SORT_PROGRESS':
          console.log('[MessageHandler] Processing GET_SORT_PROGRESS');
          return {
            isActive: progressState.sort.isActive,
            progress: progressState.sort.progress,
          };
        case 'GET_FILTER_PROGRESS':
          console.log('[MessageHandler] Processing GET_FILTER_PROGRESS');
          return {
            isActive: progressState.filter.isActive,
            progress: progressState.filter.progress,
          };
        case 'BUILD_SEARCH_INDEX':
          console.log('[MessageHandler] Processing BUILD_SEARCH_INDEX');
          return buildSearchIndex();
        case 'SEARCH_QUERY':
          console.log('[MessageHandler] Processing SEARCH_QUERY:', message.query);
          const searchResult = executeSearch(message.query);
          return {
            ...searchResult,
            searchEnabled: isSearchIndexReady(),
          };
        case 'SCROLL_TO_OFFER':
          console.log('[MessageHandler] Processing SCROLL_TO_OFFER');
          return scrollToOffer(message.merchantTLD);
        case 'GET_PAGINATION_STATUS':
          console.log('[MessageHandler] Processing GET_PAGINATION_STATUS');
          return {
            fullyPaginated: fullyPaginated.value,
            offerCount: findAllTiles().length,
          };
        default:
          console.log('[MessageHandler] Unknown message type:', message.type);
          return { success: false, error: 'Unknown message type' };
      }
    };

    handleAsync()
      .then((result) => {
        console.log('[MessageHandler] Sending response:', result);
        sendResponse(result);
      })
      .catch((error) => {
        console.error('[MessageHandler] Error handling message:', error);
        sendResponse({ success: false, error: error instanceof Error ? error.message : 'Unknown error' });
      });

    return true;
  });

  console.log('[MessageHandler] Message listener setup complete');
}
