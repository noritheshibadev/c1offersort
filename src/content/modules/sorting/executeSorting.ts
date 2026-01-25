import {
  extractMileageText,
  extractMerchantName,
  parseMileageValue,
  detectOfferType,
  detectChannelType,
  findMainContainer,
  findAllTiles,
} from '@/shared/domHelpers';
import type { SortResult, OfferType, ChannelType } from '@/types';
import { loadAllTiles } from '../pagination';
import { getWatcherCleanup } from '../../state';

interface TileData {
  element: HTMLElement;
  mileage: number;
  merchantName: string;
}

let isSortInProgress = false;
const tileDataCache = new WeakMap<HTMLElement, TileData>();

/**
 * Performs sorting on currently loaded tiles.
 * Uses WeakMap cache to avoid re-extracting tile data on subsequent sorts.
 * Implements batched DOM operations: separate read phase and write phase to eliminate layout thrashing.
 *
 * @param sortCriteria - "mileage" or "alphabetical"
 * @param sortOrder - "asc" or "desc"
 */
function performSort(
  sortCriteria: string,
  sortOrder: string
): TileData[] {
  const allTiles = findAllTiles();
  if (allTiles.length === 0) return [];

  // PHASE 1: READ - Extract all data from DOM (cached or fresh)
  const tilesWithData: TileData[] = allTiles
    .map((tile) => {
      let cached = tileDataCache.get(tile);
      if (!cached) {
        const mileageText = extractMileageText(tile);
        const mileageValue = parseMileageValue(mileageText);
        const merchantName = extractMerchantName(tile);

        cached = {
          element: tile,
          mileage: mileageValue,
          merchantName: merchantName,
        };
        tileDataCache.set(tile, cached);
      }
      return cached;
    })
    .filter((item) => item.element !== null);

  // PHASE 2: SORT - Process data (no DOM access)
  const isDescending = sortOrder === "desc";

  const sortedTiles = tilesWithData.sort((a, b) => {
    if (sortCriteria === "alphabetical") {
      const nameA = a.merchantName.toLowerCase();
      const nameB = b.merchantName.toLowerCase();
      const comparison = nameA.localeCompare(nameB);
      return isDescending ? -comparison : comparison;
    } else {
      return isDescending ? b.mileage - a.mileage : a.mileage - b.mileage;
    }
  });

  // PHASE 3: WRITE - Apply all style changes in single animation frame (batched writes)
  requestAnimationFrame(() => {
    sortedTiles.forEach((item, index) => {
      if (!item.element) return;

      // Use cssText for faster style application (single operation vs multiple setProperty calls)
      item.element.style.cssText += `
        grid-area: auto !important;
        order: ${index} !important;
      `;
    });
  });

  return sortedTiles;
}

/**
 * Executes the sorting operation on Capital One offer tiles.
 * Loads all tiles via pagination, extracts mileage/merchant data, and reorders using CSS order property.
 *
 * @param sortCriteria - "mileage" or "alphabetical"
 * @param sortOrder - "asc" or "desc"
 * @param fullyPaginated - Reference to track if pagination is complete
 * @param processedTiles - WeakMap to track which tiles have been processed (auto GC)
 * @param reinjectStarsCallback - Callback to re-inject stars after sorting
 * @param offerTypeFilter - Filter to apply after sorting ('all', 'multiplier', 'static')
 * @param progressState - In-memory progress tracking state (optional for backwards compatibility)
 * @param channelFilter - Filter by channel: 'all', 'in-store', 'in-app', or 'online'
 * @returns Result object with success status, tiles processed count, and any errors
 */
