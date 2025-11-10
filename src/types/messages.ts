/**
 * Message types for communication between extension components.
 * Used for type-safe message passing via chrome.runtime.sendMessage.
 */

export interface PaginationProgressMessage {
  type: "PAGINATION_PROGRESS";
  offersLoaded: number;
  pagesLoaded: number;
}

export interface SortingStartMessage {
  type: "SORTING_START";
  totalOffers: number;
}

export interface SortRequestMessage {
  type: "SORT_REQUEST";
  criteria: string;
  order: string;
}

export interface FilterRequestMessage {
  type: "FILTER_REQUEST";
  showFavoritesOnly: boolean;
}

export interface InjectFavoritesRequestMessage {
  type: "INJECT_FAVORITES_REQUEST";
}

export interface RemoveFavoritesRequestMessage {
  type: "REMOVE_FAVORITES_REQUEST";
}

export interface UpdateStarStateMessage {
  type: "UPDATE_STAR_STATE";
  merchantTLD: string;
  isFavorited: boolean;
}

export interface SortCompleteMessage {
  type: "SORT_COMPLETE";
  result?: {
    success: boolean;
    sortedCount: number;
    errors?: string[];
  };
}

export interface ViewModeRequestMessage {
  type: "VIEW_MODE_REQUEST";
  viewMode: "grid" | "table";
}

export interface GetViewModeMessage {
  type: "GET_VIEW_MODE";
}

export type ExtensionMessage =
  | PaginationProgressMessage
  | SortingStartMessage
  | SortRequestMessage
  | FilterRequestMessage
  | InjectFavoritesRequestMessage
  | RemoveFavoritesRequestMessage
  | UpdateStarStateMessage
  | SortCompleteMessage
  | ViewModeRequestMessage
  | GetViewModeMessage;

