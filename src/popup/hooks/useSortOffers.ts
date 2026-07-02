import { useState, useCallback, useEffect, useRef } from "react";
import type { SortConfig, SortResult, OfferType, ChannelType } from "../../types";
import type { SortProgress } from "../../types/progress";
import type { ExtensionMessage } from "../../types/messages";
import { isValidCapitalOneUrl } from "../../utils/typeGuards";
import { isSortingError } from "../../utils/errors";
import { chromeService } from "@/services/ChromeService";
import { useMessageSubscription } from "../context/MessageBusContext";

type ProgressUpdate = SortProgress;

interface UseSortOffersResult {
  isLoading: boolean;
  sortConfig: SortConfig;
  setSortConfig: (config: SortConfig) => void;
  handleSort: (offerTypeFilter?: OfferType, channelFilter?: ChannelType) => Promise<void>;
  lastResult: SortResult | null;
  progressUpdate: ProgressUpdate | null;
}

/**
 * Custom hook for managing the sorting state and execution.
 *
 * Handles:
 * - Sort configuration (criteria and order)
 * - Loading state during sort operations
 * - Progress updates from the injected sorting script (pagination and sorting phases)
 * - Result tracking with error handling
 * - Progress subscriptions via MessageBusContext (single shared listener for the app)
 *
 * Pagination progress updates are throttled to at most one per 200ms to avoid
 * excessive re-renders.
 *
 * IMPORTANT: This hook uses useMessageSubscription and must run *inside*
 * MessageBusProvider. See SortStateProvider in App.tsx.
 */
export function useSortOffers(): UseSortOffersResult {
  const [isLoading, setIsLoading] = useState(false);
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    criteria: "mileage",
    order: "desc",
  });
  const [lastResult, setLastResult] = useState<SortResult | null>(null);
  const [progressUpdate, setProgressUpdate] = useState<ProgressUpdate | null>(null);
  const lastUpdateTimeRef = useRef<number>(0);

  useEffect(() => {
    async function queryProgress() {
      try {
        const tab = await chromeService.getCurrentTab();
        if (!tab?.id) return;

        const response = await chromeService.getSortProgress(tab.id);

        if (response && response.isActive) {
          setIsLoading(true);
          if (response.progress) {
            setProgressUpdate(response.progress);
          }
        }
      } catch (error) {
        console.log('[useSortOffers] No active sort operation or failed to query:', error);
      }
    }
    queryProgress();
  }, []);

  useMessageSubscription<ExtensionMessage>("PAGINATION_PROGRESS", (message) => {
    if (message.type !== "PAGINATION_PROGRESS") return;

    const now = Date.now();
    if (now - lastUpdateTimeRef.current < 200) return;
    lastUpdateTimeRef.current = now;

    setProgressUpdate({
      type: "pagination",
      offersLoaded: message.offersLoaded,
      pagesLoaded: message.pagesLoaded,
    });
  });

  useMessageSubscription<ExtensionMessage>("SORTING_START", (message) => {
    if (message.type !== "SORTING_START") return;
    setProgressUpdate({
      type: "sorting",
      totalOffers: message.totalOffers,
    });
  });

  useMessageSubscription<ExtensionMessage>("SORT_COMPLETE", (message) => {
    if (message.type !== "SORT_COMPLETE") return;
    setIsLoading(false);
    setProgressUpdate(null);
    if (message.result) {
      setLastResult(message.result);
    }
  });

  const handleSort = useCallback(async (offerTypeFilter: OfferType = 'all', channelFilter: ChannelType = 'all') => {
    console.log('[useSortOffers] handleSort called with config:', sortConfig, 'offerTypeFilter:', offerTypeFilter, 'channelFilter:', channelFilter);
    setIsLoading(true);
    setLastResult(null);
    setProgressUpdate(null);

    try {
      const currentTab = await chromeService.getCurrentTab();
      console.log('[useSortOffers] Current tab:', currentTab?.url);

      if (!isValidCapitalOneUrl(currentTab?.url)) {
        console.log('[useSortOffers] Invalid URL, not sorting');
        const errorResult: SortResult = {
          success: false,
          tilesProcessed: 0,
          pagesLoaded: 0,
          error: "Not on a valid Capital One offers page. Please navigate to capitaloneoffers.com/feed.",
        };
        setLastResult(errorResult);
        return;
      }

      if (!currentTab.id) {
        console.error('[useSortOffers] Tab has no ID');
        const errorResult: SortResult = {
          success: false,
          tilesProcessed: 0,
          pagesLoaded: 0,
          error: "Could not identify the active tab",
        };
        setLastResult(errorResult);
        return;
      }

      // sendSortRequest self-heals the content script if the tab was open before
      // the extension installed/updated (see ChromeService.sendToTab).
      console.log('[useSortOffers] Executing sort in active tab...');
      const result = await chromeService.sendSortRequest(currentTab.id, sortConfig, offerTypeFilter, channelFilter);
      console.log('[useSortOffers] Sort result:', result);
      setLastResult(result);

      if (!result.success) {
        console.error("Sort failed:", result.error);
      }
    } catch (error) {
      console.error("Error executing script:", error);

      if (isSortingError(error)) {
        console.error("SortingError details:", error.getDebugMessage());
      } else if (error instanceof Error) {
        console.error("Error details:", error.stack);
      }

      setLastResult({
        success: false,
        tilesProcessed: 0,
        pagesLoaded: 0,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsLoading(false);
      setProgressUpdate(null);
    }
  }, [sortConfig]);

  return {
    isLoading,
    sortConfig,
    setSortConfig,
    handleSort,
    lastResult,
    progressUpdate,
  };
}