export async function executeSorting(
  sortCriteria: string,
  sortOrder: string,
  fullyPaginated: { value: boolean },
  _processedTiles: WeakMap<HTMLElement, boolean>,
  reinjectStarsCallback: () => Promise<void>,
  offerTypeFilter: OfferType = 'all',
  progressState?: {
    sort: {
      isActive: boolean;
      progress: {
        type: "pagination" | "sorting";
        offersLoaded?: number;
        pagesLoaded?: number;
        totalOffers?: number;
      } | null;
    };
  },
  channelFilter: ChannelType = 'all'
): Promise<SortResult> {
  console.log('[Sorting] executeSorting called with criteria:', sortCriteria, 'order:', sortOrder);

  if (isSortInProgress) {
    console.warn('[Sorting] Sort already in progress, ignoring duplicate request');
    return {
      success: false,
      tilesProcessed: 0,
      pagesLoaded: 0,
      error: "A sort operation is already in progress. Please wait for it to complete.",
    };
  }

  isSortInProgress = true;

  // PERFORMANCE FIX: Disconnect MutationObserver BEFORE sorting to prevent 1,500+ mutation events
  const watcherCleanup = getWatcherCleanup();
  if (watcherCleanup) {
    console.log('[Sorting] Disabling tiles watcher observer before sort');
    watcherCleanup.disableObserverOnly();
  }

  const mainContainer = findMainContainer();

  if (!mainContainer) {
    isSortInProgress = false;
    return {
      success: false,
      tilesProcessed: 0,
      pagesLoaded: 0,
      error: "Could not find offers container on the page. The page structure may have changed.",
    };
  }

  try {
    const carouselElement = document.querySelector('.app-page[style*="grid-column"]') as HTMLElement;
    if (carouselElement?.style) {
      carouselElement.style.display = "none";
    }

    console.log('[Sorting] Setting grid properties on main container');
    mainContainer.style.setProperty("display", "grid", "important");
    mainContainer.style.setProperty("grid-template-areas", "none", "important");
    mainContainer.style.setProperty("grid-auto-flow", "row", "important");

    if (progressState) {
      progressState.sort.isActive = true;
    }

    console.log('[Sorting] Starting pagination...');
    let pagesLoaded = 0;
    try {
      pagesLoaded = await loadAllTiles(fullyPaginated);
      console.log('[Sorting] Pagination complete, pages loaded:', pagesLoaded);
    } finally {
      if (progressState) {
        progressState.sort.isActive = false;
      }
    }

    console.log('[Sorting] Performing sort...');
    const sortedTiles = performSort(sortCriteria, sortOrder);

    if (sortedTiles.length === 0) {
      console.error('[Sorting] No tiles found!');
      return {
        success: false,
        tilesProcessed: 0,
        pagesLoaded: pagesLoaded,
        error: "No offer tiles found on the page. Please ensure offers are loaded before sorting.",
      };
    }

    console.log('[Sorting] Final sort complete:', sortedTiles.length, 'tiles processed');

    let visibleCount = sortedTiles.length;
    const hasFilters = offerTypeFilter !== 'all' || channelFilter !== 'all';

    if (hasFilters) {
      console.log('[Sorting] Applying filters - offerType:', offerTypeFilter, 'channel:', channelFilter);
      let visibleIndex = 0;

      await new Promise<void>(resolve => {
        requestAnimationFrame(() => {
          for (const item of sortedTiles) {
            // Check offer type filter
            let matchesTypeFilter = true;
            if (offerTypeFilter !== 'all') {
              const mileageText = extractMileageText(item.element);
              const tileOfferType = detectOfferType(mileageText);
              matchesTypeFilter = tileOfferType === offerTypeFilter;
            }

            // Check channel filter
            let matchesChannelFilter = true;
            if (channelFilter !== 'all') {
              const tileChannels = detectChannelType(item.element);
              matchesChannelFilter = tileChannels.has(channelFilter);
            }

            if (matchesTypeFilter && matchesChannelFilter) {
              item.element.style.removeProperty('display');
              item.element.style.setProperty('order', String(visibleIndex), 'important');
              visibleIndex++;
            } else {
              item.element.style.setProperty('display', 'none', 'important');
            }
          }
          resolve();
        });
      });

      visibleCount = visibleIndex;
      console.log('[Sorting] Filter applied:', visibleCount, 'visible,', sortedTiles.length - visibleCount, 'hidden');
    } else {
      await new Promise<void>(resolve => {
        requestAnimationFrame(() => {
          for (const item of sortedTiles) {
            item.element.style.removeProperty('display');
          }
          resolve();
        });
      });
    }

    await reinjectStarsCallback();

    // Note: Observer was already disabled at the start of executeSorting for performance

    return {
      success: true,
      tilesProcessed: visibleCount,
      pagesLoaded: pagesLoaded,
    };
  } finally {
    isSortInProgress = false;
    console.log('[Sorting] Sort operation complete');
  }
}
