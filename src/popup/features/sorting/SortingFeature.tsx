import React, { useCallback } from 'react';
import { CompactSortSelector } from '../../components/CompactSortSelector';
import { SortButton } from '../../components/SortButton';
import ErrorMessage from '../../components/ErrorMessage';
import { useApp } from '../../context/AppContext';
import { useOperations } from '../../context/OperationsContext';
import { useError } from '../../context/ErrorContext';
import type { SortConfig } from '@/types';

interface SortingFeatureProps {
  sortConfig: SortConfig;
  setSortConfig: (config: SortConfig) => void;
  handleSort: () => Promise<void>;
}

/**
 * SortingFeature - encapsulates sort configuration and execution UI
 */
export const SortingFeature: React.FC<SortingFeatureProps> = ({
  sortConfig,
  setSortConfig,
  handleSort,
}) => {
  const { isValidUrl } = useApp();
  const { isSortLoading } = useOperations();
  const { errorMessage, clearError } = useError();

  const handleSortConfigChange = useCallback(
    (config: SortConfig) => {
      setSortConfig(config);
    },
    [setSortConfig]
  );

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
      <CompactSortSelector
        sortConfig={sortConfig}
        onConfigChange={handleSortConfigChange}
      />
      <SortButton
        onClick={handleSort}
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
