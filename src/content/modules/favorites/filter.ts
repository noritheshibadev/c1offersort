import {
  extractMerchantTLD,
  extractMileageText,
  detectOfferType,
  detectChannelType,
  findAllTiles,
  findMainContainer,
  countRealTiles,
} from '@/shared/domHelpers';
import { getFavorites } from '@/shared/favoritesHelpers';
import { loadAllTiles } from '../pagination';
import { getWatcherCleanup } from '../../state';
import type { OfferType, ChannelType } from '@/types';

/**
 * Applies filters to show/hide offer tiles based on favorites, offer type, and/or channel.
 *
 * @param showFavoritesOnly - If true, show only favorited offers
 * @param offerTypeFilter - Filter by offer type: 'all', 'multiplier', or 'static'
 * @param fullyPaginated - Reference to track if pagination is complete
 * @param channelFilter - Filter by channel: 'all', 'in-store', 'in-app', or 'online'
 * @returns Result with success status, tile counts, and list of favorites not currently visible
 */
export async function applyFavoritesFilter(
  showFavoritesOnly: boolean,
  offerTypeFilter: OfferType,
  fullyPaginated: { value: boolean },
  channelFilter: ChannelType = 'all'
): Promise<{
  success: boolean;
  tilesShown: number;
  tilesHidden: number;
  missingFavorites?: string[];
  error?: string;
}> {
  try {
    const isFilteringActive = showFavoritesOnly || offerTypeFilter !== 'all' || channelFilter !== 'all';

    if (showFavoritesOnly) {
      await loadAllTiles(fullyPaginated);

      const watcherCleanup = getWatcherCleanup();
      if (watcherCleanup) {
        console.log('[Filter] Disabling tiles watcher observer');
        watcherCleanup.disableObserverOnly();
      }
    }

    const favorites = await getFavorites();
    const favoritedTLDs = new Set(favorites.map((fav) => fav.merchantTLD));

    const tiles = findAllTiles();

    let hiddenCount = 0;
    let shownCount = 0;
    const missingFavorites: string[] = [];
    const foundFavorites = new Set<string>();
    const visibleTilesList: HTMLElement[] = [];

    for (const tile of tiles) {
      const el = tile as HTMLElement;
      const merchantTLD = extractMerchantTLD(el);
      const isFavorited = favoritedTLDs.has(merchantTLD);

      let matchesTypeFilter = true;
      if (offerTypeFilter !== 'all') {
        const mileageText = extractMileageText(el);
        const tileOfferType = detectOfferType(mileageText);
        matchesTypeFilter = tileOfferType === offerTypeFilter;
      }

      let matchesChannelFilter = true;
      if (channelFilter !== 'all') {
        const tileChannels = detectChannelType(el);
        // Inclusive match: show tile if it includes the selected channel
        matchesChannelFilter = tileChannels.has(channelFilter);
      }

      const matchesFavoritesFilter = !showFavoritesOnly || isFavorited;
      const shouldShow = matchesFavoritesFilter && matchesTypeFilter && matchesChannelFilter;

      if (shouldShow) {
        el.style.removeProperty('display');
        visibleTilesList.push(el);
        shownCount++;
        if (isFavorited) {
          foundFavorites.add(merchantTLD);
        }
      } else {
        el.style.setProperty('display', 'none', 'important');
        hiddenCount++;
      }
    }

    const mainContainer = findMainContainer();

    if (mainContainer) {
      if (isFilteringActive) {
        mainContainer.style.setProperty('display', 'grid', 'important');
        mainContainer.style.setProperty('grid-template-areas', 'none', 'important');
        mainContainer.style.setProperty('grid-auto-flow', 'row', 'important');

        visibleTilesList.sort((a, b) => {
          const orderA = parseInt(a.style.order) || 0;
          const orderB = parseInt(b.style.order) || 0;
          return orderA - orderB;
        });

        visibleTilesList.forEach((tile, index) => {
          tile.style.setProperty('grid-area', 'auto', 'important');
          tile.style.setProperty('order', String(index), 'important');
        });
      } else {
        mainContainer.style.removeProperty('display');
        mainContainer.style.removeProperty('grid-template-areas');
        mainContainer.style.removeProperty('grid-auto-flow');

        for (const tile of tiles) {
          (tile as HTMLElement).style.removeProperty('grid-area');
          (tile as HTMLElement).style.removeProperty('order');
        }
      }
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
    }

    if (showFavoritesOnly) {
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
