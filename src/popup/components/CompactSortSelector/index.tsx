import React from 'react';
import type { SortCriteria, SortOrder, SortConfig } from '../../../types';
import './CompactSortSelector.css';

interface CompactSortSelectorProps {
  sortConfig: SortConfig;
  onConfigChange: (config: SortConfig) => void;
}

/**
 * Compact sort selector combining criteria dropdown and order toggle
 * Reduces vertical space by displaying in a single row
 */
export const CompactSortSelector: React.FC<CompactSortSelectorProps> = ({
  sortConfig,
  onConfigChange,
}) => {
  const handleCriteriaChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const criteria = e.target.value as SortCriteria;
    onConfigChange({
      criteria,
      order: sortConfig.order, // Preserve user's order preference
    });
  };

  const handleOrderChange = (order: SortOrder) => {
    onConfigChange({
      ...sortConfig,
      order,
    });
  };

  return (
    <div className="compact-sort-selector">
      <label className="sort-label">Sort by:</label>

      <select
        className="sort-criteria-dropdown"
        value={sortConfig.criteria}
        onChange={handleCriteriaChange}
      >
        <option value="mileage">Mileage Value</option>
        <option value="alphabetical">Merchant Name</option>
      </select>

      <div className="sort-order-toggle">
        <button
          type="button"
          className={`order-button ${sortConfig.order === 'desc' ? 'active' : ''}`}
          onClick={() => handleOrderChange('desc')}
          aria-label={sortConfig.criteria === 'mileage' ? 'Highest first' : 'Z to A'}
          title={sortConfig.criteria === 'mileage' ? 'Highest first' : 'Z to A'}
        >
          ↓
        </button>
        <button
          type="button"
          className={`order-button ${sortConfig.order === 'asc' ? 'active' : ''}`}
          onClick={() => handleOrderChange('asc')}
          aria-label={sortConfig.criteria === 'mileage' ? 'Lowest first' : 'A to Z'}
          title={sortConfig.criteria === 'mileage' ? 'Lowest first' : 'A to Z'}
        >
          ↑
        </button>
      </div>
    </div>
  );
};
