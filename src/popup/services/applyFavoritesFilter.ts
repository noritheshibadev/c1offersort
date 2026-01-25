import type { FavoritesResult, OfferType, ChannelType } from "../../types";
import { chromeService } from "@/services/ChromeService";
import { getUserFriendlyErrorMessage } from "@/utils/errorHandler";

/**
 * Applies filters (favorites, offer type, and/or channel) in the active tab.
 *
 * @param tabId - The ID of the tab to apply the filter to
 * @param showFavoritesOnly - If true, show only favorited offers
 * @param offerTypeFilter - Filter by offer type: 'all', 'multiplier', or 'static'
 * @param channelFilter - Filter by channel: 'all', 'in-store', 'in-app', or 'online'
 * @returns Result with success status, tile counts, and list of missing favorites
 */
export async function applyFavoritesFilterInActiveTab(
  tabId: number,
  showFavoritesOnly: boolean,
  offerTypeFilter: OfferType = 'all',
  channelFilter: ChannelType = 'all'
): Promise<FavoritesResult> {
  try {
    const result = await chromeService.sendFilterRequest(tabId, showFavoritesOnly, offerTypeFilter, channelFilter);
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
