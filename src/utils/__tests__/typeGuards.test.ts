import { describe, it, expect } from "vitest";
import { isValidCapitalOneUrl } from "../typeGuards";

describe("typeGuards", () => {
  describe("isValidCapitalOneUrl - Issue #2 Security Tests", () => {
    it("returns true for valid feed URL", () => {
      expect(isValidCapitalOneUrl("https://capitaloneoffers.com/feed")).toBe(
        true
      );
    });

    it("returns true for valid URLs with paths", () => {
      expect(
        isValidCapitalOneUrl("https://capitaloneoffers.com/feed?param=value")
      ).toBe(true);
    });

    it("returns false for invalid URLs", () => {
      expect(isValidCapitalOneUrl("https://example.com")).toBe(false);
      expect(isValidCapitalOneUrl("https://google.com")).toBe(false);
    });

    it("returns true for any capitaloneoffers.com path", () => {
      expect(isValidCapitalOneUrl("https://capitaloneoffers.com/home")).toBe(true);
      expect(isValidCapitalOneUrl("https://capitaloneoffers.com/shopping")).toBe(true);
    });

    it("returns false for undefined", () => {
      expect(isValidCapitalOneUrl(undefined)).toBe(false);
    });

    it("returns false for empty string", () => {
      expect(isValidCapitalOneUrl("")).toBe(false);
    });

    it("handles protocol variations correctly", () => {
      expect(isValidCapitalOneUrl("http://capitaloneoffers.com/feed")).toBe(
        false
      );
      expect(isValidCapitalOneUrl("ftp://capitaloneoffers.com/feed")).toBe(
        false
      );
    });

    it("is case-sensitive for the domain", () => {
      expect(isValidCapitalOneUrl("https://CAPITALONEOFFERS.COM/feed")).toBe(false);
    });

    it("prevents subdomain spoofing", () => {
      expect(
        isValidCapitalOneUrl("https://malicious.capitaloneoffers.com/feed")
      ).toBe(false);
      expect(
        isValidCapitalOneUrl("https://capitaloneoffers.com.evil.com/feed")
      ).toBe(false);
    });
  });
});
