import React from 'react';
import { FavoritesList } from '../../components/FavoritesList';
import { useFavoritesFeature } from './useFavoritesFeature';
import { useApp } from '../../context/AppContext';
import { useOperations } from '../../context/OperationsContext';
import { COLORS } from '@/utils/constants';

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

  return (
    <div
      style={{
        marginTop: '12px',
        flex: favoritesListExpanded ? 1 : '0 0 auto',
        overflow: 'visible',
        display: 'flex',
        flexDirection: 'column',
        paddingBottom: '12px',
        minHeight: 0,
        position: 'relative',
      }}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          padding: '14px',
          backgroundColor: 'rgba(255, 255, 255, 0.03)',
          borderRadius: '6px',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          flex: favoritesListExpanded ? 1 : '0 0 auto',
          minHeight: 0,
          overflow: 'visible',
        }}
      >
        {/* Header with toggle */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            flexShrink: 0,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              flex: 1,
            }}
          >
            <span
              style={{
                fontSize: '13px',
                fontWeight: '600',
                color: COLORS.WHITE,
              }}
            >
              Favorites
            </span>
            {favoritesCount > 0 && (
              <span
                style={{
                  backgroundColor: COLORS.PRIMARY_GREEN,
                  color: COLORS.WHITE,
                  padding: '2px 7px',
                  borderRadius: '10px',
                  fontSize: '11px',
                  fontWeight: '600',
                }}
              >
                {favoritesCount}
              </span>
            )}
            <div style={{ position: 'relative', display: 'inline-block' }}>
              <span
                onMouseEnter={() => setShowTooltip(true)}
                onMouseLeave={() => setShowTooltip(false)}
                style={{
                  fontSize: '10px',
                  color: 'rgba(255, 255, 255, 0.5)',
                  cursor: 'help',
                  fontWeight: '600',
                  width: '14px',
                  height: '14px',
                  border: '1px solid rgba(255, 255, 255, 0.3)',
                  borderRadius: '50%',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                ?
              </span>
              {showTooltip && (
                <div
                  style={{
                    position: 'absolute',
                    bottom: 'calc(100% + 8px)',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    backgroundColor: 'rgba(0, 0, 0, 0.95)',
                    color: COLORS.WHITE,
                    padding: '8px 12px',
                    borderRadius: '6px',
                    fontSize: '11px',
                    lineHeight: '1.4',
                    width: '200px',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    zIndex: 1000,
                    whiteSpace: 'normal',
                  }}
                >
                  Enable to add star buttons to offers. Click stars to mark
                  favorites, then filter to show only favorited offers.
                  <div
                    style={{
                      position: 'absolute',
                      top: '100%',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      width: 0,
                      height: 0,
                      borderLeft: '6px solid transparent',
                      borderRight: '6px solid transparent',
                      borderTop: '6px solid rgba(0, 0, 0, 0.95)',
                    }}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Toggle switch */}
          <label
            style={{
              position: 'relative',
              display: 'inline-block',
              width: '44px',
              height: '24px',
              cursor:
                !isValidUrl || isFavoritesLoading
                  ? 'not-allowed'
                  : 'pointer',
              opacity: !isValidUrl || isFavoritesLoading ? 0.5 : 1,
            }}
          >
            <input
              type="checkbox"
              checked={favoritesEnabled}
              onChange={handleToggleFavorites}
              disabled={!isValidUrl || isFavoritesLoading}
              style={{
                opacity: 0,
                width: 0,
                height: 0,
              }}
            />
            <span
              style={{
                position: 'absolute',
                cursor:
                  !isValidUrl || isFavoritesLoading
                    ? 'not-allowed'
                    : 'pointer',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: favoritesEnabled
                  ? COLORS.PRIMARY_GREEN
                  : '#444',
                transition: 'all 0.3s ease',
                borderRadius: '24px',
                boxShadow: favoritesEnabled
                  ? '0 0 8px rgba(37, 129, 14, 0.4)'
                  : 'none',
              }}
            >
              <span
                style={{
                  position: 'absolute',
                  content: '',
                  height: '18px',
                  width: '18px',
                  left: favoritesEnabled ? '23px' : '3px',
                  bottom: '3px',
                  backgroundColor: COLORS.WHITE,
                  transition: 'all 0.3s ease',
                  borderRadius: '50%',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                }}
              />
            </span>
          </label>
        </div>

        {/* Loading message */}
        {isFavoritesLoading && (
          <div
            style={{
              fontSize: '12px',
              color: '#aaa',
              fontStyle: 'italic',
              padding: '4px 0',
              flexShrink: 0,
            }}
          >
            {favoritesEnabled ? 'Removing stars...' : 'Adding stars...'}
          </div>
        )}

        {/* Filter button */}
        {favoritesEnabled && favoritesCount > 0 && (
          <button
            onClick={handleToggleFavoritesFilter}
            disabled={!isValidUrl || isFilterLoading}
            style={{
              width: '100%',
              backgroundColor: showFavoritesOnly
                ? COLORS.PRIMARY_GREEN
                : 'rgba(255, 255, 255, 0.08)',
              color: COLORS.WHITE,
              border: `1px solid ${
                showFavoritesOnly
                  ? COLORS.PRIMARY_GREEN
                  : 'rgba(255, 255, 255, 0.15)'
              }`,
              padding: '10px 14px',
              fontSize: '13px',
              fontWeight: '600',
              borderRadius: '5px',
              cursor:
                isValidUrl && !isFilterLoading ? 'pointer' : 'not-allowed',
              transition: 'all 0.2s ease',
              opacity: isValidUrl && !isFilterLoading ? 1 : 0.5,
              boxShadow: showFavoritesOnly
                ? '0 0 8px rgba(37, 129, 14, 0.3)'
                : 'none',
              flexShrink: 0,
            }}
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
        )}

        {/* Favorites list */}
        {favoritesEnabled && favoritesCount > 0 && (
          <>
            <button
              onClick={() =>
                setFavoritesListExpanded(!favoritesListExpanded)
              }
              style={{
                width: '100%',
                backgroundColor: 'transparent',
                color: '#ccc',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                padding: '8px 12px',
                fontSize: '12px',
                fontWeight: '600',
                borderRadius: '4px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexShrink: 0,
              }}
            >
              <span>Your Favorites ({favoritesCount})</span>
              <span
                style={{
                  transition: 'transform 0.3s ease',
                  transform: favoritesListExpanded
                    ? 'rotate(180deg)'
                    : 'rotate(0deg)',
                }}
              >
                ▼
              </span>
            </button>

            {favoritesListExpanded && (
              <div
                style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  minHeight: 0,
                  overflow: 'hidden',
                }}
              >
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
