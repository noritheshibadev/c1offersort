/**
 * Extract offer data from DOM for CSV export
 */

import {
  findAllTiles,
  extractMerchantTLD,
  extractMerchantName,
  extractMileageText,
  parseMileageValue,
  detectOfferType,
  shouldExcludeTile
} from '@/shared/domHelpers';
import type { ExportOffer } from '@/shared/exportHelpers';

/**
 * Extracts all offer data from currently loaded tiles
 * @returns Array of offer data ready for CSV export
 */
export function extractExportData(): ExportOffer[] {
  const tiles = findAllTiles();
  const offers: ExportOffer[] = [];

  for (const tile of tiles) {
    // Skip skeleton and carousel tiles
    if (shouldExcludeTile(tile)) {
      continue;
    }

    const domain = extractMerchantTLD(tile);
    const merchantName = extractMerchantName(tile);
    const mileageOffer = extractMileageText(tile);
    const mileageValue = parseMileageValue(mileageOffer);
    const offerTypeRaw = detectOfferType(mileageOffer);

    // Map the raw offer type to display format
    let offerType: ExportOffer['offerType'];
    switch (offerTypeRaw) {
      case 'multiplier':
        offerType = 'Multiplier';
        break;
      case 'static':
        offerType = 'Static';
        break;
      default:
        offerType = 'Unknown';
    }

    offers.push({
      merchantName,
      domain,
      mileageOffer,
      mileageValue,
      offerType
    });
  }

  console.log(`[Export] Extracted ${offers.length} offers for export`);
  return offers;
}
