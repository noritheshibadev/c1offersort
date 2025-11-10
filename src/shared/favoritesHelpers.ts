import { isContextInvalidatedError, safeStorageGet, safeStorageSet } from '../utils/contextCheck';

const STORAGE_KEY_FEED = "c1-offers-favorites-feed";
const STORAGE_KEY_C1OFFERS = "c1-offers-favorites-c1offers";
const MAX_FAVORITES = 1000;
const MAX_STORAGE_SIZE = 1000000;

// Debounced save state
interface SaveQueueItem {
  favorites: Favorite[];
  resolve: () => void;
  reject: (error: Error) => void;
}

let saveQueue: SaveQueueItem | null = null;
let saveTimer: ReturnType<typeof setTimeout> | null = null;

/**
 * Determines the storage key based on the current URL
 * /feed and /c1-offers have separate favorites storage
 */
function getStorageKey(): string {
  const url = window.location.href;
  if (url.includes('/c1-offers')) {
    return STORAGE_KEY_C1OFFERS;
  }
  // Default to feed (includes /feed and any other Capital One offers URLs)
  return STORAGE_KEY_FEED;
}

export interface Favorite {
  merchantTLD: string;
  merchantName: string;
  mileageValue: string;
  favoritedAt: number;
}

export function sanitizeString(input: string, maxLength: number = 500): string {
  if (typeof input !== 'string') return "";
  let cleaned = input.replace(/<[^>]*>/g, '');
  cleaned = cleaned.replace(/\0/g, '');
  cleaned = cleaned.substring(0, maxLength);
  return cleaned.trim();
}

export function sanitizeMerchantName(merchantName: string): string {
  const sanitized = sanitizeString(merchantName, 200);
  return sanitized.length === 0 ? "Unknown Merchant" : sanitized;
}

export function sanitizeMileageValue(mileageValue: string): string {
  const sanitized = sanitizeString(mileageValue, 100).trim();

  // Accept both miles (e.g., "2X miles", "60,000 miles") and cashback (e.g., "4% back", "Up to 52% back")
  const isValidMiles = /\d+[,\d]*\s*(?:X\s*)?miles/i.test(sanitized);
  const isValidCashback = /(?:up\s+to\s+)?\d+(?:\.\d+)?%\s+back/i.test(sanitized);

  if (!isValidMiles && !isValidCashback && sanitized !== "0 miles") {
    return "0 miles";
  }
  return sanitized;
}

export async function getFavorites(): Promise<Favorite[]> {
  try {
    const storageKey = getStorageKey();
    const result = await safeStorageGet(storageKey, { [storageKey]: [] });
    return result[storageKey] || [];
  } catch (error) {
    if (isContextInvalidatedError(error)) {
      console.warn('[Favorites] Extension context invalidated, returning empty favorites');
      return [];
    }
    console.error('[Favorites] Failed to get favorites:', error);
    return [];
  }
}

/**
 * Internal function that performs the actual storage write
 */
async function executeSave(item: SaveQueueItem): Promise<void> {
  try {
    if (item.favorites.length > MAX_FAVORITES) {
      throw new Error(`Favorites limit exceeded (max ${MAX_FAVORITES})`);
    }

    const serialized = JSON.stringify(item.favorites);
    if (serialized.length > MAX_STORAGE_SIZE) {
      throw new Error('Favorites storage too large');
    }

    const storageKey = getStorageKey();
    const success = await safeStorageSet({ [storageKey]: item.favorites });
    if (!success) {
      console.warn('[Favorites] Save skipped - extension context invalidated');
    }
    item.resolve();
  } catch (error) {
    if (isContextInvalidatedError(error)) {
      console.warn('[Favorites] Extension context invalidated during save');
      item.resolve(); // Don't reject on context errors
      return;
    }
    console.error('[Favorites] Save failed:', error);
    item.reject(error instanceof Error ? error : new Error(String(error)));
  }
}

/**
 * Debounced save favorites - waits 100ms after last change before writing
 */
