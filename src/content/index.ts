/**
 * Content script entry point for C1 Offers Sorter extension.
 * Sets up message handlers, tile watchers, and coordinates feature modules.
 */

import { setupMessageHandler } from './messaging/messageHandler';
import { setupTilesWatcher } from './modules/favorites/watcher';
import { reinjectStarsAfterSort } from './modules/favorites/inject';
import { config } from '../config';
import { VALID_URLS } from '../utils/constants';

console.log(`${config.logging.contexts.content} Initializing C1 Offers Sorter...`);

// Clear view mode, favorites enabled state, and favorites filter on page load since we always start fresh
chrome.storage.local.remove('c1-view-mode').catch(() => {
  // Ignore errors if key doesn't exist
});
chrome.storage.local.remove('c1-favorites-enabled').catch(() => {
  // Ignore errors if key doesn't exist
});
chrome.storage.local.remove('c1-favorites-filter-active').catch(() => {
  // Ignore errors if key doesn't exist
});

// Reset any favorites filter that might have been applied before page reload
// This ensures tiles are visible and not hidden by a previous filter state
(async () => {
  try {
    const { findAllTiles, findMainContainer } = await import('@/shared/domHelpers');

    // Wait a bit for DOM to be ready
    await new Promise(resolve => setTimeout(resolve, 500));

    const tiles = findAllTiles(true); // Suppress warning during initialization
    const mainContainer = findMainContainer();

    // Remove any filter-applied styles from tiles
    for (const tile of tiles) {
      (tile as HTMLElement).style.removeProperty('display');
      (tile as HTMLElement).style.removeProperty('grid-area');
      (tile as HTMLElement).style.removeProperty('order');
    }

    // Reset container grid properties
    if (mainContainer) {
      mainContainer.style.removeProperty('display');
      mainContainer.style.removeProperty('grid-template-areas');
      mainContainer.style.removeProperty('grid-auto-flow');
    }

    console.log(`${config.logging.contexts.content} Reset favorites filter on page load`);
  } catch (error) {
    console.log(`${config.logging.contexts.content} No filter to reset on page load`);
  }
})();

// Validate we're on a Capital One offers page
const currentUrl = window.location.href;
const isValidPage = VALID_URLS.some(validUrl => currentUrl.startsWith(validUrl));

if (!isValidPage) {
  console.error(`${config.logging.contexts.content} ❌ Not a Capital One offers page - extension may not work correctly`);
} else {
  console.log(`${config.logging.contexts.content} ✅ Valid Capital One offers page detected`);
}

let processedTiles = new WeakMap<HTMLElement, boolean>(); // WeakMap for automatic GC
let fullyPaginated = { value: false };
let favoritesObserver: { current: MutationObserver | null } = { current: null };
let tilesWatcherCleanup: { disableObserverOnly: () => void; cleanupAll: () => void } | null = null;

// In-memory progress tracking (no storage writes)
export const progressState = {
  sort: {
    isActive: false,
    progress: null as {
      type: "pagination" | "sorting";
      offersLoaded?: number;
      pagesLoaded?: number;
      totalOffers?: number;
    } | null,
  },
  filter: {
    isActive: false,
    progress: null as {
      offersLoaded: number;
      pagesLoaded: number;
    } | null,
  },
};

// Export cleanup functions for use by message handlers
export function getWatcherCleanup(): { disableObserverOnly: () => void; cleanupAll: () => void } | null {
  return tilesWatcherCleanup;
}

const reinjectStarsCallback = () => reinjectStarsAfterSort();

console.log(`${config.logging.contexts.content} Setting up message handler...`);
setupMessageHandler(
  fullyPaginated,
  processedTiles,
  favoritesObserver,
  reinjectStarsCallback,
  progressState
);

console.log(`${config.logging.contexts.content} Setting up tiles watcher...`);
tilesWatcherCleanup = setupTilesWatcher(processedTiles);

// Flush pending favorites saves on unload
window.addEventListener('beforeunload', async () => {
  const { flushFavoritesSave } = await import('../shared/favoritesHelpers');
  await flushFavoritesSave().catch(err => {
    console.error('[Content] Failed to flush favorites on unload:', err);
  });
});

console.log(`${config.logging.contexts.content} Initialization complete`);
