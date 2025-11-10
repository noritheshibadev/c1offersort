import React, { useState, useRef, useEffect } from 'react';
import { SearchResults } from '../SearchResults';
import { useSearch } from '../../hooks/useSearch';
import './SearchBox.css';

interface SearchBoxProps {
  disabled: boolean;
  currentTabId?: number;
}

/**
 * Search box component with fuzzy search and clickable results
 * Disabled until pagination completes
 * Closes dropdown when clicking outside
 */
export const SearchBox: React.FC<SearchBoxProps> = ({
  disabled,
  currentTabId,
}) => {
  const {
    searchQuery,
    setSearchQuery,
    searchResults,
    isSearching,
    searchEnabled,
    isFullyPaginated,
    totalMatches,
    handleSearch,
    handleSelectResult,
    error,
  } = useSearch(currentTabId);

  const [showTooltip, setShowTooltip] = useState(false);
  const searchBoxRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchBoxRef.current && !searchBoxRef.current.contains(event.target as Node)) {
        // Clear search query to close dropdown
        if (searchQuery) {
          setSearchQuery('');
          handleSearch('');
        }
      }
    };

    // Only add listener if there's an active search
    if (searchQuery.trim().length >= 2) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [searchQuery, setSearchQuery, handleSearch]);

  const isInputDisabled = disabled || !searchEnabled || !isFullyPaginated;

  // Static placeholder text
  const placeholder = 'Search all offers';

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    handleSearch(query);
  };

  const handleClear = () => {
    setSearchQuery('');
    handleSearch('');
  };

  return (
    <div className="search-box-container" ref={searchBoxRef}>
      <div
        className="search-input-wrapper"
        onMouseEnter={() => !isFullyPaginated && setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
      >
        <input
          type="text"
          className="search-input"
          placeholder={placeholder}
          value={searchQuery}
          onChange={handleInputChange}
          disabled={isInputDisabled}
          aria-label="Search offers"
        />
        {searchQuery && !isInputDisabled && (
          <button
            className="search-clear-button"
            onClick={handleClear}
            aria-label="Clear search"
            type="button"
          >
            ×
          </button>
        )}

        {/* Tooltip - only shown when not fully paginated and hovering */}
        {!isFullyPaginated && showTooltip && (
          <div className="search-tooltip">
            Loading all offers required
            <div className="search-tooltip-arrow" />
          </div>
        )}
      </div>

      {error && (
        <div className="search-error" role="alert">
          {error}
        </div>
      )}

      {searchQuery.trim().length >= 2 && (
        <SearchResults
          results={searchResults}
          totalMatches={totalMatches}
          onSelectResult={handleSelectResult}
          isSearching={isSearching}
        />
      )}
    </div>
  );
};