export async function saveFavorites(favorites: Favorite[]): Promise<void> {
  return new Promise((resolve, reject) => {
    // Update queue with latest data
    saveQueue = { favorites, resolve, reject };

    // Clear existing timer
    if (saveTimer) {
      clearTimeout(saveTimer);
    }

    // Schedule save for 100ms after last change
    saveTimer = setTimeout(() => {
      if (saveQueue) {
        const item = saveQueue;
        saveQueue = null;
        saveTimer = null;
        executeSave(item);
      }
    }, 100);
  });
}

/**
 * Flush pending saves immediately (e.g., on extension unload)
 */
export async function flushFavoritesSave(): Promise<void> {
  if (saveTimer) {
    clearTimeout(saveTimer);
    saveTimer = null;
  }

  if (saveQueue) {
    const item = saveQueue;
    saveQueue = null;
    await executeSave(item);
  }
}

/**
 * Checks if a merchant is favorited
 */
export async function isFavorited(merchantTLD: string): Promise<boolean> {
  const favorites = await getFavorites();
  return favorites.some(fav => fav.merchantTLD === merchantTLD);
}

/**
 * Toggles favorite status for a merchant
 * Uses retry logic with conflict detection to prevent race conditions
 */
export async function toggleFavorite(
  merchantTLD: string,
  merchantName: string,
  mileageValue: string
): Promise<boolean> {
  const sanitizedTLD = merchantTLD;
  const sanitizedName = sanitizeMerchantName(merchantName);
  const sanitizedMileage = sanitizeMileageValue(mileageValue);

  const MAX_RETRIES = 3;
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    const favorites = await getFavorites();
    const originalLength = favorites.length;
    const index = favorites.findIndex(fav => fav.merchantTLD === sanitizedTLD);

    let newFavorites: Favorite[];
    let expectedResult: boolean;
    if (index >= 0) {
      newFavorites = [
        ...favorites.slice(0, index),
        ...favorites.slice(index + 1)
      ];
      expectedResult = false;
    } else {
      newFavorites = [
        ...favorites,
        {
          merchantTLD: sanitizedTLD,
          merchantName: sanitizedName,
          mileageValue: sanitizedMileage,
          favoritedAt: Date.now(),
        }
      ];
      expectedResult = true;
    }

    await saveFavorites(newFavorites);

    const verify = await getFavorites();
    const expectedLength = expectedResult ? originalLength + 1 : originalLength - 1;
    if (verify.length === expectedLength) {
      return expectedResult;
    }

    console.warn(`[Favorites] Conflict detected on attempt ${attempt + 1}, retrying...`);
    await new Promise(resolve => setTimeout(resolve, 50 * (attempt + 1)));
  }

  throw new Error("Failed to toggle favorite after retries");
}

export function createStarButton(
  _tile: HTMLElement,
  merchantTLD: string,
  merchantName: string,
  isInitiallyFavorited: boolean
): HTMLButtonElement {
  const button = document.createElement("button");
  button.className = "c1-favorite-star";
  button.textContent = isInitiallyFavorited ? "★" : "☆";

  // Store data for event delegation and table view identification
  button.setAttribute("data-c1-favorite-star", "true");
  button.setAttribute("data-merchant-tld", merchantTLD);
  button.setAttribute("data-merchant-name", merchantName);
  button.setAttribute("data-favorited", isInitiallyFavorited ? "true" : "false");

  button.setAttribute(
    "aria-label",
    isInitiallyFavorited ? "Unfavorite offer" : "Favorite offer"
  );
  button.setAttribute(
    "title",
    isInitiallyFavorited ? "Remove from favorites" : "Add to favorites"
  );

  // Base styles (no transitions - use CSS :hover instead for better performance)
  button.style.cssText = `
    position: absolute;
    top: 8px;
    right: 8px;
    background: rgba(255, 255, 255, 0.9);
    border: 1px solid #e5e5e5;
    border-radius: 50%;
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    font-size: 18px;
    line-height: 1;
    padding: 0;
    z-index: 10;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    transition: transform 0.2s ease, box-shadow 0.2s ease;
  `;

  return button;
}
