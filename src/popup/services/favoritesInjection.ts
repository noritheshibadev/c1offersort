import type { FavoritesResult } from "../../types";
import { chromeService } from "@/services/ChromeService";
import { getUserFriendlyErrorMessage } from "@/utils/errorHandler";

/**
 * Enables the favorites feature in the active tab by injecting star buttons into offer tiles.
 * Sends a message to the content script to perform the injection and set up observers.
 *
 * @param tabId - The ID of the tab to inject favorites into
 * @returns Result with success status and current favorites count
 */
export async function injectFavoritesInActiveTab(tabId: number): Promise<FavoritesResult> {
  try {
    const result = await chromeService.injectFavorites(tabId);
    return result;
  } catch (error) {
    console.error("[Favorites] Injection failed:", error);

    return {
      success: false,
      favoritesCount: 0,
      error: getUserFriendlyErrorMessage(error, "Injection failed"),
    };
  }
}
