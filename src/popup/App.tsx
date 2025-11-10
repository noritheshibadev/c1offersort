import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useCurrentTab } from "./hooks/useCurrentTab";
import { useSortOffers } from "./hooks/useSortOffers";
import { useFavorites } from "./hooks/useFavorites";
import { SortCriteriaSelector } from "./components/SortCriteriaSelector";
import { SortOrderSelector } from "./components/SortOrderSelector";
import { SortButton } from "./components/SortButton";
import { StatusMessage } from "./components/StatusMessage";
import { InvalidPageOverlay } from "./components/InvalidPageOverlay";
import { FavoritesList } from "./components/FavoritesList";
import { BuyMeCoffee } from "./components/BuyMeCoffee";
import { HelpButton } from "./components/HelpButton";
import { ToggleSwitch } from "./components/ToggleSwitch";
import ErrorMessage from "./components/ErrorMessage";
import { FeatureErrorBoundary } from "./components/FeatureErrorBoundary";
import { isValidCapitalOneUrl } from "@/utils/typeGuards";
import { injectFavoritesInActiveTab } from "./services/favoritesInjection";
import { applyFavoritesFilterInActiveTab } from "./services/applyFavoritesFilter";
import { removeFavoritesStarsInActiveTab } from "./services/removeFavoritesStars";
import { switchViewMode, getCurrentViewMode } from "./services/viewMode";
import type { SortCriteria, SortOrder, ViewMode } from "../types";
import "./App.css";
import "./components/SortingSection/SortingSection.css";
import "./components/FeaturesSection/FeaturesSection.css";

/**
 * Main application component for the C1 Offers Sorter extension popup.
 * Provides UI for sorting Capital One offers by mileage or merchant name,
 * and managing favorited offers with filtering capabilities.
 *
 * Features:
 * - Sort offers by mileage value or merchant name (ascending/descending)
 * - Mark offers as favorites with star buttons
 * - Filter to show only favorited offers
 * - View and manage list of favorited offers
 * - Real-time progress updates during sorting and pagination
 */
