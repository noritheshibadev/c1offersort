import { SELECTORS } from "../utils/constants";

const MULTIPLIER_PATTERN = /(\d+)X\s+miles/i;
const MILES_PATTERN = /(?:Up to )?([0-9,]+)\s+miles/i;
const PERCENT_BACK_PATTERN = /([0-9]+(?:\.[0-9]+)?)%\s*back/i;
const DOLLAR_BACK_PATTERN = /\$([0-9]+(?:\.[0-9]+)?)\s*back/i;
const MAX_BASE64_LENGTH = 10000;
const VALID_TLD_PATTERN = /^[a-z0-9.-]+\.[a-z]{2,}$/i;

export function isSkeletonTile(tile: Element): boolean {
  const testId = tile.getAttribute("data-testid") || "";
  return testId.includes("skeleton");
}

export function isCarouselTile(tile: Element): boolean {
  const testId = tile.getAttribute("data-testid") || "";
  return testId.includes("carousel");
}

export function shouldExcludeTile(tile: Element): boolean {
  return isSkeletonTile(tile) || isCarouselTile(tile);
}

// Cache tile IDs to avoid expensive O(n²) lookups
const tileIdCache = new WeakMap<HTMLElement, string>();

/**
 * Generate a unique ID for a tile
 * Uses data-testid if available, otherwise creates ID from merchant name and cached index
 * PERFORMANCE: Uses WeakMap cache to avoid O(n²) querySelectorAll + indexOf operations
 */
export function getTileId(tile: HTMLElement): string {
  // Check cache first
  const cached = tileIdCache.get(tile);
  if (cached) {
    return cached;
  }

  const testId = tile.getAttribute("data-testid");
  if (testId) {
    tileIdCache.set(tile, testId);
    return testId;
  }

  // For tiles without data-testid (e.g., /c1-offers), create ID from merchant name
  // PERFORMANCE FIX: Don't use indexOf (O(n²)), just use element reference
  const merchantName = extractMerchantName(tile);

  // Use element's own properties for uniqueness instead of expensive indexOf
  const uniqueId = `tile-${merchantName}-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 7)}`.replace(/\s+/g, "-");

  tileIdCache.set(tile, uniqueId);
  return uniqueId;
}

export function countRealTiles(): number {
  const allTiles = document.querySelectorAll('[data-testid^="feed-tile-"]');
  let count = 0;
  let skeletonCount = 0;
  let carouselCount = 0;

  for (const tile of allTiles) {
    if (isSkeletonTile(tile)) {
      skeletonCount++;
    } else if (isCarouselTile(tile)) {
      carouselCount++;
    } else {
      count++;
    }
  }

  console.log("[DOMHelpers] countRealTiles:", {
    totalTiles: allTiles.length,
    realTiles: count,
    skeletonTiles: skeletonCount,
    carouselTiles: carouselCount,
  });

  return count;
}

export function isValidMerchantTLD(tld: unknown): tld is string {
  if (typeof tld !== "string") return false;
  if (tld.length === 0 || tld.length > 100) return false;
  if (tld.includes("..")) return false;
  if (tld.startsWith(".") || tld.startsWith("-")) return false;
  if (tld.endsWith(".") || tld.endsWith("-")) return false;
  return VALID_TLD_PATTERN.test(tld);
}

export function extractMerchantTLDFromDataTestId(tile: HTMLElement): string {
  const dataTestId = tile.getAttribute("data-testid");
  if (!dataTestId || !dataTestId.startsWith("feed-tile-")) {
    return "";
  }

  try {
    const base64Part = dataTestId.replace(/^feed-tile-/, "");

    if (!base64Part || base64Part.length > MAX_BASE64_LENGTH) {
      console.warn("[Security] Base64 data exceeds maximum length");
      return "";
    }

    const jsonString = atob(base64Part);
    const data = JSON.parse(jsonString);

    if (!data || typeof data !== "object") {
      console.warn("[Security] Invalid data structure");
      return "";
    }

    if (!data.inventory || typeof data.inventory !== "object") {
      return "";
    }

    const merchantTLD = data.inventory.merchantTLD;

    if (isValidMerchantTLD(merchantTLD)) {
      return merchantTLD;
    }

    console.warn("[Security] Invalid merchantTLD format detected");
    return "";
  } catch (error) {
    return "";
  }
}

export function extractMerchantTLD(tile: HTMLElement): string {
  const tldFromDataTestId = extractMerchantTLDFromDataTestId(tile);
  if (tldFromDataTestId) {
    return tldFromDataTestId;
  }

  const img = tile.querySelector("img");
  if (img && img.src) {
    try {
      const url = new URL(img.src);
      const domain = url.searchParams.get("domain");
      if (domain) {
        return domain;
      }
    } catch (e) {}
  }

  const link = tile.querySelector("a[href]");
  if (link) {
    try {
      const href = link.getAttribute("href");
      if (href && href.includes("merchantTLD=")) {
        const match = href.match(/merchantTLD=([^&]+)/);
        if (match) {
          return decodeURIComponent(match[1]);
        }
      }
    } catch (e) {}
  }

  return "";
}

