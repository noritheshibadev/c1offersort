import Fuse from 'fuse.js';
import { findAllTiles } from '../../../shared/domHelpers';
import { extractMerchantName, extractMerchantTLD, extractMileageText } from '../../../shared/domHelpers';

export interface SearchableOffer {
  merchantName: string;
  merchantTLD: string;
  mileageText: string;
  element: HTMLElement;
}

// Global search index (built once after pagination completes)
let searchIndex: Fuse<SearchableOffer> | null = null;
let searchData: SearchableOffer[] = [];

/**
 * Build search index from all offer tiles
 * Called after pagination completes
 */
export function buildSearchIndex(): { success: boolean; offerCount: number } {
  console.log('[Search] Building search index...');

  const tiles = findAllTiles();

  if (tiles.length === 0) {
    console.warn('[Search] No tiles found to index');
    return { success: false, offerCount: 0 };
  }

  // Extract searchable data from all tiles
  searchData = tiles.map(tile => ({
    merchantName: extractMerchantName(tile),
    merchantTLD: extractMerchantTLD(tile),
    mileageText: extractMileageText(tile),
    element: tile,
  }));

  // Configure Fuse.js for fuzzy matching
  searchIndex = new Fuse(searchData, {
    keys: ['merchantName'],
    threshold: 0.4, // 0 = perfect match, 1 = match anything
    includeScore: true,
    minMatchCharLength: 2,
    ignoreLocation: true, // Allow matches anywhere in string
  });

  console.log('[Search] Index built successfully:', {
    offerCount: searchData.length,
    uniqueMerchants: new Set(searchData.map(o => o.merchantName)).size,
  });

  return { success: true, offerCount: searchData.length };
}

/**
 * Get the current search index
 */
export function getSearchIndex(): Fuse<SearchableOffer> | null {
  return searchIndex;
}

/**
 * Get search data
 */
export function getSearchData(): SearchableOffer[] {
  return searchData;
}

/**
 * Clear search index (e.g., on page navigation)
 */
export function clearSearchIndex(): void {
  searchIndex = null;
  searchData = [];
  console.log('[Search] Index cleared');
}

/**
 * Check if search index is ready
 */
export function isSearchIndexReady(): boolean {
  return searchIndex !== null && searchData.length > 0;
}