const App: React.FC = () => {
  // Track if component is mounted to prevent state updates after unmount
  const isMountedRef = useRef(true);

  const currentUrl = useCurrentTab();
  const {
    isLoading,
    sortConfig,
    setSortConfig,
    handleSort: originalHandleSort,
    lastResult,
    progressUpdate,
  } = useSortOffers();

  const { favorites, favoritesCount, refreshFavorites } = useFavorites(currentUrl);
  const [isFavoritesLoading, setIsFavoritesLoading] = useState(false);
  const [favoritesEnabled, setFavoritesEnabled] = useState(false);
  const [missingFavorites, setMissingFavorites] = useState<string[]>([]);
  const [favoritesListExpanded, setFavoritesListExpanded] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [isViewModeLoading, setIsViewModeLoading] = useState(false);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Load view mode on mount - always defaults to grid since storage is cleared on page load
  // Don't block on loading from content script - let it update asynchronously
  useEffect(() => {
    async function loadViewMode() {
      try {
        const currentMode = await getCurrentViewMode();
        setViewMode(currentMode);
      } catch (error) {
        // Silently fail - we already default to grid mode
        // This prevents blocking if content script isn't ready yet
      }
    }
    loadViewMode();
  }, []);

  // Consolidated filter state to reduce re-renders
  // Always defaults to false - filter state is not persisted across page reloads
  const [filterState, setFilterState] = useState({
    isLoading: false,
    showFavoritesOnly: false,
    progress: null as {
      offersLoaded: number;
      pagesLoaded: number;
    } | null,
  });

  const isValidUrl = useMemo(() => isValidCapitalOneUrl(currentUrl), [currentUrl]);

  useEffect(() => {
    async function loadFilterState() {
      try {
        // Load the persisted filter state from storage
        const result = await chrome.storage.local.get('c1-favorites-filter-active');
        const isFilterActive = result['c1-favorites-filter-active'] === true;

        if (isFilterActive) {
          setFilterState(prev => ({
            ...prev,
            showFavoritesOnly: true,
          }));
        }

        // Also check for any active filter operation in progress
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tabs[0]?.id) return;

        const response = await chrome.tabs.sendMessage(tabs[0].id, {
          type: 'GET_FILTER_PROGRESS'
        });

        if (response && response.isActive) {
          setFilterState(prev => ({
            ...prev,
            isLoading: true,
            progress: response.progress ? {
              offersLoaded: response.progress.offersLoaded,
              pagesLoaded: response.progress.pagesLoaded,
            } : null,
          }));
        }
      } catch (error) {
      }
    }
    loadFilterState();
  }, []);

  useEffect(() => {
    async function loadEnabledState() {
      try {
        const result = await chrome.storage.local.get("c1-favorites-enabled");
        const isEnabled = result["c1-favorites-enabled"] === true;
        setFavoritesEnabled(isEnabled);

        if (isEnabled && isValidUrl) {
          await injectFavoritesInActiveTab();
        }
      } catch (error) {
        console.error("Failed to load favorites state:", error);
      }
    }
    loadEnabledState();
  }, [isValidUrl]);

  useEffect(() => {
    if (!chrome?.runtime?.onMessage) {
      console.error('[App] chrome.runtime.onMessage not available');
      return;
    }

    const messageListener = (
      message: unknown,
      _sender: chrome.runtime.MessageSender,
      _sendResponse: (response?: any) => void
    ) => {
      if (typeof message === "object" && message !== null && "type" in message) {
        const msg = message as { type: string; offersLoaded?: number; pagesLoaded?: number };
        if (msg.type === "PAGINATION_PROGRESS" && typeof msg.offersLoaded === "number" && typeof msg.pagesLoaded === "number") {
          setFilterState(prev => ({
            ...prev,
            progress: {
              offersLoaded: msg.offersLoaded as number,
              pagesLoaded: msg.pagesLoaded as number,
            },
          }));
        }
      }
    };

    chrome.runtime.onMessage.addListener(messageListener);
    return () => {
      try {
        chrome.runtime.onMessage.removeListener(messageListener);
      } catch (error) {
      }
    };
  }, []);

  const handleCriteriaChange = useCallback((criteria: SortCriteria) => {
    let order: SortOrder;
    if (criteria === "mileage") {
      order = "desc";
    } else if (criteria === "merchantMileage") {
      order = "desc-asc"; // Default: High Miles, A-Z
    } else {
      order = "asc";
    }
    setSortConfig({ criteria, order });
  }, [setSortConfig]);

  const handleOrderChange = useCallback((order: SortOrder) => {
    setSortConfig({ ...sortConfig, order });
  }, [sortConfig, setSortConfig]);

  const favoritesEnabledRef = useRef(favoritesEnabled);
  useEffect(() => {
    favoritesEnabledRef.current = favoritesEnabled;
  }, [favoritesEnabled]);

  const handleToggleFavorites = useCallback(async () => {
    const wasInTableView = viewMode === "table";
    setIsFavoritesLoading(true);
    setErrorMessage(null);
    try {
      if (favoritesEnabledRef.current) {
        // If currently in table view, switch to grid view first (like filter toggle does)
        if (wasInTableView) {
          setIsViewModeLoading(true);
          try {
            const result = await switchViewMode("grid");
            if (result.success) {
              setViewMode("grid");
              await chrome.storage.local.set({ "c1-view-mode": "grid" });
            } else {
              setErrorMessage(`Failed to switch to grid view: ${result.error || "Unknown error"}`);
              setIsViewModeLoading(false);
              setIsFavoritesLoading(false);
              return; // Don't proceed if view switch failed
            }
          } catch (error) {
            console.error("View mode switch error before removing favorites:", error);
            setErrorMessage("Failed to switch to grid view before removing favorites");
            setIsViewModeLoading(false);
            setIsFavoritesLoading(false);
            return;
          } finally {
            setIsViewModeLoading(false);
          }
        }

        const result = await removeFavoritesStarsInActiveTab();
        if (result.success) {
          setFavoritesEnabled(false);
          await chrome.storage.local.set({ "c1-favorites-enabled": false });

          // Reset filter state in UI (content script handles clearing the actual filter)
          setFilterState(prev => ({
            ...prev,
            showFavoritesOnly: false,
          }));

          // If we were in table view, switch back to table view after removing favorites
          if (wasInTableView) {
            setIsViewModeLoading(true);
            try {
              const tableResult = await switchViewMode("table");
              if (tableResult.success) {
                setViewMode("table");
                await chrome.storage.local.set({ "c1-view-mode": "table" });
              } else {
                setErrorMessage(`Favorites removed but failed to return to table view: ${tableResult.error || "Unknown error"}`);
              }
            } catch (error) {
              console.error("View mode switch error after removing favorites:", error);
              setErrorMessage("Favorites removed but failed to return to table view");
            } finally {
              setIsViewModeLoading(false);
            }
          }
        } else {
          setErrorMessage(
            `Failed to disable favorites: ${result.error || "Unknown error"}`
          );
        }
      } else {
        // Enabling favorites - follow same pattern if in table view
        if (wasInTableView) {
          setIsViewModeLoading(true);
          try {
            const result = await switchViewMode("grid");
            if (result.success) {
              setViewMode("grid");
              await chrome.storage.local.set({ "c1-view-mode": "grid" });
            } else {
              setErrorMessage(`Failed to switch to grid view: ${result.error || "Unknown error"}`);
              setIsViewModeLoading(false);
              setIsFavoritesLoading(false);
              return;
            }
          } catch (error) {
            console.error("View mode switch error before enabling favorites:", error);
            setErrorMessage("Failed to switch to grid view before enabling favorites");
            setIsViewModeLoading(false);
            setIsFavoritesLoading(false);
            return;
          } finally {
            setIsViewModeLoading(false);
          }
        }

        const result = await injectFavoritesInActiveTab();
        if (result.success) {
          setFavoritesEnabled(true);
          await chrome.storage.local.set({ "c1-favorites-enabled": true });
          refreshFavorites();

          // If we were in table view, switch back to table view after injecting favorites
          if (wasInTableView) {
            setIsViewModeLoading(true);
            try {
              const tableResult = await switchViewMode("table");
              if (tableResult.success) {
                setViewMode("table");
                await chrome.storage.local.set({ "c1-view-mode": "table" });
              } else {
                setErrorMessage(`Favorites enabled but failed to return to table view: ${tableResult.error || "Unknown error"}`);
              }
            } catch (error) {
              console.error("View mode switch error after enabling favorites:", error);
              setErrorMessage("Favorites enabled but failed to return to table view");
            } finally {
              setIsViewModeLoading(false);
            }
          }
        } else {
          setErrorMessage(
            `Failed to enable favorites: ${result.error || "Unknown error"}`
          );
        }
      }
    } catch (error) {
      setErrorMessage("Error toggling favorites");
      console.error("Error toggling favorites:", error);
    } finally {
      setIsFavoritesLoading(false);
    }
  }, [favoritesEnabledRef, refreshFavorites, viewMode]);

  const showFavoritesOnlyRef = useRef(filterState.showFavoritesOnly);
  useEffect(() => {
    showFavoritesOnlyRef.current = filterState.showFavoritesOnly;
  }, [filterState.showFavoritesOnly]);

  const handleToggleFavoritesFilter = useCallback(async () => {
    const newShowFavoritesOnly = !showFavoritesOnlyRef.current;
    const wasInTableView = viewMode === "table";

    // If currently in table view, switch to grid view first
    if (wasInTableView) {
      if (!isMountedRef.current) return;
      setIsViewModeLoading(true);
      setErrorMessage(null);

      try {
        const result = await switchViewMode("grid");
        if (!isMountedRef.current) return;
        if (result.success) {
          setViewMode("grid");
          await chrome.storage.local.set({ "c1-view-mode": "grid" });
        } else {
          setErrorMessage(`Failed to switch to grid view: ${result.error || "Unknown error"}`);
          setIsViewModeLoading(false);
          return;
        }
      } catch (error) {
        if (!isMountedRef.current) return;
        setErrorMessage("Failed to switch to grid view before filtering");
        setIsViewModeLoading(false);
        return;
      } finally {
        if (!isMountedRef.current) return;
        setIsViewModeLoading(false);
      }
    }

    // Single state update instead of 4
    if (!isMountedRef.current) return;
    setFilterState({
      isLoading: true,
      showFavoritesOnly: newShowFavoritesOnly,
      progress: null,
    });
    setErrorMessage(null);

    try{
      const result = await applyFavoritesFilterInActiveTab(
        newShowFavoritesOnly
      );

      if (!isMountedRef.current) return;
      if (!result.success) {
        setErrorMessage(
          `Failed to apply filter: ${result.error || "Unknown error"}`
        );
        // Revert on error
        setFilterState(prev => ({
          ...prev,
          isLoading: false,
          showFavoritesOnly: !newShowFavoritesOnly,
        }));
        return;
      }

      if (newShowFavoritesOnly && result.missingFavorites) {
        setMissingFavorites(result.missingFavorites);
      } else {
        setMissingFavorites([]);
      }

      // If we were in table view, switch back to table view after filtering
      if (wasInTableView) {
        if (!isMountedRef.current) return;
        setIsViewModeLoading(true);
        try {
          const tableResult = await switchViewMode("table");
          if (!isMountedRef.current) return;
          if (tableResult.success) {
            setViewMode("table");
            await chrome.storage.local.set({ "c1-view-mode": "table" });
          } else {
            setErrorMessage(`Filter applied but failed to return to table view: ${tableResult.error || "Unknown error"}`);
          }
        } catch (error) {
          if (!isMountedRef.current) return;
          setErrorMessage("Filter applied but failed to return to table view");
        } finally {
          if (!isMountedRef.current) return;
          setIsViewModeLoading(false);
        }
      }
    } catch (error) {
      if (!isMountedRef.current) return;
      setErrorMessage("Failed to apply favorites filter");
      setFilterState(prev => ({
        ...prev,
        isLoading: false,
        showFavoritesOnly: !newShowFavoritesOnly,
      }));
      setMissingFavorites([]);
    } finally {
      if (!isMountedRef.current) return;
      setFilterState(prev => ({
        ...prev,
        isLoading: false,
        progress: null,
      }));
    }
  }, [viewMode]);

  const handleToggleViewMode = useCallback(async () => {
    const newViewMode: ViewMode = viewMode === "grid" ? "table" : "grid";
    setIsViewModeLoading(true);
    setErrorMessage(null);

    try {
      const result = await switchViewMode(newViewMode);
      if (result.success) {
        setViewMode(newViewMode);
        // Save to storage so it persists across popup opens
        await chrome.storage.local.set({ "c1-view-mode": newViewMode });
      } else {
        setErrorMessage(`Failed to switch view: ${result.error || "Unknown error"}`);
      }
    } catch (error) {
      console.error("View mode toggle error:", error);
      setErrorMessage("Failed to switch view mode");
    } finally {
      setIsViewModeLoading(false);
    }
  }, [viewMode]);

  // Sort handler
  // Content script now handles table view internally:
  // - If in table view, it removes it, sorts in grid, then rebuilds table view
  // - This ensures proper tile access and maintains view mode state
  const handleSort = useCallback(async () => {
    await originalHandleSort();
  }, [viewMode, originalHandleSort]);

  return (
    <div className="app-container">
      <HelpButton />

      <header className="app-header">
        <h1 className="app-title">C1 Offers Sorter</h1>
      </header>

      <div className="app-content-scroll">
        <div className="app-content">
        {!filterState.showFavoritesOnly && (
          <FeatureErrorBoundary feature="Sorting">
            <section className="sorting-section">
              <SortCriteriaSelector
                sortCriteria={sortConfig.criteria}
                onChange={handleCriteriaChange}
                disabled={false}
              />
              <SortOrderSelector
                sortOrder={sortConfig.order}
                sortCriteria={sortConfig.criteria}
                onChange={handleOrderChange}
                disabled={false}
              />
              <SortButton
                onClick={handleSort}
                isLoading={isLoading}
                disabled={!isValidUrl || filterState.isLoading}
              />
              {errorMessage && (
                <ErrorMessage
                  message={errorMessage}
                  onDismiss={() => setErrorMessage(null)}
                />
              )}
            </section>
          </FeatureErrorBoundary>
        )}

        <FeatureErrorBoundary feature="Favorites">
          <section className="features-section">
            <div className="features-card">
              {/* Table View Toggle */}
              <div className="toggle-row">
                <div className="toggle-label-wrapper">
                  <span className="toggle-label">Table View</span>
                </div>
                <ToggleSwitch
                  checked={viewMode === "table"}
                  onChange={handleToggleViewMode}
                  disabled={!isValidUrl || isViewModeLoading || isLoading || filterState.isLoading}
                  ariaLabel="Table View"
                />
              </div>

              {isViewModeLoading && (
                <div className="loading-text">
                  Switching view...
                </div>
              )}

              {/* Favorites Toggle */}
              <div className="toggle-row">
                <div className="toggle-label-wrapper">
                  <span className="toggle-label">Favorites</span>
                  {favoritesCount > 0 && (
                    <span className="toggle-badge">
                      {favoritesCount}
                    </span>
                  )}
                  <div className="tooltip-wrapper">
                    <span
                      className="help-icon"
                      onMouseEnter={() => setShowTooltip(true)}
                      onMouseLeave={() => setShowTooltip(false)}
                    >
                      ?
                    </span>
                    {showTooltip && (
                      <div className="tooltip">
                        Enable to add star buttons to offers. Click stars to mark
                        favorites, then filter to show only favorited offers.
                      </div>
                    )}
                  </div>
                </div>
                <ToggleSwitch
                  checked={favoritesEnabled}
                  onChange={handleToggleFavorites}
                  disabled={!isValidUrl || isFavoritesLoading || isLoading || filterState.isLoading}
                  ariaLabel="Favorites"
                />
              </div>

              {isFavoritesLoading && (
                <div className="loading-text">
                  {favoritesEnabled ? "Removing stars..." : "Adding stars..."}
                </div>
              )}

              {favoritesEnabled && favoritesCount > 0 && (
                <button
                  onClick={handleToggleFavoritesFilter}
                  disabled={!isValidUrl || filterState.isLoading}
                  className={`favorites-filter-btn ${filterState.showFavoritesOnly ? 'active' : ''}`}
                >
                  {filterState.isLoading ? (
                    <span>Loading all offers...</span>
                  ) : (
                    <span>
                      {filterState.showFavoritesOnly
                        ? "✓ Showing Favorites Only"
                        : "Show Favorites Only"}
                    </span>
                  )}
                </button>
              )}

              {favoritesEnabled && favoritesCount > 0 && (
                <>
                  <button
                    onClick={() => setFavoritesListExpanded(!favoritesListExpanded)}
                    className="favorites-expand-btn"
                  >
                    <span>Your Favorites ({favoritesCount})</span>
                    <span className={`favorites-expand-icon ${favoritesListExpanded ? 'expanded' : ''}`}>
                      ▼
                    </span>
                  </button>

                  {favoritesListExpanded && (
                    <div className="favorites-list-wrapper">
                      <FavoritesList
                        favorites={favorites}
                        missingFavorites={missingFavorites}
                        onRemove={refreshFavorites}
                        currentUrl={currentUrl}
                        disabled={filterState.isLoading || isLoading || isFavoritesLoading}
                      />
                    </div>
                  )}
                </>
              )}
            </div>
          </section>
        </FeatureErrorBoundary>
        </div>
      </div>

      <footer className="app-footer">
        <StatusMessage
          result={lastResult}
          progress={progressUpdate}
          isLoading={isLoading}
          loadAllProgress={filterState.progress}
          isLoadingAll={filterState.isLoading}
          showFavoritesOnly={filterState.showFavoritesOnly}
        />

        <BuyMeCoffee />
      </footer>

      {!isValidUrl && <InvalidPageOverlay />}
    </div>
  );
};

export default App;
