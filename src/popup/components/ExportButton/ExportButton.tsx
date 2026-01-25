import React, { useState } from 'react';
import { chromeService } from '@/services/ChromeService';
import { generateCSV, downloadCSV, getExportFilename } from '@/shared/exportHelpers';
import { useApp } from '@/popup/context/AppContext';
import './ExportButton.css';

interface ExportButtonProps {
  hasSorted: boolean;
}

export const ExportButton: React.FC<ExportButtonProps> = ({ hasSorted }) => {
  const { currentTabId } = useApp();
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    if (!hasSorted || !currentTabId || isExporting) return;

    setIsExporting(true);
    try {
      const response = await chromeService.getExportData(currentTabId);

      if (!response.success || !response.offers.length) {
        console.error('[ExportButton] Export failed:', response.error || 'No offers found');
        return;
      }

      const csvContent = generateCSV(response.offers);
      const filename = getExportFilename();
      downloadCSV(csvContent, filename);

      console.log(`[ExportButton] Exported ${response.offers.length} offers to ${filename}`);
    } catch (error) {
      console.error('[ExportButton] Export error:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const isDisabled = !hasSorted || isExporting;

  return (
    <div className="export-link-wrapper">
      <button
        className={`export-link ${hasSorted ? 'export-link--active' : 'export-link--ghost'}`}
        onClick={handleExport}
        disabled={isDisabled}
        aria-label={hasSorted ? 'Export offers to CSV' : 'Available after sorting'}
      >
        {isExporting ? 'Exporting...' : 'Export CSV'}
      </button>
      {!hasSorted && (
        <div className="export-link__tooltip">
          Available after sorting
        </div>
      )}
    </div>
  );
};
