import React from 'react';
import type { ChannelType } from '@/types';
import './ChannelFilter.css';

interface ChannelFilterProps {
  value: ChannelType;
  onChange: (value: ChannelType) => void;
  disabled?: boolean;
}

const FILTER_OPTIONS: { value: ChannelType; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'in-store', label: 'In-Store' },
  { value: 'in-app', label: 'In-App' },
  { value: 'online', label: 'Online' },
];

/**
 * Toggle button group for filtering offers by redemption channel
 * Options: All, In-Store, In-App, Online
 * Uses inclusive matching: "In-Store" shows all offers with in-store channel
 */
export const ChannelFilter: React.FC<ChannelFilterProps> = ({
  value,
  onChange,
  disabled = false,
}) => {
  return (
    <div className={`channel-filter ${disabled ? 'disabled' : ''}`}>
      <span className="channel-filter-label">Channel:</span>
      <div className="channel-filter-buttons">
        {FILTER_OPTIONS.map((option) => (
          <button
            key={option.value}
            className={`channel-filter-btn ${value === option.value ? 'active' : ''}`}
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
