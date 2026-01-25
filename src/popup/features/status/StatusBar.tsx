import React from 'react';
import { StatusMessage } from '../../components/StatusMessage';
import { BuyMeCoffee } from '../../components/BuyMeCoffee';
import { ExportButton } from '../../components/ExportButton';
import { useOperations } from '../../context/OperationsContext';
import type { SortResult } from '@/types';

interface StatusBarProps {
  lastResult: SortResult | null;
  hasSorted: boolean;
}

/**
 * StatusBar feature - displays status messages, export button, and support link
 */
export const StatusBar: React.FC<StatusBarProps> = ({ lastResult, hasSorted }) => {
  const { isSortLoading, sortProgress, isFilterLoading, loadAllProgress, showFavoritesOnly } = useOperations();

  return (
    <div
      style={{
        padding: '0 16px 8px 16px',
        flexShrink: 0,
        minHeight: '15px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <StatusMessage
        result={lastResult}
        progress={sortProgress}
        isLoading={isSortLoading}
        loadAllProgress={loadAllProgress}
        isLoadingAll={isFilterLoading}
        showFavoritesOnly={showFavoritesOnly}
      />

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          marginTop: '0px',
          gap: '4px',
        }}
      >
        <BuyMeCoffee />
        <ExportButton hasSorted={hasSorted} />
      </div>
    </div>
  );
};
