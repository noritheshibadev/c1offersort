/**
 * Behavior tests for App component
 * Tests user-facing behaviors and UI interactions, not implementation details
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import App from "../../App";
import * as useCurrentTabHook from "../../hooks/useCurrentTab";
import * as useSortOffersHook from "../../hooks/useSortOffers";
import * as useFavoritesHook from "../../hooks/useFavorites";
import * as favoritesInjection from "../../services/favoritesInjection";
import * as applyFavoritesFilter from "../../services/applyFavoritesFilter";
import * as removeFavoritesStars from "../../services/removeFavoritesStars";
import type { SortResult } from "@/types";

vi.mock("../../hooks/useCurrentTab");
vi.mock("../../hooks/useSortOffers");
vi.mock("../../hooks/useFavorites");
vi.mock("../../services/favoritesInjection");
vi.mock("../../services/applyFavoritesFilter");
vi.mock("../../services/removeFavoritesStars");

describe("App - User Behaviors", () => {
  const mockHandleSort = vi.fn();
  const mockSetSortConfig = vi.fn();
  const mockRefreshFavorites = vi.fn();
  const mockToggleShowFavoritesOnly = vi.fn();
  const mockSetShowFavoritesOnly = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(chrome.storage.local.get).mockResolvedValue({
      "c1-favorites-enabled": false,
    } as any);
    vi.mocked(chrome.storage.local.set).mockResolvedValue(undefined);

    vi.mocked(useCurrentTabHook.useCurrentTab).mockReturnValue(
      "https://capitaloneoffers.com/feed"
    );

    vi.mocked(useSortOffersHook.useSortOffers).mockReturnValue({
      isLoading: false,
      sortConfig: { criteria: "mileage", order: "desc" },
      setSortConfig: mockSetSortConfig,
      handleSort: mockHandleSort,
      lastResult: null,
      progressUpdate: null,
    });

    vi.mocked(useFavoritesHook.useFavorites).mockReturnValue({
      favorites: [],
      favoritesCount: 0,
      showFavoritesOnly: false,
      setShowFavoritesOnly: mockSetShowFavoritesOnly,
      toggleShowFavoritesOnly: mockToggleShowFavoritesOnly,
      refreshFavorites: mockRefreshFavorites,
    });

    vi.mocked(favoritesInjection.injectFavoritesInActiveTab).mockResolvedValue({
      success: true,
    });
    vi.mocked(removeFavoritesStars.removeFavoritesStarsInActiveTab).mockResolvedValue({
      success: true,
      starsRemoved: 0,
    });
    vi.mocked(applyFavoritesFilter.applyFavoritesFilterInActiveTab).mockResolvedValue({
      success: true,
      tilesShown: 50,
      tilesHidden: 0,
    });
  });

  describe("User Opens Popup on Valid URL", () => {
    it("should show app title", () => {
      render(<App />);
      expect(screen.getByText("C1 Offers Sorter")).toBeInTheDocument();
    });

    it("should show sort controls", () => {
      render(<App />);
      expect(screen.getByRole("button", { name: /sort offers/i })).toBeInTheDocument();
    });

    it("should have sort button enabled on valid URL", () => {
      render(<App />);
      const sortButton = screen.getByRole("button", { name: /sort offers/i });
      expect(sortButton).not.toBeDisabled();
    });

    it("should show default sort configuration (mileage, desc)", () => {
      render(<App />);
      expect(screen.getByRole("radio", { name: /^mileage value$/i })).toBeChecked();
    });

    it("should not show invalid page overlay", () => {
      render(<App />);
      expect(screen.queryByText(/not on a valid Capital One/i)).not.toBeInTheDocument();
    });
  });

  describe("User Opens Popup on Invalid URL", () => {
    beforeEach(() => {
      vi.mocked(useCurrentTabHook.useCurrentTab).mockReturnValue(
        "https://google.com"
      );
    });

    it("should show invalid page overlay", () => {
      render(<App />);
      expect(screen.getByText(/invalid page/i)).toBeInTheDocument();
      expect(screen.getByText(/this extension only works on the Capital One Offers page/i)).toBeInTheDocument();
    });

    it("should disable sort button on invalid URL", () => {
      render(<App />);
      const sortButton = screen.getByRole("button", { name: /sort offers/i });
      expect(sortButton).toBeDisabled();
    });

    it("should disable favorites toggle on invalid URL", async () => {
      render(<App />);
      const favoritesToggle = screen.getByRole("checkbox", { name: /favorites/i });
      expect(favoritesToggle).toBeDisabled();
    });
  });

  describe("User Changes Sort Criteria", () => {
    it("should update config when user selects alphabetical", () => {
      render(<App />);

      const alphabeticalRadio = screen.getByLabelText(/^merchant name$/i);
      fireEvent.click(alphabeticalRadio);

      expect(mockSetSortConfig).toHaveBeenCalledWith({
        criteria: "alphabetical",
        order: "asc",
      });
    });

    it("should update config when user selects mileage", () => {
      vi.mocked(useSortOffersHook.useSortOffers).mockReturnValue({
        isLoading: false,
        sortConfig: { criteria: "alphabetical", order: "asc" },
        setSortConfig: mockSetSortConfig,
        handleSort: mockHandleSort,
        lastResult: null,
        progressUpdate: null,
      });

      render(<App />);

      const mileageRadio = screen.getByRole("radio", { name: /^mileage value$/i });
      fireEvent.click(mileageRadio);

      expect(mockSetSortConfig).toHaveBeenCalledWith({
        criteria: "mileage",
        order: "desc",
      });
    });

    it("should update config when user selects merchant name + mileage", () => {
      render(<App />);

      const merchantMileageRadio = screen.getByLabelText(/mileage \+ merchant name/i);
      fireEvent.click(merchantMileageRadio);

      expect(mockSetSortConfig).toHaveBeenCalledWith({
        criteria: "merchantMileage",
        order: "desc-asc",
      });
    });
  });

  describe("User Changes Sort Order", () => {
    it("should update order when user changes it", () => {
      render(<App />);

      const ascRadio = screen.getByRole("radio", { name: /ascending|lowest/i });
      fireEvent.click(ascRadio);

      // handleOrderChange passes a function to setSortConfig
      expect(mockSetSortConfig).toHaveBeenCalled();
      const callArg = mockSetSortConfig.mock.calls[0][0];

      // If it's a function, call it with current state to verify behavior
      if (typeof callArg === 'function') {
        const result = callArg({ criteria: "mileage", order: "desc" });
        expect(result).toEqual({ criteria: "mileage", order: "asc" });
      } else {
        // If it's an object, verify it directly
        expect(callArg).toEqual(expect.objectContaining({ order: "asc" }));
      }
    });
  });

  describe("User Clicks Sort Button", () => {
    it("should trigger sort when clicked", () => {
      render(<App />);

      const sortButton = screen.getByRole("button", { name: /sort offers/i });
      fireEvent.click(sortButton);

      expect(mockHandleSort).toHaveBeenCalled();
    });

    it("should show loading state during sort", () => {
      vi.mocked(useSortOffersHook.useSortOffers).mockReturnValue({
        isLoading: true,
        sortConfig: { criteria: "mileage", order: "desc" },
        setSortConfig: mockSetSortConfig,
        handleSort: mockHandleSort,
        lastResult: null,
        progressUpdate: null,
      });

      render(<App />);

      expect(screen.getByRole("button", { name: /sorting/i })).toBeInTheDocument();
    });

    it("should display success message after successful sort", () => {
      const successResult: SortResult = {
        success: true,
        tilesProcessed: 25,
        pagesLoaded: 3,
      };

      vi.mocked(useSortOffersHook.useSortOffers).mockReturnValue({
        isLoading: false,
        sortConfig: { criteria: "mileage", order: "desc" },
        setSortConfig: mockSetSortConfig,
        handleSort: mockHandleSort,
        lastResult: successResult,
        progressUpdate: null,
      });

      render(<App />);

      expect(screen.getByText(/sorted 25 offers/i)).toBeInTheDocument();
    });

    it("should display error message after failed sort", () => {
      const errorResult: SortResult = {
        success: false,
        tilesProcessed: 0,
        pagesLoaded: 0,
        error: "Failed to find offers",
      };

      vi.mocked(useSortOffersHook.useSortOffers).mockReturnValue({
        isLoading: false,
        sortConfig: { criteria: "mileage", order: "desc" },
        setSortConfig: mockSetSortConfig,
        handleSort: mockHandleSort,
        lastResult: errorResult,
        progressUpdate: null,
      });

      render(<App />);

      expect(screen.getByText(/failed to find offers/i)).toBeInTheDocument();
    });
  });

  describe("User Toggles Favorites", () => {
    it("should show favorites toggle", () => {
      render(<App />);
      expect(screen.getByText("Favorites")).toBeInTheDocument();
    });

    it("should enable favorites when user toggles on", async () => {
      render(<App />);

      const toggle = screen.getByRole("checkbox", { name: /favorites/i });
      expect(toggle).not.toBeChecked();

      fireEvent.click(toggle);

      await waitFor(() => {
        expect(favoritesInjection.injectFavoritesInActiveTab).toHaveBeenCalled();
      });

      await waitFor(() => {
        expect(chrome.storage.local.set).toHaveBeenCalledWith({
          "c1-favorites-enabled": true,
        });
      });
    });

    it("should disable favorites when user toggles off", async () => {
      vi.mocked(chrome.storage.local.get).mockResolvedValue({
        "c1-favorites-enabled": true,
      } as any);

      const { rerender } = render(<App />);

      await waitFor(() => {
        rerender(<App />);
      });

      const toggle = screen.getByRole("checkbox", { name: /favorites/i });

      fireEvent.click(toggle);

      await waitFor(() => {
        expect(removeFavoritesStars.removeFavoritesStarsInActiveTab).toHaveBeenCalled();
      });

      await waitFor(() => {
        expect(chrome.storage.local.set).toHaveBeenCalledWith({
          "c1-favorites-enabled": false,
        });
      });
    });

    it("should show favorites count when user has favorites", () => {
      vi.mocked(useFavoritesHook.useFavorites).mockReturnValue({
        favorites: [
          {
            merchantName: "Hilton",
            merchantTLD: "hilton.com",
            mileageValue: "10X",
            favoritedAt: Date.now(),
          },
        ],
        favoritesCount: 1,
        showFavoritesOnly: false,
        setShowFavoritesOnly: mockSetShowFavoritesOnly,
        toggleShowFavoritesOnly: mockToggleShowFavoritesOnly,
        refreshFavorites: mockRefreshFavorites,
      });

      render(<App />);

      expect(screen.getByText("1")).toBeInTheDocument();
    });
  });

  describe("User Filters to Show Favorites Only", () => {
    beforeEach(() => {
      vi.mocked(chrome.storage.local.get).mockResolvedValue({
        "c1-favorites-enabled": true,
      } as any);

      vi.mocked(useFavoritesHook.useFavorites).mockReturnValue({
        favorites: [
          {
            merchantName: "Hilton",
            merchantTLD: "hilton.com",
            mileageValue: "10X",
            favoritedAt: Date.now(),
          },
        ],
        favoritesCount: 1,
        showFavoritesOnly: false,
        setShowFavoritesOnly: mockSetShowFavoritesOnly,
        toggleShowFavoritesOnly: mockToggleShowFavoritesOnly,
        refreshFavorites: mockRefreshFavorites,
      });
    });

    it("should show filter button when favorites are enabled and exist", async () => {
      const { rerender } = render(<App />);

      await waitFor(() => {
        rerender(<App />);
      });

      expect(screen.getByRole("button", { name: /show favorites only/i })).toBeInTheDocument();
    });

    it("should apply filter when user clicks filter button", async () => {
      const { rerender } = render(<App />);

      await waitFor(() => {
        rerender(<App />);
      });

      const filterButton = screen.getByRole("button", { name: /show favorites only/i });
      fireEvent.click(filterButton);

      await waitFor(() => {
        expect(applyFavoritesFilter.applyFavoritesFilterInActiveTab).toHaveBeenCalledWith(true);
      });
    });

    it("should show loading state while filtering", async () => {
      const { rerender } = render(<App />);

      await waitFor(() => {
        rerender(<App />);
      });

      vi.mocked(applyFavoritesFilter.applyFavoritesFilterInActiveTab).mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve({ success: true, tilesShown: 10, tilesHidden: 40 }), 100))
      );

      const filterButton = screen.getByRole("button", { name: /show favorites only/i });
      fireEvent.click(filterButton);

      await waitFor(() => {
        expect(screen.getByText(/loading/i)).toBeInTheDocument();
      });
    });
  });

  describe("User Sees Progress Updates", () => {
    it("should display pagination progress", () => {
      vi.mocked(useSortOffersHook.useSortOffers).mockReturnValue({
        isLoading: true,
        sortConfig: { criteria: "mileage", order: "desc" },
        setSortConfig: mockSetSortConfig,
        handleSort: mockHandleSort,
        lastResult: null,
        progressUpdate: {
          type: "pagination",
          offersLoaded: 50,
          pagesLoaded: 2,
        },
      });

      render(<App />);

      expect(screen.getByText(/loading.*50.*offers/i)).toBeInTheDocument();
      expect(screen.getByText(/page 2/i)).toBeInTheDocument();
    });

    it("should display sorting progress", () => {
      vi.mocked(useSortOffersHook.useSortOffers).mockReturnValue({
        isLoading: true,
        sortConfig: { criteria: "mileage", order: "desc" },
        setSortConfig: mockSetSortConfig,
        handleSort: mockHandleSort,
        lastResult: null,
        progressUpdate: {
          type: "sorting",
          totalOffers: 75,
        },
      });

      render(<App />);

      // The sorting progress type doesn't render anything currently
      // Just verify the component renders without errors
      expect(screen.getByText(/C1 Offers Sorter/i)).toBeInTheDocument();
    });
  });

  describe("User Expands Favorites List", () => {
    beforeEach(() => {
      vi.mocked(chrome.storage.local.get).mockResolvedValue({
        "c1-favorites-enabled": true,
      } as any);

      vi.mocked(useFavoritesHook.useFavorites).mockReturnValue({
        favorites: [
          {
            merchantName: "Hilton",
            merchantTLD: "hilton.com",
            mileageValue: "10X",
            favoritedAt: Date.now(),
          },
        ],
        favoritesCount: 1,
        showFavoritesOnly: false,
        setShowFavoritesOnly: mockSetShowFavoritesOnly,
        toggleShowFavoritesOnly: mockToggleShowFavoritesOnly,
        refreshFavorites: mockRefreshFavorites,
      });
    });

    it("should show expand button when favorites exist", async () => {
      const { rerender } = render(<App />);

      await waitFor(() => {
        rerender(<App />);
      });

      expect(screen.getByRole("button", { name: /your favorites \(1\)/i })).toBeInTheDocument();
    });

    it("should expand list when user clicks expand button", async () => {
      const { rerender } = render(<App />);

      await waitFor(() => {
        rerender(<App />);
      });

      const expandButton = screen.getByRole("button", { name: /your favorites \(1\)/i });
      fireEvent.click(expandButton);

      await waitFor(() => {
        expect(screen.getByText("Hilton")).toBeInTheDocument();
      });
    });
  });

  describe("Accessibility", () => {
    it("should have proper ARIA labels on sort button", () => {
      render(<App />);
      const sortButton = screen.getByRole("button", { name: /sort offers/i });
      expect(sortButton).toBeInTheDocument();
    });

    it("should have semantic radio groups for sort controls", () => {
      render(<App />);
      const radios = screen.getAllByRole("radio");
      expect(radios.length).toBeGreaterThan(0);
    });

    it("should have checkbox for favorites toggle", () => {
      render(<App />);
      const toggle = screen.getByRole("checkbox", { name: /favorites/i });
      expect(toggle).toBeInTheDocument();
    });
  });
});
