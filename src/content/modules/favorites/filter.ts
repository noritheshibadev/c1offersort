import {
  extractMerchantTLD,
  findMainContainer,
  findAllTiles,
  countRealTiles,
} from '@/shared/domHelpers';
import { getFavorites } from '@/shared/favoritesHelpers';
import { loadAllTiles } from '../pagination';
import { getWatcherCleanup } from '../../index';

/**
 * Applies or removes favorites filter to show/hide offer tiles.
 * When enabled, loads all offers first, then hides non-favorited offers and compacts the grid layout.
 *
 * @param showFavoritesOnly - If true, show only favorited offers; if false, show all
 * @param fullyPaginated - Reference to track if pagination is complete
 * @param skipPagination - If true, skip pagination (used when called during sort/refresh operations)
 * @returns Result with success status, tile counts, and list of favorites not currently visible
 */
export async function applyFavoritesFilter(
  showFavoritesOnly: boolean,
  fullyPaginated: { value: boolean },
  skipPagination: boolean = false
): Promise<{
  success: boolean;
  tilesShown: number;
  tilesHidden: number;
  missingFavorites?: string[];
  error?: string;
}> {
  try {
    // Store filter state so we can re-apply it after sorting/table view changes
    await chrome.storage.local.set({ 'c1-favorites-filter-active': showFavoritesOnly });

    if (showFavoritesOnly && !skipPagination) {
      await loadAllTiles(fullyPaginated);

      const watcherCleanup = getWatcherCleanup();
      if (watcherCleanup) {
        console.log('[Filter] Disabling tiles watcher observer');
        watcherCleanup.disableObserverOnly();
      }
    }
    // Note: Watcher is not re-enabled when turning off filter because:
    // 1. The watcher's storage change listener will re-enable if favorites are toggled off/on
    // 2. Re-enabling mid-operation could cause duplicate star injection
    // 3. The watcher was only disabled to prevent mutation events during tile manipulation

    const favorites = await getFavorites();
    const favoritedTLDs = new Set(favorites.map((fav) => fav.merchantTLD));

    const mainContainer = findMainContainer();
    if (mainContainer && showFavoritesOnly) {
      mainContainer.style.setProperty("display", "grid", "important");
      mainContainer.style.gridTemplateAreas = "none";
      mainContainer.style.gridAutoFlow = "row";
    }

    const tiles = findAllTiles();

    let hiddenCount = 0;
    let shownCount = 0;
    const missingFavorites: string[] = [];
    const foundFavorites = new Set<string>();

    for (const tile of tiles) {
      const merchantTLD = extractMerchantTLD(tile as HTMLElement);
      const isFavorited = favoritedTLDs.has(merchantTLD);

      if (showFavoritesOnly) {
        if (isFavorited) {
          (tile as HTMLElement).style.removeProperty('display');
          (tile as HTMLElement).style.setProperty('grid-area', 'auto', 'important');
          (tile as HTMLElement).style.setProperty('order', '0', 'important');
          shownCount++;
          foundFavorites.add(merchantTLD);
        } else {
          (tile as HTMLElement).style.setProperty('display', 'none', 'important');
          hiddenCount++;
        }
      } else {
        (tile as HTMLElement).style.removeProperty('display');
        (tile as HTMLElement).style.removeProperty('grid-area');
        (tile as HTMLElement).style.removeProperty('order');
        shownCount++;
      }
    }

    // Reset container grid properties when turning off the filter
    if (mainContainer && !showFavoritesOnly) {
      mainContainer.style.removeProperty('display');
      mainContainer.style.removeProperty('grid-template-areas');
      mainContainer.style.removeProperty('grid-auto-flow');
    }

    if (showFavoritesOnly) {
      favoritedTLDs.forEach((tld) => {
        if (!foundFavorites.has(tld)) {
          const favorite = favorites.find((fav) => fav.merchantTLD === tld);
          if (favorite) {
            missingFavorites.push(favorite.merchantName);
          }
        }
      });

      const additionalOffersHeader = Array.from(document.querySelectorAll("h2")).find(
        h => h.textContent?.includes("Additional Offers")
      );
      if (additionalOffersHeader) {
        additionalOffersHeader.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }

    return {
      success: true,
      tilesShown: shownCount,
      tilesHidden: hiddenCount,
      missingFavorites: missingFavorites.length > 0 ? missingFavorites : undefined,
    };
  } catch (error) {
    console.error('[C1 Favorites] Filter error:', error);
    return {
      success: false,
      tilesShown: 0,
      tilesHidden: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Loads all offers on the page by triggering pagination.
 * Wrapper around loadAllTiles() for external use via message passing.
 *
 * @param fullyPaginated - Reference to track if pagination is complete
 * @returns Result with success status, offers loaded, and pages loaded
 */
export async function loadAllOffers(
  fullyPaginated: { value: boolean }
): Promise<{ success: boolean; offersLoaded: number; pagesLoaded: number; error?: string }> {
  try {
    const pagesLoaded = await loadAllTiles(fullyPaginated);
    return {
      success: true,
      offersLoaded: countRealTiles(),
      pagesLoaded,
    };
  } catch (error) {
    return {
      success: false,
      offersLoaded: 0,
      pagesLoaded: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
