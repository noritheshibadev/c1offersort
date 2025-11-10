import { getSearchData } from './buildSearchIndex';

const HIGHLIGHT_DURATION = 2000; // 2 seconds
const HIGHLIGHT_CLASS = 'c1-search-highlight';

/**
 * Scroll to a specific offer by merchantTLD
 * Adds a temporary highlight animation
 */
export function scrollToOffer(merchantTLD: string): {
  success: boolean;
  error?: string;
} {
  console.log('[Search] Scrolling to offer');

  const searchData = getSearchData();

  if (searchData.length === 0) {
    return {
      success: false,
      error: 'Search data not available',
    };
  }

  // Find the offer by merchantTLD
  const offer = searchData.find(item => item.merchantTLD === merchantTLD);

  if (!offer) {
    return {
      success: false,
      error: 'Offer not found',
    };
  }

  // Scroll to the element
  try {
    offer.element.scrollIntoView({
      behavior: 'smooth',
      block: 'center',
    });

    // Add highlight animation
    addHighlight(offer.element);

    console.log('[Search] Scrolled to:', offer.merchantName);

    return { success: true };
  } catch (error) {
    console.error('[Search] Scroll error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Scroll failed',
    };
  }
}

/**
 * Add temporary highlight to element
 */
function addHighlight(element: HTMLElement): void {
  // Inject highlight styles if not already present
  if (!document.getElementById('c1-search-highlight-styles')) {
    const styleEl = document.createElement('style');
    styleEl.id = 'c1-search-highlight-styles';
    styleEl.textContent = `
      .${HIGHLIGHT_CLASS} {
        outline: 3px solid #2196F3 !important;
        outline-offset: 2px !important;
        animation: c1-pulse 0.5s ease-in-out !important;
      }

      @keyframes c1-pulse {
        0%, 100% { outline-color: #2196F3; }
        50% { outline-color: #64B5F6; }
      }
    `;
    document.head.appendChild(styleEl);
  }

  // Add highlight class
  element.classList.add(HIGHLIGHT_CLASS);

  // Remove after duration
  setTimeout(() => {
    element.classList.remove(HIGHLIGHT_CLASS);
  }, HIGHLIGHT_DURATION);
}
