/**
 * Message types for communication between extension components.
 * Used for type-safe message passing via chrome.runtime.sendMessage.
 */

import type { OfferType } from "./index";

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
  offerTypeFilter?: OfferType;
}

export interface FilterRequestMessage {
  type: "FILTER_REQUEST";
  showFavoritesOnly: boolean;
  offerTypeFilter: OfferType;
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

export interface SearchQueryMessage {
  type: "SEARCH_QUERY";
  query: string;
}

export interface SearchResult {
  merchantName: string;
  merchantTLD: string;
  mileageText: string;
  score: number;
}

export interface SearchResultsMessage {
  type: "SEARCH_RESULTS";
  success: boolean;
  results: SearchResult[];
  totalMatches: number;
  searchEnabled: boolean;
  error?: string;
}

export interface ScrollToOfferMessage {
  type: "SCROLL_TO_OFFER";
  merchantTLD: string;
}

export interface BuildSearchIndexMessage {
  type: "BUILD_SEARCH_INDEX";
}

export interface GetPaginationStatusMessage {
  type: "GET_PAGINATION_STATUS";
}

export interface GetSortProgressMessage {
  type: "GET_SORT_PROGRESS";
}

export interface GetFilterProgressMessage {
  type: "GET_FILTER_PROGRESS";
}

export interface GetExportDataMessage {
  type: "GET_EXPORT_DATA";
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
  | SearchQueryMessage
  | SearchResultsMessage
  | ScrollToOfferMessage
  | BuildSearchIndexMessage
  | GetPaginationStatusMessage
  | GetSortProgressMessage
  | GetFilterProgressMessage
  | GetExportDataMessage;

