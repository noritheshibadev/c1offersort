export type SortCriteria = "mileage" | "alphabetical" | "merchantMileage";
export type SortOrder = "desc" | "asc" | "desc-asc" | "desc-desc" | "asc-asc" | "asc-desc";
export type ViewMode = "grid" | "table";

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
