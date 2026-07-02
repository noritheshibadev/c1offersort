/**
 * Shared pagination helpers for main world script.
 * These functions run in the page context and can access React internals.
 *
 * Note: This module is imported by the unlisted pagination script and bundled
 * at build time, so it CAN import from other modules.
 */

import { SELECTORS, PAGINATION_CONFIG } from '@/utils/constants';

// ========================================
// DOM CACHING
// ========================================

let cachedContainer: Element | null = null;
let cachedButton: HTMLButtonElement | null = null;
let cachedReactPropsKey: string | null = null;

/**
 * Get the main offers container, with caching
 */
export function getContainer(): Element | null {
  if (cachedContainer && cachedContainer.isConnected) {
    return cachedContainer;
  }

  if (SELECTORS.container) {
    cachedContainer = document.querySelector(SELECTORS.container);
    if (cachedContainer) {
      return cachedContainer;
    }
  }

  return null;
}

/**
 * Count real offer tiles (excluding skeleton/carousel)
 */
export function countTiles(): number {
  // Try layout-specific selector first with cached container
  if (SELECTORS.offerTile) {
    const container = getContainer();
    if (container) {
      const tiles = container.querySelectorAll(SELECTORS.offerTile);
      console.log('[Pagination] Counted', tiles.length, 'tiles using layout selector');
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
  console.log('[Pagination] Counted', count, 'tiles using fallback data-testid method');
  return count;
}

/**
 * Find the "View More Offers" pagination button
 */
export function findButton(): HTMLButtonElement | null {
  // Check if cached button is still valid
  if (cachedButton && cachedButton.isConnected) {
    return cachedButton;
  }

  // Cache miss or invalidated - search for button
  let button: HTMLButtonElement | null = null;

  // Try layout-specific selector first
  if (SELECTORS.viewMoreButton) {
    button = document.querySelector(SELECTORS.viewMoreButton) as HTMLButtonElement;
    if (button && button.isConnected) {
      cachedButton = button;
      return button;
    }
  }

  // Fallback: text-based search (more reliable for React apps that change classes)
  const allButtons = document.querySelectorAll('button');
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

/**
 * Invalidate the cached button (call after clicking)
 */
export function invalidateButtonCache(): void {
  cachedButton = null;
}

/**
 * Trigger a React-compatible click on an element
 * Accesses React's internal props to call onClick directly
 */
export function triggerReactClick(element: HTMLElement): boolean {
  // Method 1: Direct React props click (most reliable for React apps)
  // Cache the propsKey after first discovery for faster subsequent calls
  if (!cachedReactPropsKey) {
    cachedReactPropsKey =
      Object.keys(element).find((key) => key.startsWith('__reactProps')) || null;
  }

  if (cachedReactPropsKey) {
    const props = (element as Record<string, unknown>)[cachedReactPropsKey] as
      | { onClick?: () => void }
      | undefined;
    if (props && props.onClick) {
      console.log('[Pagination] Triggering React onClick handler directly (cached key)');
      props.onClick();
      return true;
    }
  }

  // Method 2: Fallback to event dispatch
  console.log('[Pagination] React props not found, falling back to event dispatch');
  const rect = element.getBoundingClientRect();
  const x = rect.left + rect.width / 2;
  const y = rect.top + rect.height / 2;

  // Dispatch all mouse events
  ['mousedown', 'mouseup', 'click'].forEach((eventType) => {
    const event = new MouseEvent(eventType, {
      view: window,
      bubbles: true,
      cancelable: true,
      clientX: x,
      clientY: y,
      button: 0,
    });
    element.dispatchEvent(event);
  });

  // Also trigger pointer events
  ['pointerdown', 'pointerup'].forEach((eventType) => {
    const event = new PointerEvent(eventType, {
      view: window,
      bubbles: true,
      cancelable: true,
      clientX: x,
      clientY: y,
      button: 0,
      pointerType: 'mouse',
    });
    element.dispatchEvent(event);
  });

  return false;
}

/**
 * Execute a function while preserving scroll position
 */
export function withPreservedScroll(fn: () => void): void {
  const scrollX = window.scrollX;
  const scrollY = window.scrollY;
  fn();
  window.scrollTo(scrollX, scrollY);
}

/**
 * Wait for new tiles to appear, then wait for the count to STABILIZE.
 *
 * Capital One renders a "View More" batch in two phases: a small partial batch
 * lands almost immediately (e.g. +6 tiles) and the full batch (e.g. +90) lands
 * ~250ms later. Exiting on the first count increase returns mid-render, while
 * the button is transiently detached — which makes the caller think pagination
 * is complete. So once tiles start arriving we keep polling until the count
 * holds steady across STABILIZE_POLLS consecutive checks before returning.
 */
export async function waitForNewTiles(startCount: number, maxWait: number): Promise<number> {
  const startTime = Date.now();
  let lastCount = startCount;
  let stableCount = 0;
  let sawIncrease = false;

  while (true) {
    const elapsed = Date.now() - startTime;

    // Always wait at least MIN_DELAY to protect slow React rendering
    if (elapsed < PAGINATION_CONFIG.MIN_DELAY) {
      await sleep(PAGINATION_CONFIG.POLL_INTERVAL);
      continue;
    }

    const currentCount = countTiles();

    if (currentCount > lastCount) {
      // Growth detected (possibly a partial batch) - keep waiting for the
      // count to settle rather than exiting on the first tick.
      sawIncrease = true;
      stableCount = 0;
      lastCount = currentCount;
    } else if (sawIncrease) {
      // No growth this poll, but we've already seen tiles arrive. Count
      // consecutive steady polls; once stable, the batch has fully landed.
      stableCount++;
      if (stableCount >= PAGINATION_CONFIG.STABILIZE_POLLS) {
        const actualTime = Date.now() - startTime;
        console.log(
          '[Pagination] Tiles stabilized at',
          currentCount,
          'after',
          actualTime,
          'ms'
        );
        return actualTime;
      }
    }

    // Hard ceiling so a stuck render can't hang the loop forever.
    if (elapsed >= maxWait) {
      return Date.now() - startTime;
    }

    await sleep(PAGINATION_CONFIG.POLL_INTERVAL);
  }
}

// ========================================
// RATE-LIMIT (HTTP 429) DETECTION
// ========================================

/**
 * Timestamp (ms) of the most recently observed HTTP 429 response, or 0 if none.
 * The pagination loop reads this to decide when to back off.
 */
let lastRateLimitTime = 0;

/** Original network functions, captured so monitoring can be removed cleanly. */
let originalFetch: typeof window.fetch | null = null;
let originalXhrOpen: typeof XMLHttpRequest.prototype.open | null = null;

/**
 * Clear the rate-limit marker. Call this after backing off so the next click is
 * actually attempted; the backoff then only escalates if that click draws a
 * fresh 429, rather than re-triggering on a stale timestamp.
 */
export function clearRateLimit(): void {
  lastRateLimitTime = 0;
}

/**
 * Returns true if a 429 was observed within the last `windowMs` milliseconds.
 */
export function wasRecentlyRateLimited(windowMs: number): boolean {
  return lastRateLimitTime > 0 && Date.now() - lastRateLimitTime < windowMs;
}

/**
 * Start watching network responses for HTTP 429 (Too Many Requests).
 *
 * The pagination loop clicks a React button and never sees HTTP responses
 * directly, so we wrap fetch and XHR to record when Capital One rate-limits us.
 * Wrappers are pass-through and only inspect the status code.
 */
export function startRateLimitMonitor(): void {
  if (originalFetch) return; // already monitoring

  const markIf429 = (status: number) => {
    if (status === 429) {
      lastRateLimitTime = Date.now();
      console.warn('[Pagination] Detected HTTP 429 (rate limited)');
    }
  };

  originalFetch = window.fetch;
  window.fetch = async function (...args: Parameters<typeof window.fetch>) {
    const response = await originalFetch!.apply(this, args);
    markIf429(response.status);
    return response;
  };

  originalXhrOpen = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function (
    this: XMLHttpRequest,
    ...args: Parameters<typeof XMLHttpRequest.prototype.open>
  ) {
    this.addEventListener('loadend', () => markIf429(this.status));
    return originalXhrOpen!.apply(this, args);
  };
}

/**
 * Stop watching network responses and restore the original fetch/XHR.
 */
export function stopRateLimitMonitor(): void {
  if (originalFetch) {
    window.fetch = originalFetch;
    originalFetch = null;
  }
  if (originalXhrOpen) {
    XMLHttpRequest.prototype.open = originalXhrOpen;
    originalXhrOpen = null;
  }
  lastRateLimitTime = 0;
}

/**
 * Sleep utility with cancellation support
 */
let activeTimeout: ReturnType<typeof setTimeout> | null = null;

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    activeTimeout = setTimeout(() => {
      activeTimeout = null;
      resolve();
    }, ms);
  });
}

export function cancelSleep(): void {
  if (activeTimeout !== null) {
    clearTimeout(activeTimeout);
    activeTimeout = null;
  }
}

/**
 * DOM element IDs used for communication between page and extension
 */
export const DOM_BRIDGE_IDS = {
  LAYOUT_INFO: 'c1-layout-info',
  PAGINATION_PROGRESS: 'c1-pagination-progress',
  PAGINATION_RESULT: 'c1-pagination-result',
  PAGINATION_ABORT: 'c1-pagination-abort',
} as const;

/**
 * Clean up all pagination-related DOM elements
 */
export function cleanupPaginationElements(): void {
  Object.values(DOM_BRIDGE_IDS).forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.remove();
  });
}
