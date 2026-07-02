/**
 * Shared progress-state shapes for long-running content-script operations.
 *
 * The content script tracks progress in memory (see src/content/state.ts) and
 * reports it via the GET_SORT_PROGRESS and GET_FILTER_PROGRESS message types.
 * Defining these shapes in one place keeps state, handler, and popup hook in sync.
 */

export type SortProgressPhase = "pagination" | "sorting";

export interface SortProgress {
  type: SortProgressPhase;
  offersLoaded?: number;
  pagesLoaded?: number;
  totalOffers?: number;
}

export interface FilterProgress {
  offersLoaded: number;
  pagesLoaded: number;
}

export interface SortProgressState {
  isActive: boolean;
  progress: SortProgress | null;
}

export interface FilterProgressState {
  isActive: boolean;
  progress: FilterProgress | null;
}

export interface ProgressState {
  sort: SortProgressState;
  filter: FilterProgressState;
}
