/**
 * Shared state for content script modules.
 * This module provides a central place for state that needs to be accessed
 * across multiple content script modules.
 */

// In-memory progress tracking (no storage writes)
export const progressState = {
  sort: {
    isActive: false,
    progress: null as {
      type: 'pagination' | 'sorting';
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

// Cleanup functions stored here for access across modules
let tilesWatcherCleanup: {
  disableObserverOnly: () => void;
  cleanupAll: () => void;
} | null = null;

export function setWatcherCleanup(
  cleanup: { disableObserverOnly: () => void; cleanupAll: () => void } | null
): void {
  tilesWatcherCleanup = cleanup;
}

export function getWatcherCleanup(): {
  disableObserverOnly: () => void;
  cleanupAll: () => void;
} | null {
  return tilesWatcherCleanup;
}
