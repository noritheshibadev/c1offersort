import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import type { SortConfig, SortResult } from "../../types";
import { executeSortInActiveTab, getCurrentTab } from "../services/chromeApi";
import { isValidCapitalOneUrl } from "../../utils/typeGuards";
import { isSortingError } from "../../utils/errors";
import { throttle } from "@/utils/throttle";

interface ProgressUpdate {
  type: "pagination" | "sorting";
  offersLoaded?: number;
  pagesLoaded?: number;
  totalOffers?: number;
}

interface UseSortOffersResult {
  isLoading: boolean;
  sortConfig: SortConfig;
  setSortConfig: (config: SortConfig) => void;
  handleSort: () => Promise<void>;
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
 * - Message listener for real-time progress updates from content script
 *
 * Progress updates are throttled to max one update per 200ms to avoid excessive re-renders.
 *
 * @returns Sort state and handlers for the UI
 */
export function useSortOffers(): UseSortOffersResult {
  const [isLoading, setIsLoading] = useState(false);
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    criteria: "mileage",
    order: "desc",
  });
  const [lastResult, setLastResult] = useState<SortResult | null>(null);
  const [progressUpdate, setProgressUpdate] = useState<ProgressUpdate | null>(null);

  // Create throttled setter (stable across renders)
  const throttledSetProgress = useMemo(
    () => throttle((update: ProgressUpdate) => {
      setProgressUpdate(update);
    }, 200),
    []
  );

  useEffect(() => {
    async function queryProgress() {
      try {
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tabs[0]?.id) return;

        const response = await chrome.tabs.sendMessage(tabs[0].id, {
          type: 'GET_SORT_PROGRESS'
        });

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

  const setIsLoadingRef = useRef(setIsLoading);
  const setProgressUpdateRef = useRef(setProgressUpdate);
  const setLastResultRef = useRef(setLastResult);

  // Update refs when setters change (setState functions are stable, so this rarely re-runs)
  useEffect(() => {
    setIsLoadingRef.current = setIsLoading;
    setProgressUpdateRef.current = setProgressUpdate;
    setLastResultRef.current = setLastResult;
  }, [setIsLoading, setProgressUpdate, setLastResult]);

  useEffect(() => {
    if (!chrome?.runtime?.onMessage) {
      console.error('[useSortOffers] chrome.runtime.onMessage not available');
      return;
    }

    const messageListener = (
      message: unknown,
      _sender: chrome.runtime.MessageSender,
      _sendResponse: (response?: any) => void
    ) => {
      if (typeof message !== "object" || message === null || !("type" in message)) {
        return;
      }

      const msg = message as {
        type: string;
        offersLoaded?: number;
        pagesLoaded?: number;
        totalOffers?: number;
      };

      if (msg.type === "PAGINATION_PROGRESS") {
        if (typeof msg.offersLoaded !== "number" || typeof msg.pagesLoaded !== "number") {
          return;
        }

        console.log('[useSortOffers] Received pagination progress:', msg.offersLoaded, 'offers,', msg.pagesLoaded, 'pages');

        // Use throttled setter
        throttledSetProgress({
          type: "pagination",
          offersLoaded: msg.offersLoaded,
          pagesLoaded: msg.pagesLoaded,
        });
      } else if (msg.type === "SORTING_START") {
        if (typeof msg.totalOffers !== "number") {
          return;
        }

        console.log('[useSortOffers] Received sorting start:', msg.totalOffers, 'offers');
        throttledSetProgress({
          type: "sorting",
          totalOffers: msg.totalOffers,
        });
      } else if (msg.type === "SORT_COMPLETE") {
        console.log('[useSortOffers] Received sort completion:', 'result' in msg ? msg.result : undefined);
        setIsLoadingRef.current(false);
        setProgressUpdateRef.current(null);
        if ('result' in msg && msg.result && typeof msg.result === 'object' && 'success' in msg.result) {
          setLastResultRef.current(msg.result as SortResult);
        }
      }
    };

    chrome.runtime.onMessage.addListener(messageListener);
    return () => {
      try {
        chrome.runtime.onMessage.removeListener(messageListener);
      } catch (error) {
        console.log('[useSortOffers] Failed to remove message listener (extension context may be invalidated):', error);
      }
    };
  }, [throttledSetProgress]);

  const handleSort = useCallback(async () => {
    console.log('[useSortOffers] handleSort called with config:', sortConfig);
    setIsLoading(true);
    setLastResult(null);
    setProgressUpdate(null);

    try {
      const currentTab = await getCurrentTab();
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

      console.log('[useSortOffers] Executing sort in active tab...');
      const result = await executeSortInActiveTab(sortConfig);
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
