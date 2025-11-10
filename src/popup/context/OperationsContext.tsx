import React, { createContext, useContext, useState, useEffect, useMemo, type ReactNode } from 'react';
import { chromeService } from '@/services/ChromeService';
import type { PaginationProgressMessage } from '@/types/messages';
import { useApp } from './AppContext';

/**
 * Context for operation loading states and progress tracking
 */
interface OperationsContextValue {
  // Sort operation
  isSortLoading: boolean;
  sortProgress: {
    type: 'pagination' | 'sorting';
    offersLoaded?: number;
    pagesLoaded?: number;
    totalOffers?: number;
  } | null;

  // Favorites operations
  isFavoritesLoading: boolean;
  setIsFavoritesLoading: (loading: boolean) => void;

  isFilterLoading: boolean;
  setIsFilterLoading: (loading: boolean) => void;

  // Filter state
  showFavoritesOnly: boolean;
  setShowFavoritesOnly: (show: boolean) => void;

  // Pagination progress (for "Load All" operations)
  loadAllProgress: {
    offersLoaded: number;
    pagesLoaded: number;
  } | null;
  setLoadAllProgress: (progress: { offersLoaded: number; pagesLoaded: number } | null) => void;
}

const OperationsContext = createContext<OperationsContextValue | undefined>(undefined);

interface OperationsProviderProps {
  children: ReactNode;
  isSortLoading: boolean;
  sortProgress: OperationsContextValue['sortProgress'];
}

export const OperationsProvider: React.FC<OperationsProviderProps> = ({
  children,
  isSortLoading,
  sortProgress,
}) => {
  const { currentTabId, isTabIdLoading } = useApp();
  const [isFavoritesLoading, setIsFavoritesLoading] = useState(false);
  const [isFilterLoading, setIsFilterLoading] = useState(false);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [loadAllProgress, setLoadAllProgress] = useState<{
    offersLoaded: number;
    pagesLoaded: number;
  } | null>(null);

  // Query filter progress after tab is ready
  useEffect(() => {
    if (isTabIdLoading || !currentTabId) return;

    async function queryFilterProgress() {
      try {
        const response = await chromeService.getFilterProgress(currentTabId);

        if (response && response.isActive) {
          setIsFilterLoading(true);
          if (response.progress) {
            setLoadAllProgress(response.progress);
          }
        }
      } catch (error) {
        console.log('[OperationsContext] No active filter operation or failed to query:', error);
      }
    }

    queryFilterProgress();
  }, [currentTabId, isTabIdLoading]);

  // Listen for pagination progress messages
  useEffect(() => {
    const cleanup = chromeService.onMessage((message: PaginationProgressMessage) => {
      if (message.type === 'PAGINATION_PROGRESS') {
        setLoadAllProgress({
          offersLoaded: message.offersLoaded,
          pagesLoaded: message.pagesLoaded,
        });
      }
    });

    return cleanup;
  }, []);

  const value = useMemo(
    () => ({
      isSortLoading,
      sortProgress,
      isFavoritesLoading,
      setIsFavoritesLoading,
      isFilterLoading,
      setIsFilterLoading,
      showFavoritesOnly,
      setShowFavoritesOnly,
      loadAllProgress,
      setLoadAllProgress,
    }),
    [
      isSortLoading,
      sortProgress,
      isFavoritesLoading,
      isFilterLoading,
      showFavoritesOnly,
      loadAllProgress,
    ]
  );

  return <OperationsContext.Provider value={value}>{children}</OperationsContext.Provider>;
};

/**
 * Hook to access operation loading states and progress
 */
export const useOperations = (): OperationsContextValue => {
  const context = useContext(OperationsContext);
  if (!context) {
    throw new Error('useOperations must be used within OperationsProvider');
  }
  return context;
};
