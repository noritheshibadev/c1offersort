import {
  extractMerchantTLD,
  extractMerchantName,
  findAllTiles,
  extractMileageText,
} from '@/shared/domHelpers';
import { getFavorites, createStarButton, type Favorite, toggleFavorite } from '@/shared/favoritesHelpers';
import { isContextInvalidatedError, safeStorageGet } from '@/utils/contextCheck';
import { SELECTORS } from '@/utils/constants';

const ENABLED_KEY = "c1-favorites-enabled";
const FAVORITES_CACHE_TTL = 10000; // Cache favorites for 10 seconds to reduce chrome.storage calls

let starInjectionObserver: IntersectionObserver | null = null;
const tilesAwaitingStarInjection = new WeakSet<HTMLElement>();

let eventDelegationSetup = false;
let clickAbortController: AbortController | null = null;
let hoverStylesInjected = false;

// Favorites cache to reduce chrome.storage calls
let cachedFavorites: Favorite[] = [];
let favoritesCacheTimestamp = 0;

async function getCachedFavorites(): Promise<Favorite[]> {
  const now = Date.now();
  if (now - favoritesCacheTimestamp < FAVORITES_CACHE_TTL) {
    return cachedFavorites;
  }

  const favorites = await getFavorites();
  cachedFavorites = favorites;
  favoritesCacheTimestamp = now;
  return favorites;
}

function invalidateFavoritesCache(): void {
  cachedFavorites = [];
  favoritesCacheTimestamp = 0;
}

/**
 * Injects CSS hover styles for star buttons (better performance than JavaScript event handlers)
 * Only injects once per page load
 */
function injectStarHoverStyles(): void {
  if (hoverStylesInjected) return;

  const styleId = 'c1-favorites-hover-styles';
  if (document.getElementById(styleId)) {
    hoverStylesInjected = true;
    return;
  }

  const style = document.createElement('style');
  style.id = styleId;
  style.textContent = `
    .c1-favorite-star:hover {
      transform: scale(1.1) !important;
      box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15) !important;
    }
  `;
  document.head.appendChild(style);
  hoverStylesInjected = true;
  console.log('[Favorites] CSS hover styles injected');
}

function setupStarEventDelegation(): void {
  if (eventDelegationSetup) return;

  // Inject CSS hover styles (better performance than JS event listeners)
  injectStarHoverStyles();

  const mainContainer = document.querySelector(SELECTORS.container);
  if (!mainContainer) {
    console.warn('[Favorites] Cannot setup event delegation - container not found');
    return;
  }

  if (clickAbortController) clickAbortController.abort();
  clickAbortController = new AbortController();

  // Only handle clicks (hover is now handled by CSS)
  mainContainer.addEventListener('click', async (e) => {
    const target = e.target as HTMLElement;
    if (!target.classList.contains('c1-favorite-star')) return;

    e.stopPropagation();
    e.preventDefault();

    const merchantTLD = target.getAttribute('data-merchant-tld');
    const merchantName = target.getAttribute('data-merchant-name');
    if (!merchantTLD || !merchantName) return;

    const tile = target.closest(SELECTORS.offerTile) as HTMLElement;
    if (!tile) return;

    const mileageValue = extractMileageText(tile);
    const nowFavorited = await toggleFavorite(merchantTLD, merchantName, mileageValue);

    // Invalidate cache since favorites changed
    invalidateFavoritesCache();

    target.textContent = nowFavorited ? "★" : "☆";
    target.setAttribute("data-favorited", nowFavorited ? "true" : "false");
    target.setAttribute(
      "aria-label",
      nowFavorited ? "Unfavorite offer" : "Favorite offer"
    );
    target.setAttribute(
      "title",
      nowFavorited ? "Remove from favorites" : "Add to favorites"
    );
  }, { signal: clickAbortController.signal });

  eventDelegationSetup = true;
  console.log('[Favorites] Event delegation setup complete (click only, hover via CSS)');
}