/**
 * Converts domain name to display-friendly name
 * Examples: crocs.com → Crocs, cumberlandfarms.com → Cumberland Farms
 */
export function domainToDisplayName(domain: string): string {
  if (!domain) {
    return "Unknown Merchant";
  }

  const nameWithoutTLD = domain.replace(
    /\.(com|net|org|co\.uk|io|app|store|ca|us)$/i,
    ""
  );

  const words = nameWithoutTLD
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/([A-Z])([A-Z][a-z])/g, "$1 $2")
    .split(/[\s_-]+/)
    .filter((w) => w.length > 0);

  const capitalized = words.map(
    (word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
  );

  return capitalized.join(" ");
}

export function extractMerchantName(tile: HTMLElement): string {
  const merchantTLD = extractMerchantTLD(tile);
  if (merchantTLD) {
    return domainToDisplayName(merchantTLD);
  }
  return "Unknown Merchant";
}

export function extractMileageText(tile: HTMLElement): string {
  // Use style attribute for mileage (green color: rgb(37, 129, 14))
  const mileageDiv = tile.querySelector(SELECTORS.mileageText) as HTMLElement;
  if (mileageDiv?.textContent) {
    return mileageDiv.textContent.trim();
  }

  return "0 miles";
}

export function parseMileageValue(text: string): number {
  const cleanedText = text.replace(/\*/g, "").trim();

  // Match multipliers (e.g., "2X miles")
  const multiplierMatch = cleanedText.match(MULTIPLIER_PATTERN);
  if (multiplierMatch) {
    return parseInt(multiplierMatch[1], 10) * 1000;
  }

  // Match mileage (e.g., "60,000 miles")
  const milesMatch = cleanedText.match(MILES_PATTERN);
  if (milesMatch) {
    return parseInt(milesMatch[1].replace(/,/g, ""), 10);
  }

  // Match percentage back (e.g., "10% back")
  const percentBackMatch = cleanedText.match(PERCENT_BACK_PATTERN);
  if (percentBackMatch) {
    // Treat percent as value out of 100, e.g., 10% = 10
    return parseFloat(percentBackMatch[1]);
  }

  // Match dollar back (e.g., "$10 back")
  const dollarBackMatch = cleanedText.match(DOLLAR_BACK_PATTERN);
  if (dollarBackMatch) {
    // Treat dollar as value, e.g., $10 = 10
    return parseFloat(dollarBackMatch[1]);
  }

  return 0;
}

// Cache container to avoid repeated DOM queries
let cachedContainer: HTMLElement | null = null;
let lastContainerCheck = 0;
const CONTAINER_CACHE_TTL = 5000; // Cache for 5 seconds

/**
 * Clear the cached container (useful when page structure changes)
 */
export function clearContainerCache(): void {
  cachedContainer = null;
  lastContainerCheck = 0;
}

export function findMainContainer(): HTMLElement | null {
  // Return cached container if still valid
  const now = Date.now();
  if (cachedContainer && now - lastContainerCheck < CONTAINER_CACHE_TTL) {
    return cachedContainer;
  }

  const container = document.querySelector(SELECTORS.container) as HTMLElement;

  if (container) {
    // Only log on first find or after cache expires
    if (!cachedContainer) {
      console.log("[DOMHelpers] Found offers container");
    }
    cachedContainer = container;
    lastContainerCheck = now;
    return container;
  }

  return null;
}

/**
 * Finds the "View More Offers" pagination button
 */
/**
 * Find all offer tiles in the main container using layout-specific selectors
 * @param suppressWarning - If true, don't log warning when container not found (useful during initial page load)
 */
export function findAllTiles(suppressWarning = false): HTMLElement[] {
  const container = findMainContainer();

  if (!container) {
    if (!suppressWarning) {
      console.warn("[DOMHelpers] Cannot find tiles - no container found");
    }
    return [];
  }

  const tiles = Array.from(
    container.querySelectorAll(SELECTORS.offerTile)
  ) as HTMLElement[];
  // PERFORMANCE: Don't log on every call (called 20+ times during sort)
  return tiles;
}

export function findViewMoreButton(): HTMLButtonElement | null {
  const button = document.querySelector(
    SELECTORS.viewMoreButton
  ) as HTMLButtonElement;

  if (button) {
    console.log('[DOMHelpers] Found "View More Offers" button:', {
      text: button.textContent?.trim(),
      visible: button.offsetParent !== null,
      disabled: button.hasAttribute("disabled"),
    });
    return button;
  }

  console.log('[DOMHelpers] No "View More" button found');
  return null;
}
