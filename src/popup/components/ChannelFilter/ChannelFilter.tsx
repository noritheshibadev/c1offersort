import React from 'react';
import type { ChannelType } from '@/types';
import './ChannelFilter.css';

interface ChannelFilterProps {
  value: ChannelType;
  onChange: (value: ChannelType) => void;
  disabled?: boolean;
}

const FILTER_OPTIONS: { value: ChannelType; label: string }[] = [
  { value: 'all', label: 'All Channels' },
  { value: 'in-store', label: 'In-Store' },
  { value: 'in-app', label: 'In-App' },
  { value: 'online', label: 'Online' },
];

/**
 * Dropdown for filtering offers by redemption channel
 * Options: All Channels, In-Store, In-App, Online
 * Uses inclusive matching: "In-Store" shows all offers with in-store channel
 */
export const ChannelFilter: React.FC<ChannelFilterProps> = ({
  value,
  onChange,
  disabled = false,
}) => {
  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onChange(e.target.value as ChannelType);
  };

  return (
    <div className={`channel-filter ${disabled ? 'disabled' : ''}`}>
      <label className="channel-filter-label">Channel:</label>
      <select
        className="channel-filter-dropdown"
        value={value}
        onChange={handleChange}
        disabled={disabled}
      >
        {FILTER_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
};
