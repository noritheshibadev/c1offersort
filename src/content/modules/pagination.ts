import { findViewMoreButton } from '../../shared/domHelpers';
import { progressState } from '../index';
import { SELECTORS } from '../../utils/constants';

function parsePaginationResult(element: HTMLElement | null): { pagesLoaded: number } {
  if (!element) {
    console.warn('[Pagination] Result element not found');
    return { pagesLoaded: 0 };
  }

  const pagesLoadedStr = element.getAttribute('data-pages-loaded');
  if (!pagesLoadedStr) {
    console.warn('[Pagination] Missing data-pages-loaded attribute');
    return { pagesLoaded: 0 };
  }

  const pagesLoaded = parseInt(pagesLoadedStr, 10);
  if (isNaN(pagesLoaded) || pagesLoaded < 0) {
    console.warn('[Pagination] Invalid pages loaded value:', pagesLoadedStr);
    return { pagesLoaded: 0 };
  }

  return { pagesLoaded };
}

function parsePaginationProgress(element: HTMLElement | null): { offersLoaded: number; pagesLoaded: number } | null {
  if (!element) {
    return null;
  }

  const offersLoadedStr = element.getAttribute('data-offers-loaded');
  const pagesLoadedStr = element.getAttribute('data-pages-loaded');

  if (!offersLoadedStr || !pagesLoadedStr) {
    return null;
  }

  const offersLoaded = parseInt(offersLoadedStr, 10);
  const pagesLoaded = parseInt(pagesLoadedStr, 10);

  if (isNaN(offersLoaded) || isNaN(pagesLoaded)) {
    console.warn('[Pagination] Invalid progress values:', { offersLoadedStr, pagesLoadedStr });
    return null;
  }

  return { offersLoaded, pagesLoaded };
}

