import type { FavoritesResult, OfferType } from "../../types";
import { chromeService } from "@/services/ChromeService";
import { getUserFriendlyErrorMessage } from "@/utils/errorHandler";

/**
 * Applies filters (favorites and/or offer type) in the active tab.
 *
 * @param tabId - The ID of the tab to apply the filter to
 * @param showFavoritesOnly - If true, show only favorited offers
 * @param offerTypeFilter - Filter by offer type: 'all', 'multiplier', or 'static'
 * @returns Result with success status, tile counts, and list of missing favorites
 */
export async function applyFavoritesFilterInActiveTab(
  tabId: number,
  showFavoritesOnly: boolean,
  offerTypeFilter: OfferType = 'all'
): Promise<FavoritesResult> {
  try {
    const result = await chromeService.sendFilterRequest(tabId, showFavoritesOnly, offerTypeFilter);
    return result;
  } catch (error) {
    console.error("[Favorites Filter] Failed:", error);

    return {
      success: false,
      favoritesCount: 0,
      error: getUserFriendlyErrorMessage(error, "Filter failed"),
    };
  }
}
