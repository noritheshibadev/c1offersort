import type { FavoritesResult } from "../../types";
import { chromeService } from "@/services/ChromeService";
import { getUserFriendlyErrorMessage } from "@/utils/errorHandler";

/**
 * Applies or removes the favorites filter in the active tab.
 * When enabled, hides non-favorited offers. When disabled, shows all offers.
 *
 * @param tabId - The ID of the tab to apply the filter to
 * @param showFavoritesOnly - If true, show only favorited offers; if false, show all
 * @returns Result with success status, tile counts, and list of missing favorites
 */
export async function applyFavoritesFilterInActiveTab(
  tabId: number,
  showFavoritesOnly: boolean
): Promise<FavoritesResult> {
  try {
    const result = await chromeService.sendFilterRequest(tabId, showFavoritesOnly);
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
