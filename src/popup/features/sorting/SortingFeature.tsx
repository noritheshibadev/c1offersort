import React, { useCallback } from 'react';
import { CompactSortSelector } from '../../components/CompactSortSelector';
import { OfferTypeFilter } from '../../components/OfferTypeFilter';
import { SortButton } from '../../components/SortButton';
import ErrorMessage from '../../components/ErrorMessage';
import { useApp } from '../../context/AppContext';
import { useOperations } from '../../context/OperationsContext';
import { useError } from '../../context/ErrorContext';
import { applyFavoritesFilterInActiveTab } from '../../services/applyFavoritesFilter';
import type { SortConfig, OfferType } from '@/types';

interface SortingFeatureProps {
  sortConfig: SortConfig;
  setSortConfig: (config: SortConfig) => void;
  handleSort: (offerTypeFilter?: OfferType) => Promise<void>;
  hasSorted: boolean;
}

/**
 * SortingFeature - encapsulates sort configuration and execution UI
 */
export const SortingFeature: React.FC<SortingFeatureProps> = ({
  sortConfig,
  setSortConfig,
  handleSort,
  hasSorted,
}) => {
  const { isValidUrl, currentTabId } = useApp();
  const { isSortLoading, offerTypeFilter, setOfferTypeFilter, showFavoritesOnly } = useOperations();
  const { errorMessage, clearError } = useError();

  const handleSortConfigChange = useCallback(
    (config: SortConfig) => {
      setSortConfig(config);
    },
    [setSortConfig]
  );

  const handleSortWithFilter = useCallback(() => {
    return handleSort(offerTypeFilter);
  }, [handleSort, offerTypeFilter]);

  const handleFilterChange = useCallback(async (newFilter: OfferType) => {
    if (newFilter === offerTypeFilter) return;
    setOfferTypeFilter(newFilter);

    if (hasSorted) {
      await handleSort(newFilter);
    } else if (currentTabId) {
      await applyFavoritesFilterInActiveTab(currentTabId, showFavoritesOnly, newFilter);
    }
  }, [offerTypeFilter, setOfferTypeFilter, hasSorted, handleSort, currentTabId, showFavoritesOnly]);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        marginTop: '8px',
        flexShrink: 0,
      }}
    >
      <div className="sorting-controls-container">
        <CompactSortSelector
          sortConfig={sortConfig}
          onConfigChange={handleSortConfigChange}
        />
        <OfferTypeFilter
          value={offerTypeFilter}
          onChange={handleFilterChange}
          disabled={!isValidUrl || isSortLoading}
        />
      </div>
      <SortButton
        onClick={handleSortWithFilter}
        isLoading={isSortLoading}
        disabled={!isValidUrl}
      />
      {errorMessage && (
        <ErrorMessage
          message={errorMessage}
          onDismiss={clearError}
        />
      )}
    </div>
  );
};
