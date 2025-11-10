import { getCurrentTab } from "./chromeApi";
import { MessageBus } from "../../messaging";
import type { ViewModeRequestMessage, GetViewModeMessage } from "../../types/messages";

/**
 * Gets the current view mode from the active tab
 *
 * @returns The current view mode ("grid" or "table")
 */
export async function getCurrentViewMode(): Promise<"grid" | "table"> {
  const activeTab = await getCurrentTab();

  if (!activeTab?.id) {
    return "grid"; // Default to grid if no active tab
  }

  try {
    const message: GetViewModeMessage = {
      type: 'GET_VIEW_MODE',
    };
    const result = await MessageBus.sendToTab<GetViewModeMessage>(activeTab.id, message) as { viewMode: "grid" | "table" };
    return result.viewMode || "grid";
  } catch (error) {
    console.error("[View Mode] Failed to get current view mode:", error);
    return "grid"; // Default to grid on error
  }
}

/**
 * Switches the view mode (grid/table) in the active tab
 *
 * @param viewMode - "grid" or "table"
 * @returns Result with success status and number of offers shown
 */
export async function switchViewMode(
  viewMode: "grid" | "table"
): Promise<{ success: boolean; offersShown?: number; error?: string }> {
  const activeTab = await getCurrentTab();

  if (!activeTab?.id) {
    return {
      success: false,
      error: "No active tab found",
    };
  }

  try {
    const message: ViewModeRequestMessage = {
      type: 'VIEW_MODE_REQUEST',
      viewMode,
    };
    const result = await MessageBus.sendToTab<ViewModeRequestMessage>(activeTab.id, message) as { success: boolean; offersShown?: number; error?: string };

    return result;
  } catch (error) {
    console.error("[View Mode] Failed:", error);

    let errorMessage = "View mode change failed";
    if (error instanceof Error) {
      if (error.message.includes('Could not establish connection') ||
          error.message.includes('Receiving end does not exist')) {
        errorMessage = "Please refresh the Capital One page and try again";
      } else {
        errorMessage = error.message;
      }
    }

    return {
      success: false,
      error: errorMessage,
    };
  }
}
