/**
 * Tests for favoritesManager - critical business logic
 * Tests core functionality, edge cases, and error handling
 * Does NOT test implementation details like retry logic
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  getFavorites,
  addFavorite,
  removeFavorite,
  toggleFavorite,
  isFavorited,
} from "../favoritesManager";
import { FavoritesError, FavoritesErrorCode } from "../favoritesErrors";
import type { FavoritedOffer } from "../../types";

describe("favoritesManager", () => {
  const mockOffer: Omit<FavoritedOffer, "favoritedAt"> = {
    merchantName: "Hilton",
    merchantTLD: "hilton.com",
    mileageValue: "10X miles",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(chrome.storage.local.get).mockResolvedValue({});
    vi.mocked(chrome.storage.local.set).mockResolvedValue(undefined);
    vi.mocked(chrome.storage.local.remove).mockResolvedValue(undefined);
  });

  describe("getFavorites", () => {
    it("returns empty array when no favorites exist", async () => {
      vi.mocked(chrome.storage.local.get).mockResolvedValue({});

      const result = await getFavorites();

      expect(result).toEqual([]);
    });

    it("returns stored favorites", async () => {
      const mockFavorites: FavoritedOffer[] = [
        { ...mockOffer, favoritedAt: Date.now() },
      ];
      vi.mocked(chrome.storage.local.get).mockResolvedValue({
        "c1-offers-favorites-feed": mockFavorites,
      });

      const result = await getFavorites();

      expect(result).toEqual(mockFavorites);
    });

    it("throws error when favorites data is not an array", async () => {
      vi.mocked(chrome.storage.local.get).mockResolvedValue({
        "c1-offers-favorites-feed": "invalid data",
      });

      await expect(getFavorites()).rejects.toThrow(FavoritesError);
      await expect(getFavorites()).rejects.toMatchObject({
        code: FavoritesErrorCode.INVALID_DATA,
      });
    });

    it("handles storage read timeout", async () => {
      vi.mocked(chrome.storage.local.get).mockRejectedValue(
        new Error("Storage get timed out after 3000ms")
      );

      await expect(getFavorites()).rejects.toThrow(FavoritesError);
    });
  });

  describe("addFavorite", () => {
    it("adds a new favorite successfully", async () => {
      vi.mocked(chrome.storage.local.get)
        .mockResolvedValueOnce({}) // Initial read
        .mockResolvedValueOnce({ // Verification read
          "c1-offers-favorites-feed": [{ ...mockOffer, favoritedAt: expect.any(Number) }],
        });

      await addFavorite(mockOffer);

      expect(chrome.storage.local.set).toHaveBeenCalledWith({
        "c1-offers-favorites-feed": [expect.objectContaining({
          merchantName: "Hilton",
          merchantTLD: "hilton.com",
          mileageValue: "10X miles",
          favoritedAt: expect.any(Number),
        })],
      });
    });

    it("does not add duplicate favorites", async () => {
      const existing: FavoritedOffer[] = [
        { ...mockOffer, favoritedAt: Date.now() },
      ];
      vi.mocked(chrome.storage.local.get).mockResolvedValue({
        "c1-offers-favorites-feed": existing,
      });

      await addFavorite(mockOffer);

      expect(chrome.storage.local.set).not.toHaveBeenCalled();
    });

    it("adds favoritedAt timestamp automatically", async () => {
      vi.mocked(chrome.storage.local.get)
        .mockResolvedValueOnce({}) // Initial read
        .mockResolvedValueOnce({ // Verification read
          "c1-offers-favorites-feed": [{ ...mockOffer, favoritedAt: Date.now() }],
        });

      const beforeTime = Date.now();
      await addFavorite(mockOffer);
      const afterTime = Date.now();

      const calls = vi.mocked(chrome.storage.local.set).mock.calls;
      const savedFavorites = calls[0][0]["c1-offers-favorites-feed"] as FavoritedOffer[];
      const timestamp = savedFavorites[0].favoritedAt;

      expect(timestamp).toBeGreaterThanOrEqual(beforeTime);
      expect(timestamp).toBeLessThanOrEqual(afterTime);
    });

    it("throws error when exceeding maximum favorites (1000)", async () => {
      const manyFavorites: FavoritedOffer[] = Array.from({ length: 1000 }, (_, i) => ({
        merchantName: `Merchant ${i}`,
        merchantTLD: `merchant${i}.com`,
        mileageValue: "5X miles",
        favoritedAt: Date.now(),
      }));

      vi.mocked(chrome.storage.local.get).mockResolvedValue({
        "c1-offers-favorites-feed": manyFavorites,
      });

      await expect(
        addFavorite({ merchantName: "New", merchantTLD: "new.com", mileageValue: "2X miles" })
      ).rejects.toThrow(FavoritesError);

      await expect(
        addFavorite({ merchantName: "New", merchantTLD: "new.com", mileageValue: "2X miles" })
      ).rejects.toMatchObject({
        code: FavoritesErrorCode.SIZE_LIMIT_EXCEEDED,
      });
    });

  });

  describe("removeFavorite", () => {
    it("removes an existing favorite", async () => {
      const favorites: FavoritedOffer[] = [
        { ...mockOffer, favoritedAt: Date.now() },
        {
          merchantName: "Delta",
          merchantTLD: "delta.com",
          mileageValue: "5X miles",
          favoritedAt: Date.now(),
        },
      ];

      vi.mocked(chrome.storage.local.get)
        .mockResolvedValueOnce({ "c1-offers-favorites-feed": favorites }) // Initial read
        .mockResolvedValueOnce({ "c1-offers-favorites-feed": [favorites[1]] }); // Verification

      await removeFavorite("hilton.com");

      expect(chrome.storage.local.set).toHaveBeenCalledWith({
        "c1-offers-favorites-feed": [favorites[1]],
      });
    });

    it("does nothing when favorite does not exist", async () => {
      const favorites: FavoritedOffer[] = [
        { ...mockOffer, favoritedAt: Date.now() },
      ];

      vi.mocked(chrome.storage.local.get).mockResolvedValue({
        "c1-offers-favorites-feed": favorites,
      });

      await removeFavorite("nonexistent.com");

      expect(chrome.storage.local.set).not.toHaveBeenCalled();
    });
  });

  describe("toggleFavorite", () => {
    it("adds favorite when not present", async () => {
      vi.mocked(chrome.storage.local.get)
        .mockResolvedValueOnce({}) // isFavorited check
        .mockResolvedValueOnce({}) // addFavorite read
        .mockResolvedValueOnce({ // addFavorite verification
          "c1-offers-favorites-feed": [{ ...mockOffer, favoritedAt: Date.now() }],
        });

      const result = await toggleFavorite(mockOffer);

      expect(result).toBe(true);
      expect(chrome.storage.local.set).toHaveBeenCalled();
    });

    it("removes favorite when present", async () => {
      const favorites: FavoritedOffer[] = [
        { ...mockOffer, favoritedAt: Date.now() },
      ];

      vi.mocked(chrome.storage.local.get)
        .mockResolvedValueOnce({ "c1-offers-favorites-feed": favorites }) // isFavorited check
        .mockResolvedValueOnce({ "c1-offers-favorites-feed": favorites }) // removeFavorite read
        .mockResolvedValueOnce({ "c1-offers-favorites-feed": [] }); // verification

      const result = await toggleFavorite(mockOffer);

      expect(result).toBe(false);
      expect(chrome.storage.local.set).toHaveBeenCalledWith({
        "c1-offers-favorites-feed": [],
      });
    });
  });

  describe("isFavorited", () => {
    it("returns true when favorite exists", async () => {
      const favorites: FavoritedOffer[] = [
        { ...mockOffer, favoritedAt: Date.now() },
      ];

      vi.mocked(chrome.storage.local.get).mockResolvedValue({
        "c1-offers-favorites-feed": favorites,
      });

      const result = await isFavorited("hilton.com");

      expect(result).toBe(true);
    });

    it("returns false when favorite does not exist", async () => {
      vi.mocked(chrome.storage.local.get).mockResolvedValue({});

      const result = await isFavorited("hilton.com");

      expect(result).toBe(false);
    });
  });

  describe("Edge Cases", () => {
    it("handles very long merchant names", async () => {
      const longOffer = {
        merchantName: "A".repeat(1000),
        merchantTLD: "test.com",
        mileageValue: "5X miles",
      };

      vi.mocked(chrome.storage.local.get)
        .mockResolvedValueOnce({}) // Initial read
        .mockResolvedValueOnce({ // Verification
          "c1-offers-favorites-feed": [{ ...longOffer, favoritedAt: Date.now() }],
        });

      await addFavorite(longOffer);

      expect(chrome.storage.local.set).toHaveBeenCalled();
    });

    it("handles special characters in merchant data", async () => {
      const specialOffer = {
        merchantName: "Test & Co. <script>",
        merchantTLD: "test-co.com",
        mileageValue: "10X miles",
      };

      vi.mocked(chrome.storage.local.get)
        .mockResolvedValueOnce({}) // Initial read
        .mockResolvedValueOnce({ // Verification
          "c1-offers-favorites-feed": [{ ...specialOffer, favoritedAt: Date.now() }],
        });

      await addFavorite(specialOffer);

      // Verify the offer was saved (implementation will handle escaping)
      expect(chrome.storage.local.set).toHaveBeenCalled();
      const savedData = vi.mocked(chrome.storage.local.set).mock.calls[0][0];
      expect(savedData["c1-offers-favorites-feed"][0].merchantName).toBe("Test & Co. <script>");
    });

    it("handles empty mileageValue", async () => {
      const emptyMileageOffer = {
        merchantName: "Test",
        merchantTLD: "test.com",
        mileageValue: "",
      };

      vi.mocked(chrome.storage.local.get)
        .mockResolvedValueOnce({}) // Initial read
        .mockResolvedValueOnce({ // Verification
          "c1-offers-favorites-feed": [{ ...emptyMileageOffer, favoritedAt: Date.now() }],
        });

      await addFavorite(emptyMileageOffer);

      expect(chrome.storage.local.set).toHaveBeenCalled();
    });
  });

  describe("Storage Size Limits", () => {
    it("throws error when serialized data exceeds 1MB", async () => {
      // Create favorites that will exceed 1MB when serialized
      const largeFavorites: FavoritedOffer[] = Array.from({ length: 500 }, (_, i) => ({
        merchantName: "M".repeat(2000), // Very long name
        merchantTLD: `merchant${i}.com`,
        mileageValue: "5X miles",
        favoritedAt: Date.now(),
      }));

      vi.mocked(chrome.storage.local.get).mockResolvedValue({
        "c1-offers-favorites-feed": largeFavorites,
      });

      await expect(
        addFavorite({ merchantName: "New", merchantTLD: "new.com", mileageValue: "2X miles" })
      ).rejects.toThrow(FavoritesError);

      await expect(
        addFavorite({ merchantName: "New", merchantTLD: "new.com", mileageValue: "2X miles" })
      ).rejects.toMatchObject({
        code: FavoritesErrorCode.SIZE_LIMIT_EXCEEDED,
      });
    });
  });
});