export async function injectStarsIntoTiles(
  tiles: HTMLElement[],
  useIntersectionObserver: boolean = true
): Promise<void> {
  setupStarEventDelegation();

  // Apply content-visibility to all tiles upfront for better rendering performance
  tiles.forEach(tile => {
    tile.style.contentVisibility = 'auto';
    tile.style.containIntrinsicSize = 'auto 200px';
  });

  // Use cached favorites to reduce chrome.storage calls (10s TTL)
  const favorites = await getCachedFavorites();
  const favoritedTLDs = new Set(favorites.map((fav: Favorite) => fav.merchantTLD));

  // Check if we're in table view - if so, force synchronous injection
  // because tiles are hidden and IntersectionObserver won't work
  const isTableView = !!document.getElementById('c1-offers-table-container');

  if (useIntersectionObserver && tiles.length > 50 && !isTableView) {
    console.log('[Favorites] Using Intersection Observer for lazy star injection on', tiles.length, 'tiles');

    if (!starInjectionObserver) {
      starInjectionObserver = new IntersectionObserver(
        (entries) => {
          entries.forEach(entry => {
            if (entry.isIntersecting) {
              const tile = entry.target as HTMLElement;
              if (tilesAwaitingStarInjection.has(tile)) {
                injectStarIntoSingleTile(tile, favoritedTLDs);
                tilesAwaitingStarInjection.delete(tile);
                starInjectionObserver?.unobserve(tile);
              }
            }
          });
        },
        {
          rootMargin: '200px',
          threshold: 0.01
        }
      );
    }

    tiles.forEach(tile => {
      if (!tile.querySelector('.c1-favorite-star')) {
        tilesAwaitingStarInjection.add(tile);
        starInjectionObserver?.observe(tile);
      }
    });

    return;
  }

  console.log('[Favorites] Using synchronous batch injection on', tiles.length, 'tiles');

  const tilesToProcess: Array<{
    tile: HTMLElement;
    standardTile: HTMLElement | null;
    hasStar: boolean;
    needsRelativePosition: boolean;
  }> = [];

  for (const tile of tiles) {
    try {
      const standardTile = tile.querySelector(".standard-tile") as HTMLElement | null;
      const hasStar = !!tile.querySelector(".c1-favorite-star");
      const needsRelativePosition = !standardTile;

      tilesToProcess.push({ tile, standardTile, hasStar, needsRelativePosition });
    } catch (error) {
      console.error("Failed to prepare tile:", error);
    }
  }

  for (const { tile, standardTile, hasStar, needsRelativePosition } of tilesToProcess) {
    try {
      if (hasStar) continue;

      const merchantTLD = extractMerchantTLD(tile);
      const merchantName = extractMerchantName(tile);

      if (!merchantTLD) continue;

      const isInitiallyFavorited = favoritedTLDs.has(merchantTLD);
      const starButton = createStarButton(
        tile,
        merchantTLD,
        merchantName,
        isInitiallyFavorited
      );

      if (standardTile) {
        standardTile.appendChild(starButton);
      } else {
        if (needsRelativePosition) {
          tile.style.position = "relative";
        }
        tile.appendChild(starButton);
      }
    } catch (error) {
      console.error("Failed to inject star:", error);
    }
  }
}

function injectStarIntoSingleTile(tile: HTMLElement, favoritedTLDs: Set<string>): void {
  try {
    if (tile.querySelector('.c1-favorite-star')) return;

    const merchantTLD = extractMerchantTLD(tile);
    const merchantName = extractMerchantName(tile);
    if (!merchantTLD) return;

    const isInitiallyFavorited = favoritedTLDs.has(merchantTLD);
    const starButton = createStarButton(
      tile,
      merchantTLD,
      merchantName,
      isInitiallyFavorited
    );

    const standardTile = tile.querySelector(".standard-tile") as HTMLElement | null;
    if (standardTile) {
      standardTile.appendChild(starButton);
    } else {
      tile.style.position = "relative";
      tile.appendChild(starButton);
    }
  } catch (error) {
    console.error("Failed to inject star:", error);
  }
}

