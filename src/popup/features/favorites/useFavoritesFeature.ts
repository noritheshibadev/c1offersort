import { useState, useCallback, useEffect } from 'react';
import { useFavorites } from '../../hooks/useFavorites';
import { injectFavoritesInActiveTab } from '../../services/favoritesInjection';
import { applyFavoritesFilterInActiveTab } from '../../services/applyFavoritesFilter';
import { removeFavoritesStarsInActiveTab } from '../../services/removeFavoritesStars';
import { chromeService } from '@/services/ChromeService';
import { useApp } from '../../context/AppContext';
import { useOperations } from '../../context/OperationsContext';
import { useError } from '../../context/ErrorContext';
import type { OfferType } from '@/types';

/**
 * Custom hook for managing favorites feature state and logic
 */
export function useFavoritesFeature() {
  const { currentUrl, isValidUrl, currentTabId, isTabIdLoading } = useApp();
  const { setIsFavoritesLoading, setIsFilterLoading, setLoadAllProgress, showFavoritesOnly, setShowFavoritesOnly, offerTypeFilter, setOfferTypeFilter } = useOperations();
  const { setError } = useError();

  const { favorites, favoritesCount, refreshFavorites } = useFavorites(currentUrl);

  const [favoritesEnabled, setFavoritesEnabled] = useState(false);
  const [missingFavorites, setMissingFavorites] = useState<string[]>([]);
  const [favoritesListExpanded, setFavoritesListExpanded] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);

  // Load favorites enabled state on mount
  useEffect(() => {
    async function loadEnabledState() {
      // Wait until we have a valid tab ID before attempting injection
      if (isTabIdLoading || !currentTabId) {
        return;
      }

      try {
        const isEnabled = await chromeService.getFavoritesEnabled();
        setFavoritesEnabled(isEnabled);

        if (isEnabled && isValidUrl) {
          await injectFavoritesInActiveTab(currentTabId);
        }
      } catch (error) {
        console.error('[useFavoritesFeature] Failed to load favorites state:', error);
      }
    }
    loadEnabledState();
  }, [isValidUrl, isTabIdLoading, currentTabId]);

  // Toggle favorites on/off
  const handleToggleFavorites = useCallback(async () => {
    setIsFavoritesLoading(true);
    setError(null);
    try {
      if (favoritesEnabled) {
        const result = await removeFavoritesStarsInActiveTab(currentTabId!);
        if (result.success) {
          setFavoritesEnabled(false);
          await chromeService.setFavoritesEnabled(false);
          setShowFavoritesOnly(false);
        } else {
          setError(
            `Failed to disable favorites: ${result.error || 'Unknown error'}`
          );
        }
      } else {
        const result = await injectFavoritesInActiveTab(currentTabId!);
        if (result.success) {
          setFavoritesEnabled(true);
          await chromeService.setFavoritesEnabled(true);
          refreshFavorites();
        } else {
          setError(
            `Failed to enable favorites: ${result.error || 'Unknown error'}`
          );
        }
      }
    } catch (error) {
      setError('Error toggling favorites');
      console.error('[useFavoritesFeature] Error toggling favorites:', error);
    } finally {
      setIsFavoritesLoading(false);
    }
  }, [favoritesEnabled, currentTabId, refreshFavorites, setIsFavoritesLoading, setError, setShowFavoritesOnly]);

  // Toggle "Show Favorites Only" filter
  const handleToggleFavoritesFilter = useCallback(async () => {
    const newShowFavoritesOnly = !showFavoritesOnly;
    setIsFilterLoading(true);
    setLoadAllProgress(null);
    setError(null);
    setShowFavoritesOnly(newShowFavoritesOnly);

    try {
      const result = await applyFavoritesFilterInActiveTab(currentTabId!, newShowFavoritesOnly, offerTypeFilter);

      if (!result.success) {
        setError(
          `Failed to apply filter: ${result.error || 'Unknown error'}`
        );
        setShowFavoritesOnly(!newShowFavoritesOnly);
        return;
      }

      if (newShowFavoritesOnly && result.missingFavorites) {
        setMissingFavorites(result.missingFavorites);
      } else {
        setMissingFavorites([]);
      }
    } catch (error) {
      console.error('[useFavoritesFeature] Favorites filter error:', error);
      setError('Failed to apply favorites filter');
      setShowFavoritesOnly(!newShowFavoritesOnly);
      setMissingFavorites([]);
    } finally {
      setIsFilterLoading(false);
      setLoadAllProgress(null);
    }
  }, [currentTabId, showFavoritesOnly, offerTypeFilter, setIsFilterLoading, setLoadAllProgress, setError, setShowFavoritesOnly]);

  return {
    // State
    favoritesEnabled,
    showFavoritesOnly,
    favoritesListExpanded,
    showTooltip,
    missingFavorites,
    favorites,
    favoritesCount,

    // Setters
    setFavoritesListExpanded,
    setShowTooltip,

    // Handlers
    handleToggleFavorites,
    handleToggleFavoritesFilter,
    refreshFavorites,
  };
}
