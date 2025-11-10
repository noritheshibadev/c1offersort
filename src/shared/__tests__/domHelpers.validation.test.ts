/**
 * Unit tests for JSON schema validation in domHelpers
 * Tests the security improvements for base64 data parsing
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { extractMerchantTLDFromDataTestId } from '../domHelpers';

describe('domHelpers - JSON Schema Validation', () => {
  let mockTile: HTMLElement;

  beforeEach(() => {
    mockTile = document.createElement('div');
  });

  describe('extractMerchantTLDFromDataTestId - Security Tests', () => {
    it('should extract valid merchantTLD from properly formatted data', () => {
      const validData = {
        inventory: {
          merchantTLD: 'example.com'
        }
      };
      const base64 = btoa(JSON.stringify(validData));
      mockTile.setAttribute('data-testid', `feed-tile-${base64}`);

      const result = extractMerchantTLDFromDataTestId(mockTile);
      expect(result).toBe('example.com');
    });

    it('should reject data with missing inventory property', () => {
      const invalidData = {
        other: 'data'
      };
      const base64 = btoa(JSON.stringify(invalidData));
      mockTile.setAttribute('data-testid', `feed-tile-${base64}`);

      const result = extractMerchantTLDFromDataTestId(mockTile);
      expect(result).toBe('');
    });

    it('should reject data with non-object inventory', () => {
      const invalidData = {
        inventory: 'not an object'
      };
      const base64 = btoa(JSON.stringify(invalidData));
      mockTile.setAttribute('data-testid', `feed-tile-${base64}`);

      const result = extractMerchantTLDFromDataTestId(mockTile);
      expect(result).toBe('');
    });

    it('should reject data with non-string merchantTLD', () => {
      const invalidData = {
        inventory: {
          merchantTLD: 12345
        }
      };
      const base64 = btoa(JSON.stringify(invalidData));
      mockTile.setAttribute('data-testid', `feed-tile-${base64}`);

      const result = extractMerchantTLDFromDataTestId(mockTile);
      expect(result).toBe('');
    });

    it('should handle malformed base64 gracefully', () => {
      mockTile.setAttribute('data-testid', 'feed-tile-invalid!!!base64');

      const result = extractMerchantTLDFromDataTestId(mockTile);
      expect(result).toBe('');
    });

    it('should handle invalid JSON after base64 decode', () => {
      const invalidJson = 'not valid json{]';
      const base64 = btoa(invalidJson);
      mockTile.setAttribute('data-testid', `feed-tile-${base64}`);

      const result = extractMerchantTLDFromDataTestId(mockTile);
      expect(result).toBe('');
    });

    it('should reject base64 data exceeding max length', () => {
      // Create data that exceeds MAX_BASE64_LENGTH (10000)
      const largeData = {
        inventory: {
          merchantTLD: 'example.com',
          extra: 'x'.repeat(15000)
        }
      };
      const base64 = btoa(JSON.stringify(largeData));
      mockTile.setAttribute('data-testid', `feed-tile-${base64}`);

      const result = extractMerchantTLDFromDataTestId(mockTile);
      expect(result).toBe('');
    });

    it('should handle null data', () => {
      const base64 = btoa('null');
      mockTile.setAttribute('data-testid', `feed-tile-${base64}`);

      const result = extractMerchantTLDFromDataTestId(mockTile);
      expect(result).toBe('');
    });

    it('should handle array instead of object', () => {
      const base64 = btoa('[]');
      mockTile.setAttribute('data-testid', `feed-tile-${base64}`);

      const result = extractMerchantTLDFromDataTestId(mockTile);
      expect(result).toBe('');
    });

    it('should reject invalid TLD format even with valid schema', () => {
      const validData = {
        inventory: {
          merchantTLD: 'invalid..tld'
        }
      };
      const base64 = btoa(JSON.stringify(validData));
      mockTile.setAttribute('data-testid', `feed-tile-${base64}`);

      const result = extractMerchantTLDFromDataTestId(mockTile);
      expect(result).toBe('');
    });

    it('should handle missing data-testid attribute', () => {
      const result = extractMerchantTLDFromDataTestId(mockTile);
      expect(result).toBe('');
    });

    it('should handle data-testid without feed-tile- prefix', () => {
      mockTile.setAttribute('data-testid', 'other-tile-123');
      const result = extractMerchantTLDFromDataTestId(mockTile);
      expect(result).toBe('');
    });

    it('should allow inventory with additional properties', () => {
      const validData = {
        inventory: {
          merchantTLD: 'example.com',
          extraProperty: 'allowed',
          anotherOne: 123
        },
        topLevel: 'also allowed'
      };
      const base64 = btoa(JSON.stringify(validData));
      mockTile.setAttribute('data-testid', `feed-tile-${base64}`);

      const result = extractMerchantTLDFromDataTestId(mockTile);
      expect(result).toBe('example.com');
    });

    it('should handle empty string merchantTLD', () => {
      const validData = {
        inventory: {
          merchantTLD: ''
        }
      };
      const base64 = btoa(JSON.stringify(validData));
      mockTile.setAttribute('data-testid', `feed-tile-${base64}`);

      const result = extractMerchantTLDFromDataTestId(mockTile);
      expect(result).toBe('');
    });

    it('should handle inventory without merchantTLD property', () => {
      const validData = {
        inventory: {
          otherProperty: 'value'
        }
      };
      const base64 = btoa(JSON.stringify(validData));
      mockTile.setAttribute('data-testid', `feed-tile-${base64}`);

      const result = extractMerchantTLDFromDataTestId(mockTile);
      expect(result).toBe('');
    });
  });
});
