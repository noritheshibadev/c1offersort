/**
 * Valid Capital One Offers URLs
 *
 * The extension works on both URL patterns:
 * - /feed - Main offers feed page (has data-testid on tiles)
 * - /c1-offers - Alternative offers page (no data-testid on tiles)
 *
 * As of January 2025, both URLs use identical layouts.
 */
export const VALID_URLS = [
  "https://capitaloneoffers.com/feed",
  "https://capitaloneoffers.com/c1-offers",
] as const;

/**
 * DOM Selectors for Capital One Offers Page
 * Optimized based on actual DOM structure (verified Jan 2025)
 */
export const SELECTORS = {
  /** Main container holding all offer tiles */
  container: ".grid.gap-4.h-full.w-full",

  /** Individual offer tile wrapper */
  offerTile: ".flex.w-full.h-full.cursor-pointer",

  /** Standard tile child element (reliable marker) */
  standardTile: ".standard-tile",

  /** Mileage text element (uses green color: rgb(37, 129, 14)) */
  mileageText: 'div[style*="rgb(37, 129, 14)"]',

  /** "View More Offers" button for pagination */
  viewMoreButton: "button.text-base.justify-center.w-full.font-semibold.cursor-pointer",
} as const;

export const COLORS = {
  PRIMARY_BACKGROUND: "#013d5b",
  PRIMARY_GREEN: "#25810E",
  PRIMARY_YELLOW: "#FFDD00",
  WHITE: "#ffffff",
  ERROR_OVERLAY: "rgba(0, 0, 0, 0.9)",
} as const;

/**
 * Pagination timing constants
 * These control the adaptive delay behavior when loading all offers
 */
export const PAGINATION_CONFIG = {
  /** Starting delay in ms (faster for quick systems) */
  INITIAL_DELAY: 400,
  /**
   * Minimum delay floor in ms. Two pressures set this:
   *  - It must clear C1's immediate partial-render flicker (~250ms); robustness
   *    against the variable render/button-detach gap comes from STABILIZE_POLLS.
   *  - It paces "View More" clicks so we don't trip C1's API rate limit (HTTP
   *    429). A 250ms floor proved too aggressive and drew constant 429s, so the
   *    floor is raised to keep a sustainable request cadence. Bursts that still
   *    hit a 429 are handled by the rate-limit backoff in pagination.ts.
   */
  MIN_DELAY: 400,
  /**
   * Consecutive steady tile-count polls required before treating a "View More"
   * batch as fully rendered. This is the primary defense against C1's two-phase
   * render (a small partial batch lands first, the full batch ~250ms+ later):
   * we wait for the count to hold steady rather than exiting on the first tick.
   * At POLL_INTERVAL=50ms, 2 polls confirms over ~100ms.
   */
  STABILIZE_POLLS: 2,
  /** Maximum delay ceiling in ms (slowest for slow connections) */
  MAX_DELAY: 4000,
  /** Delay between retries when button not found */
  RETRY_DELAY: 400,
  /**
   * Number of quick retries before giving up on button. With RETRY_DELAY=400
   * and 1.5^n backoff this spans ~400+600+900+1350ms, far exceeding C1's
   * ~250ms button-detach window even under load.
   */
  MAX_RETRIES: 4,
  /** Response time considered "fast" - speed up more aggressively */
  FAST_THRESHOLD: 300,
  /** Response time considered "slow" - don't speed up */
  SLOW_THRESHOLD: 1000,
  /** Maximum pagination attempts */
  MAX_ATTEMPTS: 50,
  /** Maximum consecutive failures before stopping */
  MAX_CONSECUTIVE_FAILURES: 3,
  /** Number of response times to average for adaptive delay */
  HISTORY_SIZE: 5,
  /** Polling interval for checking new tiles */
  POLL_INTERVAL: 50,

  // --- Rate-limit (HTTP 429) backoff ---
  /**
   * How long after a 429 we still consider ourselves rate-limited. If a 429 was
   * seen within this window before a click, we back off first.
   */
  RATE_LIMIT_WINDOW: 3000,
  /** First backoff wait after a 429, in ms. Doubles on each consecutive 429. */
  RATE_LIMIT_BASE_BACKOFF: 2000,
  /** Ceiling on the 429 backoff wait, in ms. */
  RATE_LIMIT_MAX_BACKOFF: 16000,
  /**
   * Consecutive 429-triggered backoffs to attempt before giving up. At
   * 2s,4s,8s,16s,16s this waits ~46s for the limit to clear before stopping.
   */
  RATE_LIMIT_MAX_BACKOFFS: 5,
} as const;
