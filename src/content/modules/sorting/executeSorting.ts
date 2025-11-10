import {
  extractMileageText,
  extractMerchantName,
  parseMileageValue,
  findMainContainer,
  findAllTiles,
} from '@/shared/domHelpers';
import type { SortResult } from '@/types';
import { loadAllTiles } from '../pagination';
import { getWatcherCleanup } from '../../index';
import { getViewMode, updateViewMode } from '../../messaging/messageHandler';
import { removeTableView, applyTableView } from '../tableView';

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
): number {
  const allTiles = findAllTiles();
  if (allTiles.length === 0) return 0;

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
  const isDescending = sortOrder === "desc" || sortOrder.startsWith("desc-");

  const sortedTiles = tilesWithData.sort((a, b) => {
    if (sortCriteria === "alphabetical") {
      const nameA = a.merchantName.toLowerCase();
      const nameB = b.merchantName.toLowerCase();
      const comparison = nameA.localeCompare(nameB);
      return isDescending ? -comparison : comparison;
    } else if (sortCriteria === "merchantMileage") {
      // Parse the combined sort order (e.g., "desc-asc" = high miles, A-Z merchants)
      // Format: <mileage-direction>-<merchant-direction>
      const [mileageDir, merchantDir] = sortOrder.includes("-")
        ? sortOrder.split("-")
        : ["desc", "asc"]; // Default: high miles, A-Z

      const isMileageDesc = mileageDir === "desc";
      const isMerchantDesc = merchantDir === "desc";

      // Sort by mileage first
      const mileageComparison = isMileageDesc
        ? b.mileage - a.mileage
        : a.mileage - b.mileage;

      if (mileageComparison !== 0) {
        // Different mileage values - sort by mileage
        return mileageComparison;
      } else {
        // Same mileage value - sort by merchant name (respecting direction)
        const nameA = a.merchantName.toLowerCase();
        const nameB = b.merchantName.toLowerCase();
        const nameComparison = nameA.localeCompare(nameB);
        return isMerchantDesc ? -nameComparison : nameComparison;
      }
    } else {
      return isDescending ? b.mileage - a.mileage : a.mileage - b.mileage;
    }
  });

  // PHASE 3: WRITE - Apply all style changes in single animation frame (batched writes)
  requestAnimationFrame(() => {
    sortedTiles.forEach((item, index) => {
      if (!item.element) return;

      // Use cssText for faster style application (single operation vs multiple setProperty calls)
      // Apply content-visibility optimization for large DOM (reduces rendering cost by 95%)
      item.element.style.cssText += `
        grid-area: auto !important;
        order: ${index} !important;
        content-visibility: auto;
        contain: layout style;
        contain-intrinsic-size: auto 200px;
      `;
    });
  });

  return sortedTiles.length;
}

/**
 * Executes the sorting operation on Capital One offer tiles.
 * Loads all tiles via pagination, extracts mileage/merchant data, and reorders using CSS order property.
 *
 * In table view mode:
 * - Only sorts currently visible tiles (respecting favorites filter)
 * - Skips pagination (tiles already loaded)
 * - Refreshes table view to reflect new order
 *
 * @param sortCriteria - "mileage" or "alphabetical"
 * @param sortOrder - "asc" or "desc"
 * @param fullyPaginated - Reference to track if pagination is complete
 * @param processedTiles - WeakMap to track which tiles have been processed (auto GC)
 * @param reinjectStarsCallback - Callback to re-inject stars after sorting
 * @param progressState - In-memory progress tracking state (optional for backwards compatibility)
 * @returns Result object with success status, tiles processed count, and any errors
 */