export async function reinjectStarsAfterSort(): Promise<void> {
  try {
    const enabledResult = await safeStorageGet(ENABLED_KEY, { [ENABLED_KEY]: false });
    const isEnabled = enabledResult[ENABLED_KEY] === true;

    if (!isEnabled) {
      return;
    }

    const allTiles = findAllTiles();
    if (allTiles.length > 0) {
      console.log(`[Favorites] Re-injecting stars into ${allTiles.length} tiles after sort`);
      await injectStarsIntoTiles(allTiles);
    }
  } catch (error) {
    if (isContextInvalidatedError(error)) {
      console.warn('[Favorites] Extension context invalidated during reinjection');
      return;
    }
    throw error;
  }
}

export async function injectFavorites(
  favoritesObserverRef: { current: MutationObserver | null }
): Promise<{ success: boolean; favoritesCount: number; error?: string }> {
  try {
    // Use cached favorites to reduce chrome.storage calls
    const favorites = await getCachedFavorites();

    if (favoritesObserverRef.current) {
      console.log('[Favorites] Disconnecting existing observer before re-injection');
      favoritesObserverRef.current.disconnect();
      favoritesObserverRef.current = null;
    }

    const tiles = findAllTiles();
    console.log('[Favorites] Found tiles for injection:', tiles.length, 'First tile testid:', tiles[0]?.getAttribute('data-testid'));

    const tilesWithStars = tiles.filter(tile => tile.querySelector('.c1-favorite-star'));
    console.log('[Favorites] Tiles already with stars:', tilesWithStars.length);
    if (tilesWithStars.length > 0 && tilesWithStars.length === tiles.length) {
      return {
        success: true,
        favoritesCount: favorites.length,
      };
    }

    await injectStarsIntoTiles(tiles as HTMLElement[]);
    console.log('[Favorites] Finished injecting stars');

    const observer = new MutationObserver(async (mutations) => {
      const newTiles: HTMLElement[] = [];

      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (node instanceof HTMLElement && node.hasAttribute("data-testid")) {
            const testId = node.getAttribute("data-testid");
            if (testId && testId.startsWith("feed-tile-")) {
              newTiles.push(node);
            }
          }
        }
      }

      if (newTiles.length > 0) {
        await injectStarsIntoTiles(newTiles);
      }
    });

    favoritesObserverRef.current = observer;

    const mainContainer = tiles[0]?.closest('.grid') || document.body;
    observer.observe(mainContainer, {
      childList: true,
      subtree: true,
    });

    window.addEventListener('beforeunload', () => {
      observer.disconnect();
      favoritesObserverRef.current = null;
    }, { once: true });

    return {
      success: true,
      favoritesCount: favorites.length,
    };
  } catch (error) {
    console.error("[Favorites] Injection error:", error);
    return {
      success: false,
      favoritesCount: 0,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export async function removeFavoritesStars(
  favoritesObserverRef: { current: MutationObserver | null }
): Promise<{ success: boolean; starsRemoved: number }> {
  // Invalidate cache when removing stars
  invalidateFavoritesCache();

  const starButtons = document.querySelectorAll('.c1-favorite-star');
  let removedCount = 0;

  starButtons.forEach((button) => {
    button.remove();
    removedCount++;
  });

  if (favoritesObserverRef.current) {
    favoritesObserverRef.current.disconnect();
    favoritesObserverRef.current = null;
  }

  if (starInjectionObserver) {
    starInjectionObserver.disconnect();
    starInjectionObserver = null;
  }

  if (clickAbortController) {
    clickAbortController.abort();
    clickAbortController = null;
  }
  eventDelegationSetup = false;

  // Clean up injected CSS hover styles
  const hoverStyles = document.getElementById('c1-favorites-hover-styles');
  if (hoverStyles) {
    hoverStyles.remove();
  }
  hoverStylesInjected = false;

  return {
    success: true,
    starsRemoved: removedCount,
  };
}
