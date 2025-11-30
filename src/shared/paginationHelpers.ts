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
 * Wait for new tiles to appear with early exit
 * Polls for tile count changes and exits early when new tiles detected
 */
export async function waitForNewTiles(startCount: number, maxWait: number): Promise<number> {
  const startTime = Date.now();
  let lastCount = startCount;

  while (true) {
    const elapsed = Date.now() - startTime;

    // Always wait at least MIN_DELAY to protect slow React rendering
    if (elapsed < PAGINATION_CONFIG.MIN_DELAY) {
      await sleep(PAGINATION_CONFIG.POLL_INTERVAL);
      continue;
    }

    // After MIN_DELAY, check for new tiles
    const currentCount = countTiles();

    if (currentCount > lastCount) {
      // New tiles detected! Exit early
      const actualTime = Date.now() - startTime;
      console.log(
        '[Pagination] Early exit: new tiles detected after',
        actualTime,
        'ms (saved',
        maxWait - actualTime,
        'ms)'
      );
      return actualTime;
    }

    // Check if we've exceeded max wait time
    if (elapsed >= maxWait) {
      return Date.now() - startTime;
    }

    lastCount = currentCount;
    await sleep(PAGINATION_CONFIG.POLL_INTERVAL);
  }
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
