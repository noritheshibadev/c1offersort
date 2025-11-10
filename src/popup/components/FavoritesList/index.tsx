import type { FavoritedOffer } from "@/types";
import { removeFavorite } from "@/utils/favoritesManager";
import { chromeService } from "@/services/ChromeService";
import "./FavoritesList.css";

interface FavoritesListProps {
  favorites: FavoritedOffer[];
  missingFavorites: string[];
  onRemove: () => void;
  currentUrl: string | null;
}

export const FavoritesList = ({
  favorites,
  missingFavorites,
  onRemove,
  currentUrl,
}: FavoritesListProps) => {
  const handleRemove = async (merchantTLD: string) => {
    try {
      await removeFavorite(merchantTLD, currentUrl || undefined);

      // Send message to content script to update the star button on the page
      await chromeService.updateStarState(merchantTLD, false);

      onRemove();
    } catch (error) {
      console.error("[Favorites] Failed to remove:", error);
    }
  };

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
};
