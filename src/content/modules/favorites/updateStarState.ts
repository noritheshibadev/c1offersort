import { findAllTiles, extractMerchantTLD } from '@/shared/domHelpers';

/**
 * Updates the visual state of star buttons for a specific merchant.
 * Called when favorites are added/removed from the popup to sync the UI.
 *
 * @param merchantTLD - The merchant TLD to update stars for
 * @param isFavorited - Whether the merchant is now favorited
 */
export function updateStarState(merchantTLD: string, isFavorited: boolean): void {
  console.log(`[UpdateStarState] Updating star to ${isFavorited ? 'favorited' : 'unfavorited'}`);

  const tiles = findAllTiles();

  for (const tile of tiles) {
    const tileMerchantTLD = extractMerchantTLD(tile);

    if (tileMerchantTLD === merchantTLD) {
      const starButton = tile.querySelector('.c1-favorite-star') as HTMLButtonElement;

      if (starButton) {
        starButton.textContent = isFavorited ? "★" : "☆";
        starButton.setAttribute(
          "aria-label",
          isFavorited ? "Unfavorite offer" : "Favorite offer"
        );
        starButton.setAttribute(
          "title",
          isFavorited ? "Remove from favorites" : "Add to favorites"
        );
        console.log('[UpdateStarState] Updated star button');
      }
    }
  }
}
