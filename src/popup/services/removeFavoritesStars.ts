import { chromeService } from "@/services/ChromeService";
import { getUserFriendlyErrorMessage } from "@/utils/errorHandler";

/**
 * Disables the favorites feature in the active tab by removing all star buttons
 * and disconnecting the MutationObserver that watches for new tiles.
 *
 * @param tabId - The ID of the tab to remove favorites from
 * @returns Result with success status, number of stars removed, and any errors
 */
export async function removeFavoritesStarsInActiveTab(tabId: number): Promise<{ success: boolean; starsRemoved: number; error?: string }> {
  try {
    const result = await chromeService.removeFavorites(tabId);
    return result;
  } catch (error) {
    console.error("Remove favorites stars failed:", error);

    return {
      success: false,
      starsRemoved: 0,
      error: getUserFriendlyErrorMessage(error, "Remove failed"),
    };
  }
}
