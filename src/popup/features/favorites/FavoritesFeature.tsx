import React from 'react';
import { FavoritesList } from '../../components/FavoritesList';
import { useFavoritesFeature } from './useFavoritesFeature';
import { useApp } from '../../context/AppContext';
import { useOperations } from '../../context/OperationsContext';
import './FavoritesFeature.css';

/**
 * FavoritesFeature - encapsulates all favorites functionality
 * including toggle, filter, and list management
 */
export const FavoritesFeature: React.FC = () => {
  const { currentUrl, isValidUrl } = useApp();
  const { isFavoritesLoading, isFilterLoading } = useOperations();

  const {
    favoritesEnabled,
    showFavoritesOnly,
    favoritesListExpanded,
    showTooltip,
    missingFavorites,
    favorites,
    favoritesCount,
    setFavoritesListExpanded,
    setShowTooltip,
    handleToggleFavorites,
    handleToggleFavoritesFilter,
    refreshFavorites,
  } = useFavoritesFeature();

  const isToggleDisabled = !isValidUrl || isFavoritesLoading;

  return (
    <div className={`favorites-feature ${favoritesListExpanded ? 'expanded' : ''}`}>
      <div className={`favorites-card ${favoritesListExpanded ? 'expanded' : ''}`}>
        {/* Header with toggle */}
        <div className="favorites-header">
          <div className="favorites-title-group">
            <span className="favorites-title">Favorites</span>
            {favoritesCount > 0 && (
              <span className="favorites-count-badge">{favoritesCount}</span>
            )}
            <div className="favorites-info-icon">
              <span
                className="favorites-info-trigger"
                onMouseEnter={() => setShowTooltip(true)}
                onMouseLeave={() => setShowTooltip(false)}
              >
                ?
              </span>
              {showTooltip && (
                <div className="favorites-tooltip">
                  Enable to add star buttons to offers. Click stars to mark
                  favorites, then filter to show only favorited offers.
                  <div className="favorites-tooltip-arrow" />
                </div>
              )}
            </div>
          </div>

          {/* Toggle switch */}
          <label className={`favorites-toggle ${isToggleDisabled ? 'disabled' : ''}`}>
            <input
              type="checkbox"
              checked={favoritesEnabled}
              onChange={handleToggleFavorites}
              disabled={isToggleDisabled}
            />
            <span className={`favorites-toggle-track ${favoritesEnabled ? 'active' : ''}`}>
              <span className="favorites-toggle-thumb" />
            </span>
          </label>
        </div>

        {/* Loading message */}
        {isFavoritesLoading && (
          <div className="favorites-loading">
            {favoritesEnabled ? 'Removing stars...' : 'Adding stars...'}
          </div>
        )}

        {/* Filter controls */}
        {favoritesEnabled && favoritesCount > 0 && (
          <div className="favorites-filter-section">
            <button
              className={`favorites-filter-btn ${showFavoritesOnly ? 'active' : ''}`}
              onClick={handleToggleFavoritesFilter}
              disabled={!isValidUrl || isFilterLoading}
            >
              {isFilterLoading ? (
                <span>Loading all offers...</span>
              ) : (
                <span>
                  {showFavoritesOnly
                    ? '✓ Showing Favorites Only'
                    : 'Show Favorites Only'}
                </span>
              )}
            </button>
          </div>
        )}

        {/* Favorites list */}
        {favoritesEnabled && favoritesCount > 0 && (
          <>
            <button
              className={`favorites-expand-btn ${favoritesListExpanded ? 'expanded' : ''}`}
              onClick={() => setFavoritesListExpanded(!favoritesListExpanded)}
            >
              <span>Your Favorites ({favoritesCount})</span>
              <span className="favorites-expand-arrow">▼</span>
            </button>

            {favoritesListExpanded && (
              <div className="favorites-list-container">
                <FavoritesList
                  favorites={favorites}
                  missingFavorites={missingFavorites}
                  onRemove={refreshFavorites}
                  currentUrl={currentUrl}
                />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
