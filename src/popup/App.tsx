import React from 'react';
import { useSortOffers } from './hooks/useSortOffers';
import { InvalidPageOverlay } from './components/InvalidPageOverlay';
import { HelpButton } from './components/HelpButton';
import { FeatureErrorBoundary } from './components/FeatureErrorBoundary';
import { COLORS } from '@/utils/constants';
import type { SortConfig, SortResult, OfferType } from '@/types';

// Context providers
import { MessageBusProvider } from './context/MessageBusContext';
import { AppProvider, useApp } from './context/AppContext';
import { OperationsProvider } from './context/OperationsContext';
import { ErrorProvider } from './context/ErrorContext';

// Feature components
import { SearchFeature } from './features/search/SearchFeature';
import { SortingFeature } from './features/sorting/SortingFeature';
import { FavoritesFeature } from './features/favorites/FavoritesFeature';
import { StatusBar } from './features/status/StatusBar';

interface AppInnerProps {
  sortConfig: SortConfig;
  setSortConfig: (config: SortConfig) => void;
  handleSort: (offerTypeFilter?: OfferType) => Promise<void>;
  lastResult: SortResult | null;
  hasSorted: boolean;
}

/**
 * Inner App component - renders main UI with access to contexts
 */
const AppInner: React.FC<AppInnerProps> = ({
  sortConfig,
  setSortConfig,
  handleSort,
  lastResult,
  hasSorted,
}) => {
  const { isValidUrl } = useApp();

  return (
    <div
      className="App"
      style={{
        backgroundColor: COLORS.PRIMARY_BACKGROUND,
        color: COLORS.WHITE,
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'visible',
      }}
    >
      <HelpButton />
      <h1
        className="text-xl font-bold"
        style={{ margin: 0, padding: '16px 16px 0 16px', flexShrink: 0 }}
      >
        C1 Offers Sorter
      </h1>

      {/* Search Feature */}
      <FeatureErrorBoundary feature="Search">
        <SearchFeature />
      </FeatureErrorBoundary>

      <div
        style={{
          flex: 1,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          padding: '0 16px',
          minHeight: 0,
        }}
      >
        {/* Sorting Feature */}
        <FeatureErrorBoundary feature="Sorting">
          <SortingFeature
            sortConfig={sortConfig}
            setSortConfig={setSortConfig}
            handleSort={handleSort}
            hasSorted={hasSorted}
          />
        </FeatureErrorBoundary>

        {/* Favorites Feature */}
        <FeatureErrorBoundary feature="Favorites">
          <FavoritesFeature />
        </FeatureErrorBoundary>
      </div>

      {/* Status Bar */}
      <StatusBar lastResult={lastResult} />

      {/* Invalid URL Overlay */}
      {!isValidUrl && <InvalidPageOverlay />}
    </div>
  );
};

/**
 * Main application component for the C1 Offers Sorter extension popup.
 * Provides context providers and renders the main UI.
 *
 * Features:
 * - Sort offers by mileage value or merchant name (ascending/descending)
 * - Mark offers as favorites with star buttons
 * - Filter to show only favorited offers
 * - Search through offers
 * - View and manage list of favorited offers
 * - Real-time progress updates during sorting and pagination
 */
const App: React.FC = () => {
  console.log('[App] Component mounted');

  // Call useSortOffers once to get all sort-related state
  const {
    isLoading,
    progressUpdate,
    sortConfig,
    setSortConfig,
    handleSort,
    lastResult,
  } = useSortOffers();

  return (
    <MessageBusProvider>
      <ErrorProvider>
        <AppProvider>
          <OperationsProvider
            isSortLoading={isLoading}
            sortProgress={progressUpdate}
          >
            <AppInner
              sortConfig={sortConfig}
              setSortConfig={setSortConfig}
              handleSort={handleSort}
              lastResult={lastResult}
              hasSorted={lastResult?.success === true}
            />
          </OperationsProvider>
        </AppProvider>
      </ErrorProvider>
    </MessageBusProvider>
  );
};

export default App;
