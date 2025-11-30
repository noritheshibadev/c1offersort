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
    'https://capitaloneoffers.com/feed*',
    'https://capitaloneoffers.com/c1-offers*',
  ],
  runAt: 'document_idle',

  main(ctx) {
    console.log(`${config.logging.contexts.content} Initializing C1 Offers Sorter...`);

    // Validate we're on a Capital One offers page
    const currentUrl = window.location.href;
    const isValidPage = VALID_URLS.some((validUrl) => currentUrl.startsWith(validUrl));

    if (!isValidPage) {
      console.error(
        `${config.logging.contexts.content} Not a Capital One offers page - extension may not work correctly`
      );
    } else {
      console.log(`${config.logging.contexts.content} Valid Capital One offers page detected`);
    }

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
    });
  },
});
