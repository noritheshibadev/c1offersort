import React, { useCallback } from 'react';
import type { FavoritedOffer } from "@/types";
import { removeFavorite } from "@/utils/favoritesManager";
import "./FavoritesList.css";

interface FavoritesListProps {
  favorites: FavoritedOffer[];
  missingFavorites: string[];
  onRemove: () => void;
  currentUrl: string | null;
  disabled?: boolean;
}

export const FavoritesList = React.memo(({
  favorites,
  missingFavorites,
  onRemove,
  currentUrl,
  disabled = false,
}: FavoritesListProps) => {
  const handleRemove = useCallback(async (merchantTLD: string) => {
    try {
      await removeFavorite(merchantTLD, currentUrl || undefined);

      // Send message to content script to update the star button on the page
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tabs[0]?.id) {
        chrome.tabs.sendMessage(tabs[0].id, {
          type: "UPDATE_STAR_STATE",
          merchantTLD,
          isFavorited: false,
        });
      }

      onRemove();
    } catch (error) {
      console.error("[Favorites] Failed to remove:", error);
    }
  }, [currentUrl, onRemove]);

  if (favorites.length === 0) {
    return null;
  }

  return (
    <div className="favorites-list">
      <div className="favorites-items">
        {favorites.map((favorite) => {
          const isMissing = missingFavorites.includes(favorite.merchantName);

          return (
            <div
              key={favorite.merchantTLD}
              className={`favorite-item ${isMissing ? "missing" : ""}`}
            >
              <div className="favorite-info">
                <div className="favorite-name">{favorite.merchantName}</div>
                <div
                  className={`favorite-mileage ${
                    isMissing ? "missing-text" : ""
                  }`}
                >
                  {isMissing ? "Not found - try search" : favorite.mileageValue}
                </div>
              </div>
              <button
                className="favorite-remove-btn"
                onClick={() => handleRemove(favorite.merchantTLD)}
                disabled={disabled}
                title="Remove from favorites"
              >
                ×
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  // Custom comparison: only re-render if these actually changed
  return prevProps.favorites === nextProps.favorites &&
         prevProps.missingFavorites === nextProps.missingFavorites &&
         prevProps.currentUrl === nextProps.currentUrl;
});

FavoritesList.displayName = 'FavoritesList';