async function executePaginationInPageContext(): Promise<number> {
  console.log('[Pagination] Injecting pagination script into page context...');

  return new Promise((resolve) => {
    let progressObserver: MutationObserver | null = null;
    let resultObserver: MutationObserver | null = null;
    let timeoutHandle: ReturnType<typeof setTimeout> | null = null;

    // Consolidated cleanup function for observers and DOM elements
    const cleanup = () => {
      if (progressObserver) {
        progressObserver.disconnect();
        progressObserver = null;
      }
      if (resultObserver) {
        resultObserver.disconnect();
        resultObserver = null;
      }
      if (timeoutHandle) {
        clearTimeout(timeoutHandle);
        timeoutHandle = null;
      }
    };

    const cleanupDOMElements = () => {
      const elementsToRemove = [
        'c1-pagination-result',
        'c1-pagination-progress',
        'c1-layout-info',
        'c1-pagination-abort'
      ];
      elementsToRemove.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.remove();
      });
    };

    try {
      // Clean up any leftover elements from previous runs
      cleanupDOMElements();

      // Pass selector information to injected script via DOM
      const layoutInfo = document.createElement('div');
      layoutInfo.id = 'c1-layout-info';
      layoutInfo.style.display = 'none';
      layoutInfo.setAttribute('data-view-more-selector', SELECTORS.viewMoreButton);
      layoutInfo.setAttribute('data-tile-selector', SELECTORS.offerTile);
      layoutInfo.setAttribute('data-container-selector', SELECTORS.container);
      document.body.appendChild(layoutInfo);
      console.log('[Pagination] Injected selector info for pagination');

      // Set up MutationObserver for progress updates
      let lastProgressTimestamp = 0;
      progressObserver = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
          for (const node of mutation.addedNodes) {
            if (node instanceof HTMLElement && node.id === 'c1-pagination-progress') {
              const timestamp = node.getAttribute('data-timestamp');
              if (timestamp && timestamp !== lastProgressTimestamp.toString()) {
                lastProgressTimestamp = parseInt(timestamp);
                const progress = parsePaginationProgress(node);

                if (progress) {
                  console.log('[Pagination] Progress update:', progress.offersLoaded, 'offers,', progress.pagesLoaded, 'pages');

                  if (progressState.sort.isActive) {
                    progressState.sort.progress = {
                      type: 'pagination',
                      offersLoaded: progress.offersLoaded,
                      pagesLoaded: progress.pagesLoaded,
                    };
                  } else if (progressState.filter.isActive) {
                    progressState.filter.progress = {
                      offersLoaded: progress.offersLoaded,
                      pagesLoaded: progress.pagesLoaded,
                    };
                  }

                  try {
                    chrome.runtime.sendMessage({
                      type: "PAGINATION_PROGRESS",
                      offersLoaded: progress.offersLoaded,
                      pagesLoaded: progress.pagesLoaded,
                    }).catch((err) => {
                      console.log('[Pagination] Failed to send progress message:', err);
                    });
                  } catch (error) {
                    console.log('[Pagination] Error sending progress:', error);
                  }
                }
              }
            }
          }

          // Check for attribute changes on existing progress element
          if (mutation.type === 'attributes' &&
              mutation.target instanceof HTMLElement &&
              mutation.target.id === 'c1-pagination-progress') {
            const timestamp = mutation.target.getAttribute('data-timestamp');
            if (timestamp && timestamp !== lastProgressTimestamp.toString()) {
              lastProgressTimestamp = parseInt(timestamp);
              const progress = parsePaginationProgress(mutation.target);

              if (progress) {
                console.log('[Pagination] Progress update (attr):', progress.offersLoaded, 'offers,', progress.pagesLoaded, 'pages');

                if (progressState.sort.isActive) {
                  progressState.sort.progress = {
                    type: 'pagination',
                    offersLoaded: progress.offersLoaded,
                    pagesLoaded: progress.pagesLoaded,
                  };
                } else if (progressState.filter.isActive) {
                  progressState.filter.progress = {
                    offersLoaded: progress.offersLoaded,
                    pagesLoaded: progress.pagesLoaded,
                  };
                }

                try {
                  chrome.runtime.sendMessage({
                    type: "PAGINATION_PROGRESS",
                    offersLoaded: progress.offersLoaded,
                    pagesLoaded: progress.pagesLoaded,
                  }).catch((err) => {
                    console.log('[Pagination] Failed to send progress message:', err);
                  });
                } catch (error) {
                  console.log('[Pagination] Error sending progress:', error);
                }
              }
            }
          }
        }
      });

      // Watch for progress element creation and updates
      progressObserver.observe(document.body, {
        childList: true,
        attributes: true,
        attributeFilter: ['data-timestamp'],
        subtree: true
      });

      // Set up MutationObserver for result
      resultObserver = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
          for (const node of mutation.addedNodes) {
            if (node instanceof HTMLElement && node.id === 'c1-pagination-result') {
              cleanup();
              const result = parsePaginationResult(node);
              console.log('[Pagination] Pagination complete, pages loaded:', result.pagesLoaded);
              cleanupDOMElements();
              resolve(result.pagesLoaded);
              return;
            }
          }
        }
      });

      // Watch for result element creation
      resultObserver.observe(document.body, { childList: true, subtree: true });

      // Timeout fallback (4 minutes)
      timeoutHandle = setTimeout(() => {
        cleanup();
        console.warn('[Pagination] Timeout waiting for pagination result');
        cleanupDOMElements();
        resolve(0);
      }, 240000);

      const script = document.createElement('script');
      script.src = chrome.runtime.getURL('injected-scripts/pagination.js');
      script.onload = () => {
        console.log('[Pagination] Script loaded, waiting for completion...');
        script.remove();
      };

      script.onerror = (error) => {
        console.error('[Pagination] Error loading pagination script:', error);
        script.remove();
        cleanup();
        cleanupDOMElements();
        resolve(0);
      };

      (document.head || document.documentElement).appendChild(script);
    } catch (error) {
      console.error('[Pagination] Error executing pagination script:', error);
      cleanup();
      cleanupDOMElements();
      resolve(0);
    }
  });
}

export async function loadAllTiles(fullyPaginated: { value: boolean }): Promise<number> {
  console.log('[Pagination] loadAllTiles started', {
    fullyPaginatedValue: fullyPaginated.value
  });

  // Check if button exists - if it does, reset the flag even if we thought we were done
  const initialButton = findViewMoreButton();
  console.log('[Pagination] Initial "View More Offers" button:', {
    found: !!initialButton,
    buttonText: initialButton?.textContent?.trim(),
    buttonClasses: initialButton?.className
  });

  if (!initialButton) {
    console.log('[Pagination] No initial button found, marking as fully paginated');
    fullyPaginated.value = true;
    return 0;
  }

  // Button exists - reset flag and paginate (handles case where pagination stopped early)
  if (fullyPaginated.value) {
    console.log('[Pagination] Button still exists despite fullyPaginated flag - resetting and retrying pagination');
    fullyPaginated.value = false;
  }

  const pagesLoaded = await executePaginationInPageContext();
  fullyPaginated.value = true;
  return pagesLoaded;
}
