/**
 * Content script entry point for C1 Offers Sorter extension.
 * Sets up message handlers, tile watchers, and coordinates feature modules.
 */

import { setupMessageHandler } from '@/content/messaging/messageHandler';
import { setupTilesWatcher } from '@/content/modules/favorites/watcher';
import { reinjectStarsAfterSort } from '@/content/modules/favorites/inject';
import { progressState, setWatcherCleanup } from '@/content/state';
import { config } from '@/config';
import { VALID_URLS } from '@/utils/constants';

export default defineContentScript({
  matches: [
    'https://capitaloneoffers.com/*',
  ],
  runAt: 'document_idle',

  main(ctx) {
    // Idempotency guard. This entrypoint runs both declaratively (document_idle)
    // and on demand via browser.scripting.executeScript when the popup ensures
    // the content script is present (e.g. on a tab that was open before the
    // extension installed/updated). Re-running main() must not register a second
    // message listener or tiles watcher, so bail out if we've already set up.
    const injectionFlag = '__c1OffersSorterInjected';
    if ((window as unknown as Record<string, boolean>)[injectionFlag]) {
      console.log(`${config.logging.contexts.content} Already initialized, skipping re-injection`);
      return;
    }
    (window as unknown as Record<string, boolean>)[injectionFlag] = true;

    console.log(`${config.logging.contexts.content} Initializing C1 Offers Sorter...`);

    // The match pattern covers the whole domain since the SPA can route into
    // /feed without a full navigation, but only /feed and /c1-offers have the
    // offers grid this script scrapes.
    const currentUrl = window.location.href;
    const isValidPage = VALID_URLS.some((validUrl) => currentUrl.startsWith(validUrl));

    if (!isValidPage) {
      console.log(`${config.logging.contexts.content} Not a Capital One offers page, skipping setup`);
      delete (window as unknown as Record<string, boolean>)[injectionFlag];
      return;
    }

    console.log(`${config.logging.contexts.content} Valid Capital One offers page detected`);

    const processedTiles = new WeakMap<HTMLElement, boolean>(); // WeakMap for automatic GC
    const fullyPaginated = { value: false };
    const favoritesObserver: { current: MutationObserver | null } = { current: null };

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
    const tilesWatcherCleanup = setupTilesWatcher(processedTiles);
    setWatcherCleanup(tilesWatcherCleanup);

    console.log(`${config.logging.contexts.content} Initialization complete`);

    // Cleanup when context is invalidated (extension update/disable)
    ctx.onInvalidated(() => {
      console.log(`${config.logging.contexts.content} Context invalidated, cleaning up...`);
      if (tilesWatcherCleanup) {
        tilesWatcherCleanup.cleanupAll();
      }
      if (favoritesObserver.current) {
        favoritesObserver.current.disconnect();
      }
      setWatcherCleanup(null);
      // Clear the guard so a fresh re-injection (e.g. after an extension update
      // orphans this context) is allowed to set everything up again.
      delete (window as unknown as Record<string, boolean>)[injectionFlag];
    });
  },
});
