import { getSearchIndex, isSearchIndexReady } from './buildSearchIndex';
import type { SearchResult } from '../../../types/messages';

const MAX_RESULTS = 10;

/**
 * Execute fuzzy search and return top matches
 */
export function executeSearch(query: string): {
  success: boolean;
  results: SearchResult[];
  totalMatches: number;
  error?: string;
} {
  // Validate query
  if (!query || query.trim().length < 2) {
    return {
      success: false,
      results: [],
      totalMatches: 0,
      error: 'Query must be at least 2 characters',
    };
  }

  // Check if index is ready
  if (!isSearchIndexReady()) {
    return {
      success: false,
      results: [],
      totalMatches: 0,
      error: 'Search index not ready',
    };
  }

  const searchIndex = getSearchIndex();
  if (!searchIndex) {
    return {
      success: false,
      results: [],
      totalMatches: 0,
      error: 'Search index not available',
    };
  }

  // Perform fuzzy search
  const fuseResults = searchIndex.search(query);

  console.log('[Search] Query:', query, 'Matches:', fuseResults.length);

  // Take top N results and format
  const results: SearchResult[] = fuseResults
    .slice(0, MAX_RESULTS)
    .map(result => ({
      merchantName: result.item.merchantName,
      merchantTLD: result.item.merchantTLD,
      mileageText: result.item.mileageText,
      score: result.score || 0,
    }));

  return {
    success: true,
    results,
    totalMatches: fuseResults.length,
  };
}
