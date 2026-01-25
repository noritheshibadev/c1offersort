export type SortCriteria = "mileage" | "alphabetical";
export type SortOrder = "desc" | "asc";
export type OfferType = "all" | "multiplier" | "static";
export type ChannelType = "all" | "in-store" | "in-app" | "online";

export interface SortConfig {
  criteria: SortCriteria;
  order: SortOrder;
}

export interface FavoritedOffer {
  merchantTLD: string;
  merchantName: string;
  mileageValue: string;
  favoritedAt: number;
}

export interface FavoritesResult {
  success: boolean;
  favoritesCount?: number;
  error?: string;
  missingFavorites?: string[];
  tilesShown?: number;
  tilesHidden?: number;
}

export interface SortResult {
  success: boolean;
  tilesProcessed: number;
  pagesLoaded: number;
  error?: string;
}

export interface ChromeTab {
  id?: number;
  url?: string;
  active: boolean;
  title?: string;
}

export type { ErrorCode } from "../utils/errors";
export { ErrorCodes, SortingError, isSortingError } from "../utils/errors";
