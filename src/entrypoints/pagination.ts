/**
 * Pagination script injected into page context to access React internals.
 * Uses WXT's defineUnlistedScript for proper bundling with shared code.
 *
 * This script runs in the MAIN world (page context) and can access:
 * - React's __reactProps$ for direct onClick handler access
 * - Page-level DOM that the extension's isolated world cannot reach
 *
 * Communication with the extension happens via DOM elements (bridge pattern).
 */

import { SELECTORS, PAGINATION_CONFIG } from '@/utils/constants';
import {
  countTiles,
  findButton,
  invalidateButtonCache,
  triggerReactClick,
  withPreservedScroll,
  waitForNewTiles,
  sleep,
  cancelSleep,
  cleanupPaginationElements,
  DOM_BRIDGE_IDS,
} from '@/shared/paginationHelpers';

export default defineUnlistedScript(() => {
  // Wrap in async IIFE to use await
  (async function paginateInPageContext() {
    console.log('[Pagination] Running in page context');

    // Read layout information from DOM (injected by content script)
    const layoutInfoElement = document.getElementById(DOM_BRIDGE_IDS.LAYOUT_INFO);
    const layoutName = layoutInfoElement?.getAttribute('data-layout-name') || 'unknown';
    const layoutVersion = layoutInfoElement?.getAttribute('data-layout-version') || 'unknown';

    console.log('[Pagination] Using layout:', layoutName, layoutVersion);
    console.log('[Pagination] Selectors:', {
      viewMore: SELECTORS.viewMoreButton,
      tile: SELECTORS.offerTile,
      container: SELECTORS.container,
    });

    let pagesLoaded = 0;
    let currentDelay = PAGINATION_CONFIG.INITIAL_DELAY;
    let consecutiveFailures = 0;

    // Moving average for adaptive delay
    const responseTimeHistory: number[] = [];

    console.log('[Pagination] Starting pagination loop with adaptive delays');

    // Create abort signal element for cleanup
    const abortElement = document.createElement('div');
    abortElement.id = DOM_BRIDGE_IDS.PAGINATION_ABORT;
    abortElement.style.display = 'none';
    document.body.appendChild(abortElement);

    for (let attempt = 0; attempt < PAGINATION_CONFIG.MAX_ATTEMPTS; attempt++) {
      // Check for abort signal
      if (!document.getElementById(DOM_BRIDGE_IDS.PAGINATION_ABORT)) {
        console.log('[Pagination] Abort signal detected, stopping pagination');
        cancelSleep();
        cleanupPaginationElements();
        break;
      }

      let button = findButton();

      if (!button) {
        console.log(
          '[Pagination] Button not found on attempt',
          attempt + 1,
          '/',
          PAGINATION_CONFIG.MAX_ATTEMPTS,
          '- retrying with exponential backoff...'
        );

        // Invalidate button cache since it's not found
        invalidateButtonCache();

        // Exponential backoff: if React is still rendering, give it progressively more time
        for (let retry = 0; retry < PAGINATION_CONFIG.MAX_RETRIES; retry++) {
          const retryWait = PAGINATION_CONFIG.RETRY_DELAY * Math.pow(1.5, retry);
          await sleep(retryWait);
          button = findButton();
          if (button) {
            console.log(
              '[Pagination] Button found after',
              retry + 1,
              'retries (waited',
              Math.round(retryWait) + 'ms)'
            );
            break;
          } else {
            console.log(
              '[Pagination] Retry',
              retry + 1,
              '/',
              PAGINATION_CONFIG.MAX_RETRIES,
              'failed'
            );
          }
        }

        if (!button) {
          console.log('[Pagination] Button still not found - pagination complete');
          console.log('[Pagination] Total pages loaded:', pagesLoaded);
          cancelSleep();
          cleanupPaginationElements();
          break;
        }
      }

      if (consecutiveFailures >= PAGINATION_CONFIG.MAX_CONSECUTIVE_FAILURES) {
        console.log(
          '[Pagination] Reached max consecutive failures (',
          PAGINATION_CONFIG.MAX_CONSECUTIVE_FAILURES,
          ') - all offers loaded'
        );
        cancelSleep();
        cleanupPaginationElements();
        break;
      }

      const beforeCount = countTiles();
      console.log(
        '[Pagination] Attempt',
        attempt + 1,
        '- button found, tiles before:',
        beforeCount,
        'delay:',
        Math.round(currentDelay) + 'ms'
      );

      const clickStartTime = Date.now();

      withPreservedScroll(() => {
        const reactClickSucceeded = triggerReactClick(button!);
        if (!reactClickSucceeded) {
          button!.click();
        }
      });

      // Invalidate button cache after click - React will re-render a new button
      invalidateButtonCache();

      console.log('[Pagination] Button clicked, waiting up to', currentDelay, 'ms (with early exit)');

      // Use dynamic wait with early exit (respects MIN_DELAY floor)
      const actualWaitTime = await waitForNewTiles(beforeCount, currentDelay);

      const afterCount = countTiles();
      const responseTime = Date.now() - clickStartTime;
      const tileDiff = afterCount - beforeCount;
      console.log(
        '[Pagination] After wait, tiles:',
        afterCount,
        '(+' + tileDiff + ') response:',
        responseTime + 'ms',
        'actual wait:',
        actualWaitTime + 'ms'
      );

      // Check for new tiles
      if (afterCount > beforeCount) {
        pagesLoaded++;
        consecutiveFailures = 0;
        console.log('[Pagination] New tiles loaded! Total pages:', pagesLoaded);

        // Update progress element for content script to read
        let progressElement = document.getElementById(DOM_BRIDGE_IDS.PAGINATION_PROGRESS);
        if (!progressElement) {
          progressElement = document.createElement('div');
          progressElement.id = DOM_BRIDGE_IDS.PAGINATION_PROGRESS;
          progressElement.style.display = 'none';
          document.body.appendChild(progressElement);
        }
        progressElement.setAttribute('data-offers-loaded', afterCount.toString());
        progressElement.setAttribute('data-pages-loaded', pagesLoaded.toString());
        progressElement.setAttribute('data-timestamp', Date.now().toString());

        // Update moving average
        responseTimeHistory.push(responseTime);
        if (responseTimeHistory.length > PAGINATION_CONFIG.HISTORY_SIZE) {
          responseTimeHistory.shift();
        }

        // Calculate moving average
        const avgResponseTime =
          responseTimeHistory.reduce((sum, time) => sum + time, 0) / responseTimeHistory.length;
        console.log(
          '[Pagination] Response time:',
          responseTime,
          'ms, moving avg:',
          Math.round(avgResponseTime),
          'ms'
        );

        // Adaptive delay based on moving average
        if (avgResponseTime < PAGINATION_CONFIG.FAST_THRESHOLD) {
          currentDelay = Math.max(currentDelay * 0.75, PAGINATION_CONFIG.MIN_DELAY);
          console.log('[Pagination] Fast avg - reducing delay to', Math.round(currentDelay), 'ms');
        } else if (avgResponseTime < PAGINATION_CONFIG.SLOW_THRESHOLD) {
          currentDelay = Math.max(currentDelay * 0.88, PAGINATION_CONFIG.MIN_DELAY);
          console.log('[Pagination] Normal avg - reducing delay to', Math.round(currentDelay), 'ms');
        } else {
          console.log('[Pagination] Slow avg - keeping delay at', Math.round(currentDelay), 'ms');
        }
      } else {
        consecutiveFailures++;
        console.log('[Pagination] No new tiles detected (failure', consecutiveFailures, ')');

        if (consecutiveFailures === 1) {
          currentDelay = Math.min(currentDelay * 1.6, PAGINATION_CONFIG.MAX_DELAY);
        } else if (consecutiveFailures === 2) {
          currentDelay = Math.min(currentDelay * 2, PAGINATION_CONFIG.MAX_DELAY);
        } else {
          currentDelay = PAGINATION_CONFIG.MAX_DELAY;
        }

        console.log('[Pagination] Increased delay to', Math.round(currentDelay), 'ms');
      }
    }

    console.log('[Pagination] Pagination complete, pages loaded:', pagesLoaded);
    cancelSleep();

    // Create result element (will be cleaned up by content script)
    const resultElement = document.createElement('div');
    resultElement.id = DOM_BRIDGE_IDS.PAGINATION_RESULT;
    resultElement.setAttribute('data-pages-loaded', pagesLoaded.toString());
    resultElement.style.display = 'none';
    document.body.appendChild(resultElement);

    // Final cleanup of progress and layout elements (result element intentionally left for content script)
    const progressEl = document.getElementById(DOM_BRIDGE_IDS.PAGINATION_PROGRESS);
    const layoutEl = document.getElementById(DOM_BRIDGE_IDS.LAYOUT_INFO);
    const abortEl = document.getElementById(DOM_BRIDGE_IDS.PAGINATION_ABORT);
    if (progressEl) progressEl.remove();
    if (layoutEl) layoutEl.remove();
    if (abortEl) abortEl.remove();
  })();
});
