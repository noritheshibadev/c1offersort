/**
 * CSV export utilities for offer data
 */

export interface ExportOffer {
  merchantName: string;
  domain: string;
  mileageOffer: string;
  mileageValue: number;
  offerType: 'Multiplier' | 'Static' | 'Unknown';
}

/**
 * Escapes a value for CSV format
 * - Wraps in quotes if contains comma, quote, or newline
 * - Doubles any existing quotes
 */
function escapeCSV(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/**
 * Generates CSV content from offer data
 */
export function generateCSV(offers: ExportOffer[]): string {
  const headers = [
    'Merchant Name',
    'Domain',
    'Mileage Offer',
    'Mileage Value',
    'Offer Type'
  ];

  const rows = offers.map(offer => [
    escapeCSV(offer.merchantName),
    escapeCSV(offer.domain),
    escapeCSV(offer.mileageOffer),
    offer.mileageValue.toString(),
    offer.offerType
  ]);

  return [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
}

/**
 * Triggers a CSV file download in the browser
 */
export function downloadCSV(csvContent: string, filename: string): void {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

/**
 * Generates a timestamped filename for the export
 */
export function getExportFilename(): string {
  const date = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  return `c1-offers-export-${date}.csv`;
}
