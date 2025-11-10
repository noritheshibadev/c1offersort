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

  console.log('[Pagination Injected] Using layout:', layoutName, layoutVersion);
  if (viewMoreSelector) {
    console.log('[Pagination Injected] View More button selector:', viewMoreSelector);
  }

  /**
   * NOTE: This function is duplicated from shared/domHelpers.ts
   * REASON: This script runs in page context and cannot import modules
   * KEEP IN SYNC: If you update domHelpers.countRealTiles(), update this too
   */
  function countRealTiles(): number {
    const allTiles = document.querySelectorAll('[data-testid^="feed-tile-"]');
    let count = 0;
    for (const tile of allTiles) {
      const testId = tile.getAttribute('data-testid') || '';
      if (!testId.includes('skeleton') && !testId.includes('carousel')) {
        count++;
      }
    }
    return count;
  }

  function findViewMoreButton(): HTMLButtonElement | null {
    // Try layout-specific selector first
    if (viewMoreSelector) {
      const button = document.querySelector(viewMoreSelector) as HTMLButtonElement;
      if (button && button.isConnected) {
        return button;
      }
    }

    // Fallback: text-based search (more reliable for React apps that change classes)
    const allButtons = document.querySelectorAll("button");
    for (const btn of allButtons) {
      const text = btn.textContent?.trim() || '';
      // Check for "View More Offers" with flexible whitespace
      if (text.includes('View More') && text.includes('Offers')) {
        return btn as HTMLButtonElement;
      }
    }

    return null;
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

  function withPreservedScroll(fn: () => void): void {
    const scrollX = window.scrollX;
    const scrollY = window.scrollY;
    fn();
    window.scrollTo(scrollX, scrollY);
  }

  function triggerReactClick(element: HTMLElement): boolean {
    // Method 1: Direct React props click (most reliable for React apps)
    const propsKey = Object.keys(element).find(key => key.startsWith('__reactProps'));
    if (propsKey) {
      const props = (element as any)[propsKey];
      if (props && props.onClick) {
        console.log('[Pagination Injected] Triggering React onClick handler directly');
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

    console.log('[Pagination Injected] Button clicked, waiting', currentDelay, 'ms before checking...');
    await wait(currentDelay);

    const afterCount = countRealTiles();
    const responseTime = Date.now() - clickStartTime;
    const tileDiff = afterCount - beforeCount;
    console.log('[Pagination Injected] After wait, tiles:', afterCount, '(+' + tileDiff + ') response:', responseTime + 'ms');

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

      // Adaptive delay based on actual performance
      if (responseTime < FAST_THRESHOLD) {
        // Response was fast - speed up aggressively
        currentDelay = Math.max(currentDelay * 0.75, MIN_DELAY);
        console.log('[Pagination Injected] Fast response (', responseTime, 'ms) - reducing delay to', Math.round(currentDelay), 'ms');
      } else if (responseTime < SLOW_THRESHOLD) {
        // Normal response - moderate speedup
        currentDelay = Math.max(currentDelay * 0.88, MIN_DELAY);
        console.log('[Pagination Injected] Normal response (', responseTime, 'ms) - reducing delay to', Math.round(currentDelay), 'ms');
      } else {
        // Slow response - maintain current delay
        console.log('[Pagination Injected] Slow response (', responseTime, 'ms) - keeping delay at', Math.round(currentDelay), 'ms');
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
