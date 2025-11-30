import React from 'react';
import type { OfferType } from '@/types';
import './OfferTypeFilter.css';

interface OfferTypeFilterProps {
  value: OfferType;
  onChange: (value: OfferType) => void;
  disabled?: boolean;
}

const FILTER_OPTIONS: { value: OfferType; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'multiplier', label: 'Multipliers' },
  { value: 'static', label: 'Static' },
];

/**
 * Toggle button group for filtering offers by type
 * Options: All, Multipliers (e.g., "5X miles"), Static (e.g., "500 miles")
 */
export const OfferTypeFilter: React.FC<OfferTypeFilterProps> = ({
  value,
  onChange,
  disabled = false,
}) => {
  return (
    <div className={`offer-type-filter ${disabled ? 'disabled' : ''}`}>
      <span className="offer-type-filter-label">Filter:</span>
      <div className="offer-type-filter-buttons">
        {FILTER_OPTIONS.map((option) => (
          <button
            key={option.value}
            className={`offer-type-btn ${value === option.value ? 'active' : ''}`}
            onClick={() => onChange(option.value)}
            disabled={disabled}
            aria-pressed={value === option.value}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
};
