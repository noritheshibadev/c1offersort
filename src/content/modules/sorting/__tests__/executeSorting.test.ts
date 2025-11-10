/**
 * Unit tests for sorting logic
 * Tests the sorting behavior for different criteria
 */

import { describe, it, expect, beforeEach, vi } from "vitest";

// Mock tile data structure for testing
interface TileData {
  element: HTMLElement;
  mileage: number;
  merchantName: string;
}

describe("Sorting Logic", () => {
  describe("merchantMileage sort criteria", () => {
    let mockTiles: TileData[];

    beforeEach(() => {
      // Create mock tiles with different merchants and mileage values
      // Note: Some merchants share the same mileage to test secondary sort
      mockTiles = [
        { element: document.createElement("div"), mileage: 5000, merchantName: "Walmart" },
        { element: document.createElement("div"), mileage: 10000, merchantName: "Amazon" },
        { element: document.createElement("div"), mileage: 3000, merchantName: "Target" },
        { element: document.createElement("div"), mileage: 10000, merchantName: "Best Buy" },
        { element: document.createElement("div"), mileage: 2000, merchantName: "Costco" },
        { element: document.createElement("div"), mileage: 10000, merchantName: "Zebra" },
      ];
    });

    it("should sort by mileage (high to low) then merchant name (A-Z) with desc-asc order", () => {
      const sortOrder = "desc-asc";
      const [mileageDir, merchantDir] = sortOrder.split("-");
      const isMileageDesc = mileageDir === "desc";
      const isMerchantDesc = merchantDir === "desc";

      const sortedTiles = mockTiles.sort((a, b) => {
        const mileageComparison = isMileageDesc
          ? b.mileage - a.mileage
          : a.mileage - b.mileage;

        if (mileageComparison !== 0) {
          return mileageComparison;
        } else {
          const nameA = a.merchantName.toLowerCase();
          const nameB = b.merchantName.toLowerCase();
          const nameComparison = nameA.localeCompare(nameB);
          return isMerchantDesc ? -nameComparison : nameComparison;
        }
      });

      // Verify order: 10000 miles (Amazon, Best Buy, Zebra A-Z), then 5000, 3000, 2000
      expect(sortedTiles[0].mileage).toBe(10000);
      expect(sortedTiles[0].merchantName).toBe("Amazon");
      expect(sortedTiles[1].mileage).toBe(10000);
      expect(sortedTiles[1].merchantName).toBe("Best Buy");
      expect(sortedTiles[2].mileage).toBe(10000);
      expect(sortedTiles[2].merchantName).toBe("Zebra");
      expect(sortedTiles[3].mileage).toBe(5000);
      expect(sortedTiles[3].merchantName).toBe("Walmart");
      expect(sortedTiles[4].mileage).toBe(3000);
      expect(sortedTiles[4].merchantName).toBe("Target");
      expect(sortedTiles[5].mileage).toBe(2000);
      expect(sortedTiles[5].merchantName).toBe("Costco");
    });

    it("should sort by mileage (high to low) then merchant name (Z-A) with desc-desc order", () => {
      const sortOrder = "desc-desc";
      const [mileageDir, merchantDir] = sortOrder.split("-");
      const isMileageDesc = mileageDir === "desc";
      const isMerchantDesc = merchantDir === "desc";

      const sortedTiles = mockTiles.sort((a, b) => {
        const mileageComparison = isMileageDesc
          ? b.mileage - a.mileage
          : a.mileage - b.mileage;

        if (mileageComparison !== 0) {
          return mileageComparison;
        } else {
          const nameA = a.merchantName.toLowerCase();
          const nameB = b.merchantName.toLowerCase();
          const nameComparison = nameA.localeCompare(nameB);
          return isMerchantDesc ? -nameComparison : nameComparison;
        }
      });

      // Verify order: 10000 miles (Zebra, Best Buy, Amazon Z-A), then 5000, 3000, 2000
      expect(sortedTiles[0].mileage).toBe(10000);
      expect(sortedTiles[0].merchantName).toBe("Zebra");
      expect(sortedTiles[1].mileage).toBe(10000);
      expect(sortedTiles[1].merchantName).toBe("Best Buy");
      expect(sortedTiles[2].mileage).toBe(10000);
      expect(sortedTiles[2].merchantName).toBe("Amazon");
      expect(sortedTiles[3].mileage).toBe(5000);
      expect(sortedTiles[4].mileage).toBe(3000);
      expect(sortedTiles[5].mileage).toBe(2000);
    });

    it("should sort by mileage (low to high) then merchant name (A-Z) with asc-asc order", () => {
      const sortOrder = "asc-asc";
      const [mileageDir, merchantDir] = sortOrder.split("-");
      const isMileageDesc = mileageDir === "desc";
      const isMerchantDesc = merchantDir === "desc";

      const sortedTiles = mockTiles.sort((a, b) => {
        const mileageComparison = isMileageDesc
          ? b.mileage - a.mileage
          : a.mileage - b.mileage;

        if (mileageComparison !== 0) {
          return mileageComparison;
        } else {
          const nameA = a.merchantName.toLowerCase();
          const nameB = b.merchantName.toLowerCase();
          const nameComparison = nameA.localeCompare(nameB);
          return isMerchantDesc ? -nameComparison : nameComparison;
        }
      });

      // Verify order: 2000, 3000, 5000, then 10000 miles (Amazon, Best Buy, Zebra A-Z)
      expect(sortedTiles[0].mileage).toBe(2000);
      expect(sortedTiles[0].merchantName).toBe("Costco");
      expect(sortedTiles[1].mileage).toBe(3000);
      expect(sortedTiles[1].merchantName).toBe("Target");
      expect(sortedTiles[2].mileage).toBe(5000);
      expect(sortedTiles[2].merchantName).toBe("Walmart");
      expect(sortedTiles[3].mileage).toBe(10000);
      expect(sortedTiles[3].merchantName).toBe("Amazon");
      expect(sortedTiles[4].mileage).toBe(10000);
      expect(sortedTiles[4].merchantName).toBe("Best Buy");
      expect(sortedTiles[5].mileage).toBe(10000);
      expect(sortedTiles[5].merchantName).toBe("Zebra");
    });

    it("should sort by mileage (low to high) then merchant name (Z-A) with asc-desc order", () => {
      const sortOrder = "asc-desc";
      const [mileageDir, merchantDir] = sortOrder.split("-");
      const isMileageDesc = mileageDir === "desc";
      const isMerchantDesc = merchantDir === "desc";

      const sortedTiles = mockTiles.sort((a, b) => {
        const mileageComparison = isMileageDesc
          ? b.mileage - a.mileage
          : a.mileage - b.mileage;

        if (mileageComparison !== 0) {
          return mileageComparison;
        } else {
          const nameA = a.merchantName.toLowerCase();
          const nameB = b.merchantName.toLowerCase();
          const nameComparison = nameA.localeCompare(nameB);
          return isMerchantDesc ? -nameComparison : nameComparison;
        }
      });

      // Verify order: 2000, 3000, 5000, then 10000 miles (Zebra, Best Buy, Amazon Z-A)
      expect(sortedTiles[0].mileage).toBe(2000);
      expect(sortedTiles[1].mileage).toBe(3000);
      expect(sortedTiles[2].mileage).toBe(5000);
      expect(sortedTiles[3].mileage).toBe(10000);
      expect(sortedTiles[3].merchantName).toBe("Zebra");
      expect(sortedTiles[4].mileage).toBe(10000);
      expect(sortedTiles[4].merchantName).toBe("Best Buy");
      expect(sortedTiles[5].mileage).toBe(10000);
      expect(sortedTiles[5].merchantName).toBe("Amazon");
    });

    it("should handle case-insensitive merchant name sorting", () => {
      const caseSensitiveTiles: TileData[] = [
        { element: document.createElement("div"), mileage: 1000, merchantName: "zebra" },
        { element: document.createElement("div"), mileage: 1000, merchantName: "APPLE" },
        { element: document.createElement("div"), mileage: 1000, merchantName: "Microsoft" },
      ];

      const sortOrder = "desc-asc";
      const [mileageDir, merchantDir] = sortOrder.split("-");
      const isMileageDesc = mileageDir === "desc";
      const isMerchantDesc = merchantDir === "desc";

      const sortedTiles = caseSensitiveTiles.sort((a, b) => {
        const mileageComparison = isMileageDesc
          ? b.mileage - a.mileage
          : a.mileage - b.mileage;

        if (mileageComparison !== 0) {
          return mileageComparison;
        } else {
          const nameA = a.merchantName.toLowerCase();
          const nameB = b.merchantName.toLowerCase();
          const nameComparison = nameA.localeCompare(nameB);
          return isMerchantDesc ? -nameComparison : nameComparison;
        }
      });

      // All same mileage, sorted by merchant name A-Z (case-insensitive)
      expect(sortedTiles[0].merchantName).toBe("APPLE");
      expect(sortedTiles[1].merchantName).toBe("Microsoft");
      expect(sortedTiles[2].merchantName).toBe("zebra");
    });
  });

  describe("alphabetical sort criteria", () => {
    it("should sort by merchant name only (A-Z) in ascending order", () => {
      const mockTiles: TileData[] = [
        { element: document.createElement("div"), mileage: 1000, merchantName: "Zebra" },
        { element: document.createElement("div"), mileage: 5000, merchantName: "Apple" },
        { element: document.createElement("div"), mileage: 3000, merchantName: "Microsoft" },
      ];

      const isDescending = false;
      const sortedTiles = mockTiles.sort((a, b) => {
        const nameA = a.merchantName.toLowerCase();
        const nameB = b.merchantName.toLowerCase();
        const comparison = nameA.localeCompare(nameB);
        return isDescending ? -comparison : comparison;
      });

      expect(sortedTiles[0].merchantName).toBe("Apple");
      expect(sortedTiles[1].merchantName).toBe("Microsoft");
      expect(sortedTiles[2].merchantName).toBe("Zebra");
    });

    it("should sort by merchant name only (Z-A) in descending order", () => {
      const mockTiles: TileData[] = [
        { element: document.createElement("div"), mileage: 1000, merchantName: "Zebra" },
        { element: document.createElement("div"), mileage: 5000, merchantName: "Apple" },
        { element: document.createElement("div"), mileage: 3000, merchantName: "Microsoft" },
      ];

      const isDescending = true;
      const sortedTiles = mockTiles.sort((a, b) => {
        const nameA = a.merchantName.toLowerCase();
        const nameB = b.merchantName.toLowerCase();
        const comparison = nameA.localeCompare(nameB);
        return isDescending ? -comparison : comparison;
      });

      expect(sortedTiles[0].merchantName).toBe("Zebra");
      expect(sortedTiles[1].merchantName).toBe("Microsoft");
      expect(sortedTiles[2].merchantName).toBe("Apple");
    });
  });

  describe("mileage sort criteria", () => {
    it("should sort by mileage (high to low) in descending order", () => {
      const mockTiles: TileData[] = [
        { element: document.createElement("div"), mileage: 1000, merchantName: "Store A" },
        { element: document.createElement("div"), mileage: 5000, merchantName: "Store B" },
        { element: document.createElement("div"), mileage: 3000, merchantName: "Store C" },
      ];

      const isDescending = true;
      const sortedTiles = mockTiles.sort((a, b) => {
        return isDescending ? b.mileage - a.mileage : a.mileage - b.mileage;
      });

      expect(sortedTiles[0].mileage).toBe(5000);
      expect(sortedTiles[1].mileage).toBe(3000);
      expect(sortedTiles[2].mileage).toBe(1000);
    });

    it("should sort by mileage (low to high) in ascending order", () => {
      const mockTiles: TileData[] = [
        { element: document.createElement("div"), mileage: 1000, merchantName: "Store A" },
        { element: document.createElement("div"), mileage: 5000, merchantName: "Store B" },
        { element: document.createElement("div"), mileage: 3000, merchantName: "Store C" },
      ];

      const isDescending = false;
      const sortedTiles = mockTiles.sort((a, b) => {
        return isDescending ? b.mileage - a.mileage : a.mileage - b.mileage;
      });

      expect(sortedTiles[0].mileage).toBe(1000);
      expect(sortedTiles[1].mileage).toBe(3000);
      expect(sortedTiles[2].mileage).toBe(5000);
    });
  });
});
