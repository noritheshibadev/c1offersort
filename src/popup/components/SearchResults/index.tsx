import React from 'react';
import type { SearchResult } from '../../../types/messages';
import './SearchResults.css';

interface SearchResultsProps {
  results: SearchResult[];
  totalMatches: number;
  onSelectResult: (merchantTLD: string) => void;
  isSearching: boolean;
}

/**
 * Displays search results in a clickable list
 * User clicks a result to scroll to that offer on the page
 */
export const SearchResults: React.FC<SearchResultsProps> = ({
  results,
  totalMatches: _totalMatches,
  onSelectResult,
  isSearching,
}) => {
  if (isSearching) {
    return null; // Don't show anything while searching
  }

  if (results.length === 0) {
    return null;
  }

  return (
    <div className="search-results-container">
      <div className="search-results-list">
        {results.map((result, index) => (
          <button
            key={`${result.merchantTLD}-${index}`}
            className="search-result-item"
            onClick={() => onSelectResult(result.merchantTLD)}
            aria-label={`Go to ${result.merchantName} offer`}
          >
            <div className="search-result-merchant">{result.merchantName}</div>
            <div className="search-result-mileage">{result.mileageText}</div>
          </button>
        ))}
      </div>
    </div>
  );
};
