import React from 'react';
import { SearchBox } from '../../components/SearchBox';
import { useApp } from '../../context/AppContext';
import { useOperations } from '../../context/OperationsContext';

/**
 * SearchFeature - wrapper for search functionality
 */
export const SearchFeature: React.FC = () => {
  const { currentTabId, isValidUrl, isTabIdLoading } = useApp();
  const { isSortLoading, isFilterLoading } = useOperations();

  return (
    <div style={{ padding: '0 16px', marginTop: '8px' }}>
      <SearchBox
        disabled={!isValidUrl || isSortLoading || isFilterLoading || isTabIdLoading}
        currentTabId={currentTabId}
      />
    </div>
  );
};
