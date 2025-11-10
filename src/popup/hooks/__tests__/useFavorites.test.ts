/**
 * Behavior tests for useFavorites hook
 * Tests user-facing behaviors and interactions, not implementation details
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useFavorites } from "../useFavorites";
import * as favoritesManager from "@/utils/favoritesManager";
import type { FavoritedOffer } from "@/types";

vi.mock("@/utils/favoritesManager");

describe("useFavorites - User Behaviors", () => {
  const mockFavorites: FavoritedOffer[] = [
    {
      merchantName: "Hilton Hotels",
      merchantTLD: "hilton.com",
      mileageValue: "10X miles",
      favoritedAt: Date.now() - 1000,
    },
    {
      merchantName: "Delta Airlines",
      merchantTLD: "delta.com",
      mileageValue: "5X miles",
      favoritedAt: Date.now(),
    },
  ];

  const mockUrl = "https://capitaloneoffers.com/feed";

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(favoritesManager.getFavorites).mockResolvedValue([]);
  });

  describe("User Opens Popup - Initial Load", () => {
    it("should load favorites from storage on mount", async () => {
      vi.mocked(favoritesManager.getFavorites).mockResolvedValue(mockFavorites);

      const { result } = renderHook(() => useFavorites(mockUrl));

      await waitFor(() => {
        expect(favoritesManager.getFavorites).toHaveBeenCalledWith(mockUrl);
      });

      await waitFor(() => {
        expect(result.current.favorites).toEqual(mockFavorites);
        expect(result.current.favoritesCount).toBe(2);
      });
    });

    it("should show zero favorites when none exist", async () => {
      const { result } = renderHook(() => useFavorites(mockUrl));

      await waitFor(() => {
        expect(result.current.favorites).toEqual([]);
        expect(result.current.favoritesCount).toBe(0);
      });
    });

    it("should not load favorites when URL is null", async () => {
      const { result } = renderHook(() => useFavorites(null));

      // Wait a bit to ensure no async operations happen
      await new Promise(resolve => setTimeout(resolve, 50));

      expect(favoritesManager.getFavorites).not.toHaveBeenCalled();
      expect(result.current.favorites).toEqual([]);
      expect(result.current.favoritesCount).toBe(0);
    });
  });

  describe("User Favorites Offers from Page", () => {
    it("should refresh and show updated favorites count", async () => {
      const { result } = renderHook(() => useFavorites(mockUrl));

      await waitFor(() => {
        expect(result.current.favoritesCount).toBe(0);
      });

      vi.mocked(favoritesManager.getFavorites).mockResolvedValue(mockFavorites);

      await act(async () => {
        await result.current.refreshFavorites();
      });

      expect(result.current.favorites).toEqual(mockFavorites);
      expect(result.current.favoritesCount).toBe(2);
    });

    it("should handle adding multiple favorites", async () => {
      const { result } = renderHook(() => useFavorites(mockUrl));

      vi.mocked(favoritesManager.getFavorites).mockResolvedValue([mockFavorites[0]]);
      await act(async () => {
        await result.current.refreshFavorites();
      });
      expect(result.current.favoritesCount).toBe(1);

      vi.mocked(favoritesManager.getFavorites).mockResolvedValue(mockFavorites);
      await act(async () => {
        await result.current.refreshFavorites();
      });
      expect(result.current.favoritesCount).toBe(2);
    });
  });

  describe("User Removes Favorites from List", () => {
    it("should update count after removing a favorite", async () => {
      vi.mocked(favoritesManager.getFavorites).mockResolvedValue(mockFavorites);

      const { result } = renderHook(() => useFavorites(mockUrl));

      await waitFor(() => {
        expect(result.current.favoritesCount).toBe(2);
      });

      vi.mocked(favoritesManager.getFavorites).mockResolvedValue([mockFavorites[0]]);

      await act(async () => {
        await result.current.refreshFavorites();
      });

      expect(result.current.favoritesCount).toBe(1);
      expect(result.current.favorites).toEqual([mockFavorites[0]]);
    });

    it("should handle removing all favorites", async () => {
      vi.mocked(favoritesManager.getFavorites).mockResolvedValue(mockFavorites);

      const { result } = renderHook(() => useFavorites(mockUrl));

      await waitFor(() => {
        expect(result.current.favoritesCount).toBe(2);
      });

      vi.mocked(favoritesManager.getFavorites).mockResolvedValue([]);

      await act(async () => {
        await result.current.refreshFavorites();
      });

      expect(result.current.favoritesCount).toBe(0);
      expect(result.current.favorites).toEqual([]);
    });
  });

  describe("User Reopens Popup", () => {
    it("should reload favorites from storage on each mount", async () => {
      vi.mocked(favoritesManager.getFavorites).mockResolvedValue([mockFavorites[0]]);

      const { unmount } = renderHook(() => useFavorites(mockUrl));

      await waitFor(() => {
        expect(favoritesManager.getFavorites).toHaveBeenCalledTimes(1);
      });

      unmount();

      vi.mocked(favoritesManager.getFavorites).mockResolvedValue(mockFavorites);

      const { result } = renderHook(() => useFavorites(mockUrl));

      await waitFor(() => {
        expect(favoritesManager.getFavorites).toHaveBeenCalledTimes(2);
      });

      await waitFor(() => {
        expect(result.current.favoritesCount).toBe(2);
      });
    });
  });

  describe("URL Changes", () => {
    it("should reload favorites when URL changes", async () => {
      vi.mocked(favoritesManager.getFavorites).mockResolvedValue([mockFavorites[0]]);

      const { result, rerender } = renderHook(
        ({ url }) => useFavorites(url),
        { initialProps: { url: mockUrl } }
      );

      await waitFor(() => {
        expect(result.current.favoritesCount).toBe(1);
      });

      vi.mocked(favoritesManager.getFavorites).mockResolvedValue(mockFavorites);
      const newUrl = "https://capitaloneoffers.com/c1-offers";

      rerender({ url: newUrl });

      await waitFor(() => {
        expect(favoritesManager.getFavorites).toHaveBeenCalledWith(newUrl);
      });

      await waitFor(() => {
        expect(result.current.favoritesCount).toBe(2);
      });
    });

    it("should not reload when URL changes to null", async () => {
      vi.mocked(favoritesManager.getFavorites).mockResolvedValue([mockFavorites[0]]);

      const { result, rerender } = renderHook(
        ({ url }) => useFavorites(url),
        { initialProps: { url: mockUrl } }
      );

      await waitFor(() => {
        expect(result.current.favoritesCount).toBe(1);
      });

      const callCount = vi.mocked(favoritesManager.getFavorites).mock.calls.length;

      rerender({ url: null });

      // Wait a bit to ensure no new calls happen
      await new Promise(resolve => setTimeout(resolve, 50));

      expect(vi.mocked(favoritesManager.getFavorites).mock.calls.length).toBe(callCount);
    });
  });

  describe("Edge Cases", () => {
    it("should handle refresh with no changes", async () => {
      vi.mocked(favoritesManager.getFavorites).mockResolvedValue(mockFavorites);

      const { result } = renderHook(() => useFavorites(mockUrl));

      await waitFor(() => {
        expect(result.current.favoritesCount).toBe(2);
      });

      await act(async () => {
        await result.current.refreshFavorites();
      });

      expect(result.current.favoritesCount).toBe(2);
      expect(result.current.favorites).toEqual(mockFavorites);
    });

    it("should handle multiple rapid refreshes", async () => {
      const { result } = renderHook(() => useFavorites(mockUrl));

      vi.mocked(favoritesManager.getFavorites).mockResolvedValue(mockFavorites);

      await act(async () => {
        await Promise.all([
          result.current.refreshFavorites(),
          result.current.refreshFavorites(),
          result.current.refreshFavorites(),
        ]);
      });

      expect(result.current.favoritesCount).toBe(2);
    });

    it("should not refresh when URL is null", async () => {
      const { result } = renderHook(() => useFavorites(null));

      await act(async () => {
        await result.current.refreshFavorites();
      });

      expect(favoritesManager.getFavorites).not.toHaveBeenCalled();
    });
  });
});
