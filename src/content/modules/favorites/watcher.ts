import { shouldExcludeTile, findAllTiles } from '@/shared/domHelpers';
import { injectStarsIntoTiles } from './inject';
import { isContextInvalidatedError, safeStorageGet } from '@/utils/contextCheck';
import { SELECTORS } from '@/utils/constants';

const ENABLED_KEY = "c1-favorites-enabled";
const ENABLED_CACHE_TTL = 10000; // Cache enabled state for 10 seconds (increased for better performance)
const TILE_SCAN_INTERVALS = [100, 300, 700, 1500, 1000, 1000, 1000, 1000]; // Scan timings optimized for slow-loading pages

/**
 * Sets up a MutationObserver to watch for new tiles being added to the page
 * and automatically injects favorite stars into them when favorites are enabled.
 * Uses WeakMap for automatic garbage collection and debouncing to avoid excessive DOM queries.
 *
 * @param processedTiles - WeakMap to track which tiles have been processed (auto GC)
 */
export function setupTilesWatcher(
  processedTiles: WeakMap<HTMLElement, boolean>
): { disableObserverOnly: () => void; cleanupAll: () => void } {
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;
  let scanTimers: ReturnType<typeof setTimeout>[] = []; // Track all timers for cleanup
  let isCleanedUp = false; // Track cleanup state to prevent operations after cleanup

  // Cache enabled state to reduce storage thrashing
  let cachedEnabled = false;
  let enabledCacheTimestamp = 0;

  async function isEnabled(): Promise<boolean> {
    if (isCleanedUp) return false;
    const now = Date.now();
    if (now - enabledCacheTimestamp < ENABLED_CACHE_TTL) {
      return cachedEnabled;
    }
    const result = await safeStorageGet(ENABLED_KEY, { [ENABLED_KEY]: false });
    cachedEnabled = result[ENABLED_KEY] === true;
    enabledCacheTimestamp = now;
    return cachedEnabled;
  }

  const scanForInitialTiles = async () => {
    try {
      const enabled = await isEnabled();
      if (!enabled) {
        return;
      }

      // Scan at configured intervals to handle slow-loading pages (especially /feed)
      const scanIntervals = TILE_SCAN_INTERVALS;
      let cumulativeTime = 0;

      for (const interval of scanIntervals) {
        cumulativeTime += interval;

        const timer = setTimeout(async () => {
          try {
            const stillEnabled = await isEnabled();
            if (!stillEnabled) {
              return;
            }

            // Suppress warning during initial scans - tiles may not be loaded yet
            const allTiles = findAllTiles(true);
            const tilesToProcess: HTMLElement[] = [];

            for (const tile of allTiles) {
              if (!processedTiles.has(tile) && !shouldExcludeTile(tile)) {
                // Apply content-visibility optimization early
                tile.style.contentVisibility = 'auto';
                tile.style.containIntrinsicSize = 'auto 200px';

                tilesToProcess.push(tile);
                processedTiles.set(tile, true); // WeakMap auto-GC
              }
            }

            if (tilesToProcess.length > 0) {
              await injectStarsIntoTiles(tilesToProcess);
            }
          } catch (error) {
            if (isContextInvalidatedError(error)) {
              console.warn('[Favorites] Extension context invalidated during delayed scan');
            }
          }
        }, cumulativeTime);

        scanTimers.push(timer);
      }
    } catch (error) {
      if (isContextInvalidatedError(error)) {
        console.warn('[Favorites] Extension context invalidated during initial scan');
        return;
      }
      throw error;
    }
  };

  scanForInitialTiles();

  // Find main container to watch (more efficient than document.body)
  const mainContainer = document.querySelector(SELECTORS.container) || document.body;

  const observer = new MutationObserver(async (mutations) => {
    if (debounceTimer !== null) {
      clearTimeout(debounceTimer);
    }

    debounceTimer = window.setTimeout(async () => {
      try {
        const enabled = await isEnabled();
        if (!enabled) {
          debounceTimer = null;
          return;
        }

        const tilesToProcess: HTMLElement[] = [];
        let mutationExcludedCount = 0;
        let mutationProcessedCount = 0;

        for (const mutation of mutations) {
          for (const node of Array.from(mutation.addedNodes)) {
            if (node instanceof HTMLElement) {
              // Check if node itself is a tile
              const isTileNode = node.hasAttribute("data-testid") &&
                                 node.getAttribute("data-testid")?.startsWith("feed-tile-") ||
                                 node.matches?.('.flex.cursor-pointer, .flex.w-full.h-full.cursor-pointer');

              if (isTileNode) {
                const isProcessed = processedTiles.has(node);
                const shouldExclude = shouldExcludeTile(node);

                if (isProcessed) {
                  mutationProcessedCount++;
                } else if (shouldExclude) {
                  mutationExcludedCount++;
                } else {
                  tilesToProcess.push(node);
                  processedTiles.set(node, true); // WeakMap auto-GC
                }
              } else {
                // Check if node contains tiles
                const newTiles = Array.from(node.querySelectorAll(SELECTORS.offerTile)) as HTMLElement[];

                for (const tile of newTiles) {
                  const isProcessed = processedTiles.has(tile);
                  const shouldExclude = shouldExcludeTile(tile);

                  if (isProcessed) {
                    mutationProcessedCount++;
                  } else if (shouldExclude) {
                    mutationExcludedCount++;
                  } else {
                    tilesToProcess.push(tile);
                    processedTiles.set(tile, true); // WeakMap auto-GC
                  }
                }
              }
            }
          }
        }

        if (tilesToProcess.length > 0) {
          console.log(`[Favorites Watcher] Mutation detected - Processing ${tilesToProcess.length} new tiles, Excluded: ${mutationExcludedCount}, AlreadyProcessed: ${mutationProcessedCount}`);
          // Preserve scroll position during star injection to prevent unwanted scroll-to-top
          const scrollX = window.scrollX;
          const scrollY = window.scrollY;
          await injectStarsIntoTiles(tilesToProcess);
          window.scrollTo(scrollX, scrollY);
        }

        debounceTimer = null;
      } catch (error) {
        // CRITICAL FIX: Always clear debounceTimer on any error, not just context errors
        debounceTimer = null;

        if (isContextInvalidatedError(error)) {
          console.warn('[Favorites] Extension context invalidated during mutation handling');
          return;
        }
        console.error('[Favorites] Error in mutation handler:', error);
        // Don't rethrow - this would crash the observer permanently
      }
    }, 300);
  });

  // Watch only the main container instead of entire document.body for better performance
  // PERFORMANCE: Only watch for new DOM nodes (childList), not attribute changes
  // Attribute monitoring causes excessive overhead when user interacts with tiles (hover, click)
  observer.observe(mainContainer, {
    childList: true,
    subtree: true,
  });

  const handleBeforeUnload = () => {
    cleanupAll();
  };

  const handleStorageChange = (changes: Record<string, chrome.storage.StorageChange>, areaName: string) => {
    if (isCleanedUp) return; // Ignore storage changes after cleanup
    if (areaName === "local" && changes[ENABLED_KEY]) {
      // Update cache immediately
      cachedEnabled = changes[ENABLED_KEY].newValue === true;
      enabledCacheTimestamp = Date.now();

      if (!cachedEnabled) {
        cleanupAll();
      }
    }
  };

  // Use AbortController for automatic event listener cleanup
  const abortController = new AbortController();
  window.addEventListener("beforeunload", handleBeforeUnload, { signal: abortController.signal });
  chrome.storage.onChanged.addListener(handleStorageChange);

  const cleanupAll = () => {
    if (isCleanedUp) return;
    isCleanedUp = true;

    if (debounceTimer !== null) {
      clearTimeout(debounceTimer);
      debounceTimer = null;
    }
    scanTimers.forEach(timer => clearTimeout(timer));
    scanTimers = [];
    observer.disconnect();

    abortController.abort();
    chrome.storage.onChanged.removeListener(handleStorageChange);
  };

  const disableObserverOnly = () => {
    if (debounceTimer !== null) {
      clearTimeout(debounceTimer);
      debounceTimer = null;
    }
    scanTimers.forEach(timer => clearTimeout(timer));
    scanTimers = [];
    observer.disconnect();
    console.log('[Favorites Watcher] Observer disabled (storage listeners remain active)');
  };

  return { disableObserverOnly, cleanupAll };
}