export async function executeSorting(
  sortCriteria: string,
  sortOrder: string,
  fullyPaginated: { value: boolean },
  _processedTiles: WeakMap<HTMLElement, boolean>,
  reinjectStarsCallback: () => Promise<void>,
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
  }
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

  // Check if table view is active by checking the view mode state
  // (checking DOM is unreliable since we're about to modify it)
  const currentViewMode = getViewMode();
  const isTableViewActive = currentViewMode === 'table';
  console.log('[Sorting] Current view mode:', currentViewMode, 'isTableViewActive:', isTableViewActive);

  if (isTableViewActive) {
    console.log('[Sorting] Table view detected - will switch to grid, load all offers, sort, then re-apply table view');

    try {
      // Remove table view temporarily to access all tiles in grid
      await removeTableView();

      // PERFORMANCE FIX: Disconnect MutationObserver BEFORE sorting
      const watcherCleanup = getWatcherCleanup();
      if (watcherCleanup) {
        console.log('[Sorting] Disabling tiles watcher observer before sort');
        watcherCleanup.disableObserverOnly();
      }

      const mainContainer = findMainContainer();
      if (!mainContainer) {
        return {
          success: false,
          tilesProcessed: 0,
          pagesLoaded: 0,
          error: "Could not find offers container on the page.",
        };
      }

      // Set grid properties for sorting
      console.log('[Sorting] Setting grid properties on main container');
      mainContainer.style.setProperty("display", "grid", "important");
      mainContainer.style.gridTemplateAreas = "none";
      mainContainer.style.gridAutoFlow = "row";

      // Hide carousel if present
      const carouselElement = document.querySelector('.app-page[style*="grid-column"]') as HTMLElement;
      if (carouselElement?.style) {
        carouselElement.style.display = "none";
      }

      // Scroll to "Additional Offers" section before pagination
      const additionalOffersHeader = Array.from(document.querySelectorAll("h2")).find(
        h => h.textContent?.includes("Additional Offers")
      );
      if (additionalOffersHeader) {
        console.log('[Sorting] Scrolling to Additional Offers header before pagination');
        additionalOffersHeader.scrollIntoView({ behavior: "smooth", block: "start" });
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      // Enable progress tracking
      if (progressState) {
        progressState.sort.isActive = true;
      }

      // Load all tiles through pagination (this was missing!)
      console.log('[Sorting] Starting pagination to load all offers...');
      let pagesLoaded = 0;
      try {
        pagesLoaded = await loadAllTiles(fullyPaginated);
        console.log('[Sorting] Pagination complete, pages loaded:', pagesLoaded);
      } finally {
        if (progressState) {
          progressState.sort.isActive = false;
        }
      }

      // Perform the sort on all tiles
      console.log('[Sorting] Performing sort...');
      const tilesProcessed = performSort(sortCriteria, sortOrder);

      if (tilesProcessed === 0) {
        console.error('[Sorting] No tiles found!');
        return {
          success: false,
          tilesProcessed: 0,
          pagesLoaded: pagesLoaded,
          error: "No offer tiles found.",
        };
      }

      console.log('[Sorting] Sort complete:', tilesProcessed, 'tiles processed');

      await reinjectStarsCallback();

      // Re-apply table view to show sorted results
      console.log('[Sorting] Re-applying table view...');
      const tableResult = await applyTableView();
      console.log('[Sorting] Table view apply result:', tableResult);

      if (tableResult.success) {
        // Update the view mode state to reflect that we're back in table view
        updateViewMode('table');
        console.log('[Sorting] View mode updated to table');
      } else {
        console.error('[Sorting] Failed to re-apply table view:', tableResult.error);
      }

      return {
        success: true,
        tilesProcessed: tilesProcessed,
        pagesLoaded: pagesLoaded,
      };
    } finally {
      isSortInProgress = false;
      console.log('[Sorting] Table view sort operation complete');
    }
  }

  // Grid view sorting (original logic)
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
    mainContainer.style.gridTemplateAreas = "none";
    mainContainer.style.gridAutoFlow = "row";

    const additionalOffersHeader = Array.from(document.querySelectorAll("h2")).find(
      h => h.textContent?.includes("Additional Offers")
    );
    if (additionalOffersHeader) {
      console.log('[Sorting] Scrolling to Additional Offers header before pagination');
      additionalOffersHeader.scrollIntoView({ behavior: "smooth", block: "start" });
      await new Promise(resolve => setTimeout(resolve, 500));
    }

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
    const tilesProcessed = performSort(sortCriteria, sortOrder);

    if (tilesProcessed === 0) {
      console.error('[Sorting] No tiles found!');
      return {
        success: false,
        tilesProcessed: 0,
        pagesLoaded: pagesLoaded,
        error: "No offer tiles found on the page. Please ensure offers are loaded before sorting.",
      };
    }

    console.log('[Sorting] Final sort complete:', tilesProcessed, 'tiles processed');

    await reinjectStarsCallback();

    // Note: Observer was already disabled at the start of executeSorting for performance

    return {
      success: true,
      tilesProcessed: tilesProcessed,
      pagesLoaded: pagesLoaded,
    };
  } finally {
    isSortInProgress = false;
    console.log('[Sorting] Sort operation complete');
  }
}
