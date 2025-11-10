import { useState, useCallback, useEffect, useRef } from 'react';
import type { SearchResult } from '../../types/messages';
import { chromeService } from '@/services/ChromeService';
import { useMessageSubscription } from '../context/MessageBusContext';

interface UseSearchResult {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  searchResults: SearchResult[];
  isSearching: boolean;
  searchEnabled: boolean;
  isFullyPaginated: boolean;
  totalMatches: number;
  handleSearch: (query: string) => Promise<void>;
  handleSelectResult: (merchantTLD: string) => Promise<void>;
  error: string | null;
}

/**
 * Custom hook for managing search state and execution.
 *
 * Handles:
 * - Search query state
 * - Executing searches via content script
 * - Managing search results
 * - Scrolling to selected offers
 * - Debouncing search queries
 */
export function useSearch(currentTabId?: number): UseSearchResult {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchEnabled, setSearchEnabled] = useState(false);
  const [isFullyPaginated, setIsFullyPaginated] = useState(false);
  const [totalMatches, setTotalMatches] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Debounce timer
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Consolidated helper: Build search index and enable search
  const buildIndexAndEnableSearch = useCallback(async (tabId: number): Promise<void> => {
    try {
      const indexResponse = await chromeService.buildSearchIndex(tabId);
      if (indexResponse && indexResponse.success) {
        setSearchEnabled(true);
        setIsFullyPaginated(true);
        console.log('[useSearch] Search enabled with', indexResponse.offerCount, 'offers');
      }
    } catch (err) {
      console.log('[useSearch] Failed to build index:', err);
    }
  }, []);

  // Check pagination status on mount
  useEffect(() => {
    async function checkPaginationStatus() {
      if (!currentTabId) return;

      try {
        // Query current pagination status
        const response = await chromeService.getPaginationStatus(currentTabId);

        if (response) {
          setIsFullyPaginated(response.fullyPaginated || false);

          // Only enable search if fully paginated
          if (response.fullyPaginated) {
            await buildIndexAndEnableSearch(currentTabId);
          }

          console.log('[useSearch] Initial pagination status:', {
            fullyPaginated: response.fullyPaginated,
          });
        }
      } catch (err) {
        console.log('[useSearch] Failed to check pagination status:', err);
        setSearchEnabled(false);
        setIsFullyPaginated(false);
      }
    }

    checkPaginationStatus();
  }, [currentTabId, buildIndexAndEnableSearch]);

  // Listen for sort completion to enable search
  useMessageSubscription(
    'SORT_COMPLETE',
    async () => {
      if (currentTabId) {
        await buildIndexAndEnableSearch(currentTabId);
      }
    },
    [currentTabId, buildIndexAndEnableSearch]
  );

  const handleSearch = useCallback(
    async (query: string) => {
      if (!currentTabId) {
        console.log('[useSearch] No active tab');
        return;
      }

      // Clear previous timer
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      // Reset results immediately for empty query
      if (!query || query.trim().length < 2) {
        setSearchResults([]);
        setTotalMatches(0);
        setError(null);
        return;
      }

      setIsSearching(true);
      setError(null);

      // Debounce search (150ms)
      debounceTimerRef.current = setTimeout(async () => {
        try {
          console.log('[useSearch] Executing search:', query);

          const response = await chromeService.sendSearchQuery(currentTabId, query.trim());

          if (response.success) {
            setSearchResults(response.results || []);
            setTotalMatches(response.totalMatches || 0);
            setSearchEnabled(response.searchEnabled);
            setError(null);

            console.log('[useSearch] Search complete:', {
              results: response.results?.length || 0,
              total: response.totalMatches,
            });
          } else {
            setSearchResults([]);
            setTotalMatches(0);
            setError(response.error || 'Search failed');
          }
        } catch (err) {
          console.error('[useSearch] Search error:', err);
          setSearchResults([]);
          setTotalMatches(0);
          setError(err instanceof Error ? err.message : 'Search failed');
        } finally {
          setIsSearching(false);
        }
      }, 150);
    },
    [currentTabId]
  );

  const handleSelectResult = useCallback(
    async (merchantTLD: string) => {
      if (!currentTabId) {
        console.log('[useSearch] No active tab');
        return;
      }

      try {
        console.log('[useSearch] Scrolling to offer');

        const response = await chromeService.scrollToOffer(currentTabId, merchantTLD);

        if (!response.success) {
          console.error('[useSearch] Scroll failed:', response.error);
          setError(response.error || 'Failed to scroll to offer');
        }
      } catch (err) {
        console.error('[useSearch] Scroll error:', err);
        setError(err instanceof Error ? err.message : 'Failed to scroll to offer');
      }
    },
    [currentTabId]
  );

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  return {
    searchQuery,
    setSearchQuery,
    searchResults,
    isSearching,
    searchEnabled,
    isFullyPaginated,
    totalMatches,
    handleSearch,
    handleSelectResult,
    error,
  };
}
