/**
 * Tests for DOM helper utility functions that don't rely on HTML structure
 * Tests pure logic functions only - selector-based functions are excluded
 */

import { describe, it, expect } from "vitest";
import {
  domainToDisplayName,
  isValidMerchantTLD,
  parseMileageValue,
} from "../domHelpers";

describe("domHelpers - Pure Utility Functions", () => {
  describe("domainToDisplayName", () => {
    it("converts simple domain to display name", () => {
      expect(domainToDisplayName("crocs.com")).toBe("Crocs");
    });

    it("handles multi-word domains", () => {
      expect(domainToDisplayName("cumberlandfarms.com")).toBe(
        "Cumberlandfarms"
      );
    });

    it("handles hyphenated domains", () => {
      expect(domainToDisplayName("foot-locker.com")).toBe("Foot Locker");
    });

    it("handles camelCase domains", () => {
      expect(domainToDisplayName("bestBuy.com")).toBe("Best Buy");
    });

    it("handles various TLDs", () => {
      expect(domainToDisplayName("example.net")).toBe("Example");
      expect(domainToDisplayName("example.org")).toBe("Example");
      expect(domainToDisplayName("example.co.uk")).toBe("Example");
      expect(domainToDisplayName("example.io")).toBe("Example");
    });

    it("returns Unknown Merchant for empty string", () => {
      expect(domainToDisplayName("")).toBe("Unknown Merchant");
    });

    it("handles domains with underscores", () => {
      expect(domainToDisplayName("my_store.com")).toBe("My Store");
    });

    it("properly capitalizes each word", () => {
      expect(domainToDisplayName("ALLCAPS.com")).toBe("Allcaps");
      expect(domainToDisplayName("lowercase.com")).toBe("Lowercase");
    });
  });

  describe("isValidMerchantTLD - Security Validation", () => {
    it("returns true for valid TLDs", () => {
      expect(isValidMerchantTLD("example.com")).toBe(true);
      expect(isValidMerchantTLD("sub.example.com")).toBe(true);
      expect(isValidMerchantTLD("example.co.uk")).toBe(true);
    });

    it("returns false for non-string values", () => {
      expect(isValidMerchantTLD(null)).toBe(false);
      expect(isValidMerchantTLD(undefined)).toBe(false);
      expect(isValidMerchantTLD(123)).toBe(false);
      expect(isValidMerchantTLD({})).toBe(false);
    });

    it("returns false for empty string", () => {
      expect(isValidMerchantTLD("")).toBe(false);
    });

    it("returns false for strings too long (>100 chars)", () => {
      const longString = "a".repeat(101) + ".com";
      expect(isValidMerchantTLD(longString)).toBe(false);
    });

    it("returns false for consecutive dots (path traversal protection)", () => {
      expect(isValidMerchantTLD("example..com")).toBe(false);
      expect(isValidMerchantTLD("..example.com")).toBe(false);
    });

    it("returns false for strings starting with dot or dash", () => {
      expect(isValidMerchantTLD(".example.com")).toBe(false);
      expect(isValidMerchantTLD("-example.com")).toBe(false);
    });

    it("returns false for strings ending with dot or dash", () => {
      expect(isValidMerchantTLD("example.com.")).toBe(false);
      expect(isValidMerchantTLD("example.com-")).toBe(false);
    });

    it("returns false for invalid TLD format", () => {
      expect(isValidMerchantTLD("example")).toBe(false);
      expect(isValidMerchantTLD("example.c")).toBe(false);
      expect(isValidMerchantTLD("example.123")).toBe(false);
    });

    it("allows valid special characters", () => {
      expect(isValidMerchantTLD("my-domain.com")).toBe(true);
      expect(isValidMerchantTLD("123example.com")).toBe(true);
    });
  });

  describe("parseMileageValue", () => {
    describe("percent and dollar back format", () => {
      it("parses 10% back correctly", () => {
        expect(parseMileageValue("10% back")).toBe(10);
      });

      it("parses 2.5% back correctly", () => {
        expect(parseMileageValue("2.5% back")).toBe(2.5);
      });

      it("parses $10 back correctly", () => {
        expect(parseMileageValue("$10 back")).toBe(10);
      });

      it("parses $2.99 back correctly", () => {
        expect(parseMileageValue("$2.99 back")).toBe(2.99);
      });

      it("returns 0 for percent/dollar without 'back'", () => {
        expect(parseMileageValue("10% off")).toBe(0);
        expect(parseMileageValue("$10 off")).toBe(0);
      });
    });
    describe("multiplier format", () => {
      it("parses 2X miles correctly", () => {
        expect(parseMileageValue("2X miles")).toBe(2000);
      });

      it("parses 5X miles correctly", () => {
        expect(parseMileageValue("5X miles")).toBe(5000);
      });

      it("handles case insensitivity", () => {
        expect(parseMileageValue("3x MILES")).toBe(3000);
      });

      it("parses 10X miles correctly", () => {
        expect(parseMileageValue("10X miles")).toBe(10000);
      });
    });

    describe("numeric format", () => {
      it("parses 'Up to' format with comma", () => {
        expect(parseMileageValue("Up to 60,000 miles")).toBe(60000);
      });

      it("parses without 'Up to' prefix", () => {
        expect(parseMileageValue("5,000 miles")).toBe(5000);
      });

      it("parses miles without commas", () => {
        expect(parseMileageValue("10000 miles")).toBe(10000);
      });

      it("handles multiple commas", () => {
        expect(parseMileageValue("1,000,000 miles")).toBe(1000000);
      });

      it("handles case insensitivity", () => {
        expect(parseMileageValue("up to 50,000 MILES")).toBe(50000);
      });
    });

    describe("asterisk handling", () => {
      it("removes asterisks from multiplier format", () => {
        expect(parseMileageValue("*2X miles*")).toBe(2000);
      });

      it("removes asterisks from numeric format", () => {
        expect(parseMileageValue("***Up to 50,000 miles***")).toBe(50000);
      });
    });

    describe("edge cases", () => {
      it("returns 0 for invalid format", () => {
        expect(parseMileageValue("invalid text")).toBe(0);
      });

      it("returns 0 for empty string", () => {
        expect(parseMileageValue("")).toBe(0);
      });

      it("returns 0 for text without 'miles' keyword", () => {
        expect(parseMileageValue("5000 points")).toBe(0);
      });

      it("handles whitespace correctly", () => {
        expect(parseMileageValue("  2X miles  ")).toBe(2000);
      });

      it("handles single digit multiplier", () => {
        expect(parseMileageValue("1X miles")).toBe(1000);
      });

      it("handles large numeric values", () => {
        expect(parseMileageValue("Up to 500,000 miles")).toBe(500000);
      });
    });
  });
});
