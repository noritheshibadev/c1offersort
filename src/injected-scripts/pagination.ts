/**
 * Pagination script injected into page context to access React internals.
 * Duplicates some domHelpers functions to run in page context (necessary for DOM bridge pattern).
 *
 * IMPORTANT: This script cannot import from other modules as it runs in page context.
 * All timing constants are defined here. Modify these values to change pagination behavior.
 */

(async function paginateInPageContext() {
  // ========================================
  // PAGINATION TIMING CONSTANTS
  // Change these values to tune pagination performance
  // ========================================
  const INITIAL_DELAY = 200; // ms - starting delay (faster for quick systems)
  const MIN_DELAY = 150; // ms - floor (faster minimum while still safe for React)
  const MAX_DELAY = 4000; // ms - ceiling (slowest delay for slow connections)
  const RETRY_DELAY = 300; // ms - delay between retries when button not found
  const MAX_RETRIES = 3; // number of quick retries before giving up on button
  const FAST_THRESHOLD = 300; // ms - response time considered "fast" (speed up more)
  const SLOW_THRESHOLD = 1000; // ms - response time considered "slow" (don't speed up)

  console.log('[Pagination Injected] Running in page context');

  // Read layout information from DOM (injected by content script)
  const layoutInfoElement = document.getElementById('c1-layout-info');
  const layoutName = layoutInfoElement?.getAttribute('data-layout-name') || 'unknown';
  const layoutVersion = layoutInfoElement?.getAttribute('data-layout-version') || 'unknown';
  const viewMoreSelector = layoutInfoElement?.getAttribute('data-view-more-selector') || '';
  const tileSelector = layoutInfoElement?.getAttribute('data-tile-selector') || '';
  const containerSelector = layoutInfoElement?.getAttribute('data-container-selector') || '';

  console.log('[Pagination Injected] Using layout:', layoutName, layoutVersion);
  if (viewMoreSelector) {
    console.log('[Pagination Injected] View More button selector:', viewMoreSelector);
  }
  if (tileSelector) {
    console.log('[Pagination Injected] Tile selector:', tileSelector);
  }

  // ========================================
  // TIER 1 OPTIMIZATIONS: DOM CACHING
  // Cache DOM references to reduce repeated queries
  // ========================================
  let cachedContainer: Element | null = null;
  let cachedButton: HTMLButtonElement | null = null;
  let cachedReactPropsKey: string | null = null;

  function getContainer(): Element | null {
    if (cachedContainer && cachedContainer.isConnected) {
      return cachedContainer;
    }

    // Try layout-specific selector first
    if (containerSelector) {
      cachedContainer = document.querySelector(containerSelector);
      if (cachedContainer) {
        return cachedContainer;
      }
    }

    return null;
  }

  function countRealTiles(): number {
    // Try layout-specific selector first with cached container
    if (tileSelector) {
      const container = getContainer();
      if (container) {
        const tiles = container.querySelectorAll(tileSelector);
        console.log('[Pagination Injected] Counted', tiles.length, 'tiles using layout selector');
        return tiles.length;
      }
    }

    // Fallback: use data-testid (legacy method)
    const allTiles = document.querySelectorAll('[data-testid^="feed-tile-"]');
    let count = 0;
    for (const tile of allTiles) {
      const testId = tile.getAttribute('data-testid') || '';
      if (!testId.includes('skeleton') && !testId.includes('carousel')) {
        count++;
      }
    }
    console.log('[Pagination Injected] Counted', count, 'tiles using fallback data-testid method');
    return count;
  }

  function findViewMoreButton(): HTMLButtonElement | null {
    // Check if cached button is still valid
    if (cachedButton && cachedButton.isConnected) {
      return cachedButton;
    }

    // Cache miss or invalidated - search for button
    let button: HTMLButtonElement | null = null;

    // Try layout-specific selector first
    if (viewMoreSelector) {
      button = document.querySelector(viewMoreSelector) as HTMLButtonElement;
      if (button && button.isConnected) {
        cachedButton = button;
        return button;
      }
    }

    // Fallback: text-based search (more reliable for React apps that change classes)
    const allButtons = document.querySelectorAll("button");
    for (const btn of allButtons) {
      const text = btn.textContent?.trim() || '';
      // Check for "View More Offers" with flexible whitespace
      if (text.includes('View More') && text.includes('Offers')) {
        button = btn as HTMLButtonElement;
        cachedButton = button;
        return button;
      }
    }

    return null;
  }

  function invalidateButtonCache(): void {
    cachedButton = null;
  }

  let activeTimeout: ReturnType<typeof setTimeout> | null = null;

  async function wait(ms: number): Promise<void> {
    return new Promise(resolve => {
      activeTimeout = setTimeout(() => {
        activeTimeout = null;
        resolve();
      }, ms);
    });
  }

  function cancelActiveTimeout(): void {
    if (activeTimeout !== null) {
      clearTimeout(activeTimeout);
      activeTimeout = null;
    }
  }

  // ========================================
  // TIER 2 OPTIMIZATIONS: DYNAMIC WAIT WITH EARLY EXIT
  // Poll for new tiles and exit early when detected, but always respect MIN_DELAY
  // ========================================
  async function waitForNewTiles(startCount: number, maxWait: number): Promise<number> {
    const startTime = Date.now();
    const pollInterval = 50; // Check every 50ms for new tiles
    let lastCount = startCount;

    while (true) {
      const elapsed = Date.now() - startTime;

      // Always wait at least MIN_DELAY to protect slow React rendering
      if (elapsed < MIN_DELAY) {
        await wait(pollInterval);
        continue;
      }

      // After MIN_DELAY, check for new tiles
      const currentCount = countRealTiles();

      if (currentCount > lastCount) {
        // New tiles detected! Exit early
        const actualTime = Date.now() - startTime;
        console.log('[Pagination Injected] Early exit: new tiles detected after', actualTime, 'ms (saved', maxWait - actualTime, 'ms)');
        return actualTime;
      }

      // Check if we've exceeded max wait time
      if (elapsed >= maxWait) {
        return Date.now() - startTime;
      }

      lastCount = currentCount;
      await wait(pollInterval);
    }
  }

  function withPreservedScroll(fn: () => void): void {
    const scrollX = window.scrollX;
    const scrollY = window.scrollY;
    fn();
    window.scrollTo(scrollX, scrollY);
  }

  function triggerReactClick(element: HTMLElement): boolean {
    // Method 1: Direct React props click (most reliable for React apps)
    // Cache the propsKey after first discovery for faster subsequent calls
    if (!cachedReactPropsKey) {
      cachedReactPropsKey = Object.keys(element).find(key => key.startsWith('__reactProps')) || null;
    }

    if (cachedReactPropsKey) {
      const props = (element as any)[cachedReactPropsKey];
      if (props && props.onClick) {
        console.log('[Pagination Injected] Triggering React onClick handler directly (cached key)');
        props.onClick();
        return true;
      }
    }

    // Method 2: Fallback to event dispatch
    console.log('[Pagination Injected] React props not found, falling back to event dispatch');
    const rect = element.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;

    // Dispatch all mouse events
    ['mousedown', 'mouseup', 'click'].forEach(eventType => {
      const event = new MouseEvent(eventType, {
        view: window,
        bubbles: true,
        cancelable: true,
        clientX: x,
        clientY: y,
        button: 0
      });
      element.dispatchEvent(event);
    });

    // Also trigger pointer events
    ['pointerdown', 'pointerup'].forEach(eventType => {
      const event = new PointerEvent(eventType, {
        view: window,
        bubbles: true,
        cancelable: true,
        clientX: x,
        clientY: y,
        button: 0,
        pointerType: 'mouse'
      });
      element.dispatchEvent(event);
    });

    return false;
  }

  let pagesLoaded = 0;
  let currentDelay = INITIAL_DELAY;
  const maxAttempts = 50;
  let consecutiveFailures = 0;
  const maxConsecutiveFailures = 3;

  // ========================================
  // TIER 2 OPTIMIZATIONS: MOVING AVERAGE
  // Track recent response times for smoother delay adjustment
  // ========================================
  const responseTimeHistory: number[] = [];
  const HISTORY_SIZE = 5;

  console.log('[Pagination Injected] Starting pagination loop with adaptive delays');

  // Create abort signal element for cleanup
  const abortElement = document.createElement('div');
  abortElement.id = 'c1-pagination-abort';
  abortElement.style.display = 'none';
  document.body.appendChild(abortElement);

  // Cleanup helper to remove all pagination DOM elements
  function cleanupAllElements() {
    const elementsToRemove = [
      'c1-pagination-progress',
      'c1-pagination-result',
      'c1-layout-info',
      'c1-pagination-abort'
    ];
    elementsToRemove.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.remove();
    });
  }

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    // Check for abort signal
    if (!document.getElementById('c1-pagination-abort')) {
      console.log('[Pagination Injected] Abort signal detected, stopping pagination');
      cancelActiveTimeout();
      cleanupAllElements();
      break;
    }

    let button = findViewMoreButton();

    if (!button) {
      console.log('[Pagination Injected] Button not found on attempt', attempt + 1, '/', maxAttempts, '- retrying with exponential backoff...');

      // Invalidate button cache since it's not found
      invalidateButtonCache();

      // Exponential backoff: if React is still rendering, give it progressively more time
      for (let retry = 0; retry < MAX_RETRIES; retry++) {
        const retryWait = RETRY_DELAY * Math.pow(1.5, retry); // 300ms, 450ms, 675ms
        await wait(retryWait);
        button = findViewMoreButton();
        if (button) {
          console.log('[Pagination Injected] ✓ Button found after', retry + 1, 'retries (waited', Math.round(retryWait) + 'ms), continuing...');
          break;
        } else {
          console.log('[Pagination Injected] Retry', retry + 1, '/', MAX_RETRIES, 'failed (waited', Math.round(retryWait) + 'ms)');
        }
      }

      if (!button) {
        console.log('[Pagination Injected] ✗ Button still not found after', MAX_RETRIES, 'retries - pagination complete');
        console.log('[Pagination Injected] Total pages loaded:', pagesLoaded);
        cancelActiveTimeout();
        cleanupAllElements();
        break;
      }
    }

    if (consecutiveFailures >= maxConsecutiveFailures) {
      console.log('[Pagination Injected] Reached max consecutive failures (', maxConsecutiveFailures, ') - all offers loaded');
      cancelActiveTimeout();
      cleanupAllElements();
      break;
    }

    const beforeCount = countRealTiles();
    console.log('[Pagination Injected] ✓ Attempt', attempt + 1, '- button found, tiles before:', beforeCount, 'delay:', Math.round(currentDelay) + 'ms');

    const clickStartTime = Date.now();

    withPreservedScroll(() => {
      const reactClickSucceeded = triggerReactClick(button);
      if (!reactClickSucceeded) {
        button.click();
      }
    });

    // Invalidate button cache after click - React will re-render a new button
    invalidateButtonCache();

    console.log('[Pagination Injected] Button clicked, waiting up to', currentDelay, 'ms (with early exit)...');

    // Use dynamic wait with early exit (respects MIN_DELAY floor)
    const actualWaitTime = await waitForNewTiles(beforeCount, currentDelay);

    const afterCount = countRealTiles();
    const responseTime = Date.now() - clickStartTime;
    const tileDiff = afterCount - beforeCount;
    console.log('[Pagination Injected] After wait, tiles:', afterCount, '(+' + tileDiff + ') response:', responseTime + 'ms', 'actual wait:', actualWaitTime + 'ms');

    // ====================================
    // CHECK FOR NEW TILES
    // ====================================
    if (afterCount > beforeCount) {
      pagesLoaded++;
      consecutiveFailures = 0;
      console.log('[Pagination Injected] New tiles loaded! Total pages:', pagesLoaded);

      let progressElement = document.getElementById('c1-pagination-progress');
      if (!progressElement) {
        progressElement = document.createElement('div');
        progressElement.id = 'c1-pagination-progress';
        progressElement.style.display = 'none';
        document.body.appendChild(progressElement);
      }
      progressElement.setAttribute('data-offers-loaded', afterCount.toString());
      progressElement.setAttribute('data-pages-loaded', pagesLoaded.toString());
      progressElement.setAttribute('data-timestamp', Date.now().toString());

      // ====================================
      // TIER 2 OPTIMIZATION: MOVING AVERAGE DELAY ADJUSTMENT
      // Use average of recent response times for smoother adaptation
      // ====================================
      responseTimeHistory.push(responseTime);
      if (responseTimeHistory.length > HISTORY_SIZE) {
        responseTimeHistory.shift(); // Keep only last 5 samples
      }

      // Calculate moving average
      const avgResponseTime = responseTimeHistory.reduce((sum, time) => sum + time, 0) / responseTimeHistory.length;
      console.log('[Pagination Injected] Response time:', responseTime, 'ms, moving avg:', Math.round(avgResponseTime), 'ms');

      // Adaptive delay based on moving average (smoother than single-sample)
      if (avgResponseTime < FAST_THRESHOLD) {
        // Average response is fast - speed up aggressively
        currentDelay = Math.max(currentDelay * 0.75, MIN_DELAY);
        console.log('[Pagination Injected] Fast avg response (', Math.round(avgResponseTime), 'ms) - reducing delay to', Math.round(currentDelay), 'ms');
      } else if (avgResponseTime < SLOW_THRESHOLD) {
        // Normal average response - moderate speedup
        currentDelay = Math.max(currentDelay * 0.88, MIN_DELAY);
        console.log('[Pagination Injected] Normal avg response (', Math.round(avgResponseTime), 'ms) - reducing delay to', Math.round(currentDelay), 'ms');
      } else {
        // Slow average response - maintain current delay
        console.log('[Pagination Injected] Slow avg response (', Math.round(avgResponseTime), 'ms) - keeping delay at', Math.round(currentDelay), 'ms');
      }
    } else {
      consecutiveFailures++;
      console.log('[Pagination Injected] No new tiles detected (failure', consecutiveFailures, ')');

      if (consecutiveFailures === 1) {
        currentDelay = Math.min(currentDelay * 1.6, MAX_DELAY);
      } else if (consecutiveFailures === 2) {
        currentDelay = Math.min(currentDelay * 2, MAX_DELAY);
      } else {
        currentDelay = MAX_DELAY;
      }

      console.log('[Pagination Injected] Increased delay to', Math.round(currentDelay), 'ms');
    }
  }

  console.log('[Pagination Injected] Pagination complete, pages loaded:', pagesLoaded);
  cancelActiveTimeout(); // Clear any pending timeout

  // Create result element (will be cleaned up by content script)
  const resultElement = document.createElement('div');
  resultElement.id = 'c1-pagination-result';
  resultElement.setAttribute('data-pages-loaded', pagesLoaded.toString());
  resultElement.style.display = 'none';
  document.body.appendChild(resultElement);

  // Final cleanup of progress and layout elements (result element intentionally left for content script)
  const progressEl = document.getElementById('c1-pagination-progress');
  const layoutEl = document.getElementById('c1-layout-info');
  const abortEl = document.getElementById('c1-pagination-abort');
  if (progressEl) progressEl.remove();
  if (layoutEl) layoutEl.remove();
  if (abortEl) abortEl.remove();
})();
