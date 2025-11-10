import {
  findMainContainer,
  findAllTiles,
  extractMerchantName,
  extractMileageText,
  extractMerchantTLD,
} from '@/shared/domHelpers';

const TABLE_CONTAINER_ID = 'c1-offers-table-container';
const TABLE_ID = 'c1-offers-table';
const ITEMS_PER_PAGE = 10;

interface OfferData {
  tile: HTMLElement;
  merchantName: string;
  mileage: string;
  merchantTLD: string;
  logoUrl?: string;
  offerType?: string;
  order?: number;
}

interface TileState {
  originalStyles: {
    position: string;
    top: string;
    left: string;
    width: string;
    height: string;
    opacity: string;
    pointerEvents: string;
    zIndex: string;
    display: string;
  };
}

// State management
let currentPage = 1;
let totalPages = 1;
let allOffers: OfferData[] = [];

// Store tile state in memory instead of DOM attributes
const tileStateMap = new WeakMap<HTMLElement, TileState>();

/**
 * Check if favorites are enabled
 */
async function areFavoritesEnabled(): Promise<boolean> {
  try {
    const result = await chrome.storage.local.get('c1-favorites-enabled');
    return result['c1-favorites-enabled'] === true;
  } catch (error) {
    return false;
  }
}

/**
 * Extracts all relevant data from offer tiles
 * Respects the current sort order by reading the CSS 'order' property
 * In table view, also collects tiles from the table container
 */
function extractOfferData(): OfferData[] {
  // In table view, collect tiles from both main container and table container
  const mainTiles = findAllTiles();
  const tableTiles = Array.from(document.querySelectorAll('#c1-offers-table [data-testid^="feed-tile-"]')) as HTMLElement[];

  // Combine and deduplicate tiles (use Set with tile IDs to avoid duplicates)
  const tileMap = new Map<HTMLElement, boolean>();
  const allTiles = [...mainTiles, ...tableTiles];
  allTiles.forEach(tile => tileMap.set(tile, true));
  const uniqueTiles = Array.from(tileMap.keys());

  // Temporarily clear inline display:none from pagination hiding so we can properly extract all tiles
  // But DON'T clear display:none from favorites filter (which uses !important)
  // Store which tiles had display:none from pagination so we can restore it after
  const tilesWithDisplayNone: HTMLElement[] = [];
  uniqueTiles.forEach(tile => {
    if (tile.style.display === 'none') {
      // Check if this is from favorites filter (!important) or just pagination
      // Get the priority of the display property
      const priority = tile.style.getPropertyPriority('display');

      // Only remove if it's NOT !important (i.e., it's from pagination, not favorites filter)
      if (priority !== 'important') {
        tilesWithDisplayNone.push(tile);
        tile.style.removeProperty('display');
      }
    }
  });

  const offerData: OfferData[] = [];

  for (const tile of uniqueTiles) {
    // Check if tile is filtered by favorites filter
    // The favorites filter sets 'display: none !important'
    const computedDisplay = window.getComputedStyle(tile).display;

    // Skip filtered tiles (e.g., non-favorited when "show favorites only" is active)
    // Now this only catches tiles with !important (favorites filter), not pagination hiding
    if (computedDisplay === 'none') {
      continue;
    }

    const merchantName = extractMerchantName(tile);
    const mileage = extractMileageText(tile);
    const merchantTLD = extractMerchantTLD(tile);

    // Extract logo URL
    const imgElement = tile.querySelector('img');
    const logoUrl = imgElement?.src || '';

    // Extract offer type (Online, In-Store, etc.)
    const offerTypeElement = tile.querySelector('h2');
    const offerType = offerTypeElement?.textContent?.trim() || 'Online';

    // Get the CSS order property (used by sorting)
    const orderValue = parseInt((tile as HTMLElement).style.order || '0', 10);

    offerData.push({
      tile,
      merchantName,
      mileage,
      merchantTLD,
      logoUrl,
      offerType,
      order: orderValue,
    });
  }

  // Restore display:none to tiles that had it (pagination hiding)
  tilesWithDisplayNone.forEach(tile => {
    tile.style.display = 'none';
  });

  // Sort by the CSS order property to respect the current sort order
  return offerData.sort((a, b) => (a.order || 0) - (b.order || 0));
}

/**
 * Saves tile's current inline styles to memory (not DOM)
 * Only saves the ORIGINAL state before first table view application
 */
function saveTileState(tile: HTMLElement): void {
  if (tileStateMap.has(tile)) {
    return; // Already saved - don't overwrite original state
  }

  const state: TileState = {
    originalStyles: {
      position: tile.style.position,
      top: tile.style.top,
      left: tile.style.left,
      width: tile.style.width,
      height: tile.style.height,
      opacity: tile.style.opacity,
      pointerEvents: tile.style.pointerEvents,
      zIndex: tile.style.zIndex,
      display: tile.style.display,
    },
  };

  tileStateMap.set(tile, state);
}

/**
 * Restores tile's original inline styles from memory
 */
function restoreTileState(tile: HTMLElement): void {
  const state = tileStateMap.get(tile);
  if (!state) {
    return;
  }

  const { originalStyles } = state;
  tile.style.position = originalStyles.position;
  tile.style.top = originalStyles.top;
  tile.style.left = originalStyles.left;
  tile.style.width = originalStyles.width;
  tile.style.height = originalStyles.height;
  tile.style.opacity = originalStyles.opacity;
  tile.style.pointerEvents = originalStyles.pointerEvents;
  tile.style.zIndex = originalStyles.zIndex;
  tile.style.display = originalStyles.display;
}

/**
 * Applies invisible overlay styling to tile for click handling
 */
function applyInvisibleOverlay(tile: HTMLElement): void {
  tile.style.position = 'absolute';
  tile.style.top = '0';
  tile.style.left = '0';
  tile.style.width = '100%';
  tile.style.height = '100%';
  tile.style.opacity = '0';
  tile.style.pointerEvents = 'auto';
  tile.style.zIndex = '5';
  // Don't set display - preserve any filtering that may have been applied
  // tile.style.display = '';
  tile.style.overflow = 'hidden'; // Prevent tile content from expanding row
  tile.style.maxHeight = '100%'; // Constrain tile height
}

/**
 * Creates a table row from offer data
 */
async function createTableRow(offer: OfferData, index: number, showFavorites: boolean): Promise<HTMLTableRowElement> {
  const row = document.createElement('tr');
  row.style.transition = 'background-color 0.2s';
  row.dataset.tileIndex = String(index);
  row.dataset.merchantTld = offer.merchantTLD;
  row.style.position = 'relative';
  row.style.cursor = 'pointer';
  row.style.height = '60px'; // Fixed row height to prevent expansion
  row.style.maxHeight = '60px'; // Enforce max height

  // Add hover effect
  row.addEventListener('mouseenter', () => {
    row.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
  });
  row.addEventListener('mouseleave', () => {
    row.style.backgroundColor = '';
  });

  // Save tile state and apply invisible overlay
  saveTileState(offer.tile);
  // Clear any display:none that was set when moving back to main container
  if (offer.tile.style.display === 'none') {
    offer.tile.style.display = '';
  }
  applyInvisibleOverlay(offer.tile);

  // Merchant Name
  const merchantCell = document.createElement('td');
  merchantCell.textContent = offer.merchantName;
  merchantCell.style.padding = '12px';
  merchantCell.style.borderBottom = '1px solid rgba(255, 255, 255, 0.1)';
  merchantCell.style.fontWeight = '600';
  merchantCell.style.position = 'relative';
  merchantCell.style.zIndex = '1';
  merchantCell.style.pointerEvents = 'none';
  merchantCell.style.overflow = 'hidden';
  merchantCell.style.textOverflow = 'ellipsis';
  merchantCell.style.whiteSpace = 'nowrap';
  merchantCell.style.verticalAlign = 'middle'; // Center content vertically
  row.appendChild(merchantCell);

  // Mileage
  const mileageCell = document.createElement('td');
  mileageCell.textContent = offer.mileage;
  mileageCell.style.padding = '12px';
  mileageCell.style.borderBottom = '1px solid rgba(255, 255, 255, 0.1)';
  mileageCell.style.color = 'rgb(37, 129, 14)';
  mileageCell.style.fontWeight = '600';
  mileageCell.style.textAlign = 'center';
  mileageCell.style.position = 'relative';
  mileageCell.style.zIndex = '1';
  mileageCell.style.pointerEvents = 'none';
  mileageCell.style.whiteSpace = 'nowrap';
  mileageCell.style.verticalAlign = 'middle'; // Center content vertically
  row.appendChild(mileageCell);

  // View Offer button (entire row is clickable via tile overlay)
  const actionCell = document.createElement('td');
  actionCell.style.padding = '12px';
  actionCell.style.borderBottom = '1px solid rgba(255, 255, 255, 0.1)';
  actionCell.style.textAlign = 'center';
  actionCell.style.position = 'relative';
  actionCell.style.zIndex = '1';
  actionCell.style.pointerEvents = 'none';
  actionCell.style.verticalAlign = 'middle'; // Center content vertically

  const viewButton = document.createElement('button');
  viewButton.textContent = 'View Offer';
  viewButton.style.backgroundColor = 'rgb(37, 129, 14)';
  viewButton.style.color = 'white';
  viewButton.style.border = 'none';
  viewButton.style.padding = '8px 16px';
  viewButton.style.borderRadius = '4px';
  viewButton.style.fontWeight = '600';
  viewButton.style.fontSize = '14px';
  viewButton.style.pointerEvents = 'none';

  actionCell.appendChild(viewButton);
  row.appendChild(actionCell);

  // Favorite star (only if favorites are enabled)
  if (showFavorites) {
    const starCell = document.createElement('td');
    starCell.style.padding = '12px';
    starCell.style.borderBottom = '1px solid rgba(255, 255, 255, 0.1)';
    starCell.style.textAlign = 'center';
    starCell.style.position = 'relative';
    starCell.style.zIndex = '20'; // Higher than tile overlay so star is clickable
    starCell.style.pointerEvents = 'auto';
    starCell.style.verticalAlign = 'middle'; // Center content vertically

    // Check if the original tile has a star button
    let starButton = offer.tile.querySelector('.c1-favorite-star') as HTMLElement;

    // If star doesn't exist on tile, create one dynamically
    // This can happen if favorites were enabled after table view was created
    if (!starButton) {

      const { createStarButton, isFavorited } = await import('@/shared/favoritesHelpers');
      const isInitiallyFavorited = await isFavorited(offer.merchantTLD);

      starButton = createStarButton(
        offer.tile,
        offer.merchantTLD,
        offer.merchantName,
        isInitiallyFavorited
      );

      // Inject the star into the tile so it's available for future renders
      const standardTile = offer.tile.querySelector('.standard-tile') as HTMLElement;
      if (standardTile) {
        standardTile.appendChild(starButton);
      } else {
        offer.tile.style.position = 'relative';
        offer.tile.appendChild(starButton);
      }
    }

    if (starButton) {
      // Clone the star button
      const starClone = starButton.cloneNode(true) as HTMLElement;

      // Ensure the clone has all the data attributes from the original
      starClone.setAttribute('data-c1-favorite-star', starButton.getAttribute('data-c1-favorite-star') || 'true');
      starClone.setAttribute('data-merchant-tld', starButton.getAttribute('data-merchant-tld') || offer.merchantTLD);
      starClone.setAttribute('data-merchant-name', starButton.getAttribute('data-merchant-name') || offer.merchantName);
      starClone.setAttribute('data-favorited', starButton.getAttribute('data-favorited') || 'false');
      starClone.textContent = starButton.textContent;
      starClone.setAttribute('aria-label', starButton.getAttribute('aria-label') || '');
      starClone.setAttribute('title', starButton.getAttribute('title') || '');

      // Override styles for dark mode table view
      const isFavorited = starButton.getAttribute('data-favorited') === 'true';
      starClone.style.cssText = `
        background: transparent;
        border: none;
        border-radius: 0;
        width: auto;
        height: auto;
        display: inline-block;
        cursor: pointer;
        font-size: 24px;
        line-height: 1;
        padding: 4px;
        z-index: 10;
        box-shadow: none;
        transition: transform 0.2s ease, filter 0.2s ease;
        color: ${isFavorited ? '#FFD700' : 'transparent'};
        -webkit-text-stroke: 0.5px white;
      `;

      // Add hover effect
      starClone.addEventListener('mouseenter', () => {
        starClone.style.transform = 'scale(1.2)';
        starClone.style.filter = 'drop-shadow(0 2px 4px rgba(255, 255, 255, 0.3))';
      });
      starClone.addEventListener('mouseleave', () => {
        starClone.style.transform = 'scale(1)';
        starClone.style.filter = 'none';
      });

      // Create a click handler that directly toggles the favorite
      const handleStarClick = async (e: Event) => {
        e.stopPropagation();
        e.preventDefault();

        const merchantTLD = starClone.getAttribute('data-merchant-tld');
        const merchantName = starClone.getAttribute('data-merchant-name');
        if (!merchantTLD || !merchantName) return;

        const mileageValue = offer.mileage;

        // Import toggleFavorite dynamically
        const { toggleFavorite } = await import('@/shared/favoritesHelpers');
        const nowFavorited = await toggleFavorite(merchantTLD, merchantName, mileageValue);

        // Update the clone
        starClone.textContent = nowFavorited ? "★" : "☆";
        starClone.setAttribute('data-favorited', nowFavorited ? "true" : "false");
        starClone.setAttribute(
          "aria-label",
          nowFavorited ? "Unfavorite offer" : "Favorite offer"
        );
        starClone.setAttribute(
          "title",
          nowFavorited ? "Remove from favorites" : "Add to favorites"
        );
        starClone.style.color = nowFavorited ? '#FFD700' : 'transparent';

        // Update the original star as well
        starButton.textContent = nowFavorited ? "★" : "☆";
        starButton.setAttribute('data-favorited', nowFavorited ? "true" : "false");
        starButton.setAttribute(
          "aria-label",
          nowFavorited ? "Unfavorite offer" : "Favorite offer"
        );
        starButton.setAttribute(
          "title",
          nowFavorited ? "Remove from favorites" : "Add to favorites"
        );
      };

      starClone.addEventListener('click', handleStarClick);
      starCell.appendChild(starClone);
    }

    row.appendChild(starCell);
  }

  // Wrap the invisible tile overlay in a td that spans all columns
  // This is required for proper table structure and prevents row height issues
  const tileCell = document.createElement('td');
  tileCell.style.position = 'absolute';
  tileCell.style.top = '0';
  tileCell.style.left = '0';
  tileCell.style.width = '100%';
  tileCell.style.height = '100%';
  tileCell.style.padding = '0';
  tileCell.style.border = 'none';
  tileCell.style.overflow = 'hidden';
  tileCell.style.pointerEvents = 'none'; // Let clicks pass through to the tile
  tileCell.appendChild(offer.tile);
  row.appendChild(tileCell);

  return row;
}

/**
 * Creates the table structure with batched DOM operations
 */
async function createTable(offers: OfferData[], showFavorites: boolean): Promise<HTMLTableElement> {
  const table = document.createElement('table');
  table.id = TABLE_ID;
  table.style.width = '100%';
  table.style.minWidth = '100%'; // Ensure table always spans full width
  table.style.borderCollapse = 'collapse';
  table.style.backgroundColor = '#1a1a1a';
  table.style.color = 'white';
  table.style.tableLayout = 'fixed'; // Use fixed layout to ensure consistent widths

  // Create header
  const thead = document.createElement('thead');
  const headerRow = document.createElement('tr');
  headerRow.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
  headerRow.style.borderBottom = '2px solid rgba(255, 255, 255, 0.2)';

  const headers = showFavorites ? ['Merchant', 'Mileage', 'Action', '★'] : ['Merchant', 'Mileage', 'Action'];

  // Calculate column widths as percentages for table-layout: fixed
  // Give more room to Mileage and Action columns to prevent wrapping
  // With favorites (4 cols): Merchant, Mileage, Action, Star
  // Without favorites (3 cols): Merchant, Mileage, Action
  const columnWidths = showFavorites
    ? ['50%', '20%', '25%', '5%']   // With star column - reduced Merchant, increased Mileage/Action
    : ['50%', '25%', '25%'];         // Without star column - equal space for Mileage/Action

  headers.forEach((headerText, index) => {
    const th = document.createElement('th');
    th.textContent = headerText;
    th.style.padding = '16px 12px';
    th.style.textAlign = (headerText === 'Mileage' || headerText === 'Action') ? 'center' : 'left';
    th.style.fontWeight = '700';
    th.style.fontSize = '14px';
    th.style.textTransform = 'uppercase';
    th.style.letterSpacing = '0.5px';
    th.style.color = 'rgba(255, 255, 255, 0.9)';

    // Set width as percentage for fixed table layout
    th.style.width = columnWidths[index];

    if (headerText === '★') {
      th.style.textAlign = 'center';
    }
    if (headerText === 'Merchant') {
      th.style.minWidth = '200px';
    }

    headerRow.appendChild(th);
  });
  thead.appendChild(headerRow);
  table.appendChild(thead);

  // PERFORMANCE: Use DocumentFragment for batched DOM operations
  const tbody = document.createElement('tbody');
  const fragment = document.createDocumentFragment();

  // Create all rows asynchronously (to allow star creation if needed)
  for (let index = 0; index < offers.length; index++) {
    const row = await createTableRow(offers[index], index, showFavorites);
    fragment.appendChild(row);
  }

  tbody.appendChild(fragment);
  table.appendChild(tbody);

  return table;
}

/**
 * Creates pagination controls
 */
function createPaginationControls(): HTMLDivElement {
  const controls = document.createElement('div');
  controls.id = 'c1-table-pagination';
  controls.style.display = 'flex';
  controls.style.justifyContent = 'space-between';
  controls.style.alignItems = 'center';
  controls.style.padding = '20px';
  controls.style.backgroundColor = '#1a1a1a';
  controls.style.borderTop = '1px solid rgba(255, 255, 255, 0.1)';
  controls.style.color = 'white';

  // Page info
  const pageInfo = document.createElement('div');
  pageInfo.id = 'c1-page-info';
  pageInfo.style.fontSize = '14px';
  pageInfo.style.color = 'rgba(255, 255, 255, 0.7)';
  updatePageInfo(pageInfo);
  controls.appendChild(pageInfo);

  // Buttons container
  const buttonsContainer = document.createElement('div');
  buttonsContainer.style.display = 'flex';
  buttonsContainer.style.gap = '10px';
  buttonsContainer.style.alignItems = 'center';

  // Previous button
  const prevButton = document.createElement('button');
  prevButton.textContent = '← Previous';
  prevButton.id = 'c1-prev-page';
  stylePageButton(prevButton);
  prevButton.addEventListener('click', () => {
    if (currentPage > 1) {
      currentPage--;
      renderCurrentPage();
    }
  });
  buttonsContainer.appendChild(prevButton);

  // Page number input container
  const pageInputContainer = document.createElement('div');
  pageInputContainer.style.display = 'flex';
  pageInputContainer.style.alignItems = 'center';
  pageInputContainer.style.gap = '8px';
  pageInputContainer.style.fontSize = '14px';
  pageInputContainer.style.color = 'rgba(255, 255, 255, 0.7)';

  const pageLabel = document.createElement('span');
  pageLabel.textContent = 'Page';
  pageInputContainer.appendChild(pageLabel);

  const pageInput = document.createElement('input');
  pageInput.type = 'number';
  pageInput.min = '1';
  pageInput.max = String(totalPages);
  pageInput.value = String(currentPage);
  pageInput.id = 'c1-page-input';
  pageInput.style.cssText = `
    width: 60px;
    padding: 6px 8px;
    background-color: rgba(255, 255, 255, 0.08);
    color: white;
    border: 1px solid rgba(255, 255, 255, 0.15);
    border-radius: 4px;
    font-size: 14px;
    font-weight: 600;
    text-align: center;
  `;

  pageInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      const targetPage = parseInt(pageInput.value, 10);
      if (targetPage >= 1 && targetPage <= totalPages) {
        currentPage = targetPage;
        renderCurrentPage();
      } else {
        pageInput.value = String(currentPage);
      }
      pageInput.blur();
    }
  });

  pageInput.addEventListener('blur', () => {
    const targetPage = parseInt(pageInput.value, 10);
    if (targetPage >= 1 && targetPage <= totalPages) {
      currentPage = targetPage;
      renderCurrentPage();
    } else {
      pageInput.value = String(currentPage);
    }
  });

  pageInputContainer.appendChild(pageInput);

  const ofLabel = document.createElement('span');
  ofLabel.textContent = `of ${totalPages}`;
  ofLabel.id = 'c1-total-pages-label';
  pageInputContainer.appendChild(ofLabel);

  buttonsContainer.appendChild(pageInputContainer);

  // Next button
  const nextButton = document.createElement('button');
  nextButton.textContent = 'Next →';
  nextButton.id = 'c1-next-page';
  stylePageButton(nextButton);
  nextButton.addEventListener('click', () => {
    if (currentPage < totalPages) {
      currentPage++;
      renderCurrentPage();
    }
  });
  buttonsContainer.appendChild(nextButton);

  controls.appendChild(buttonsContainer);
  return controls;
}

function stylePageButton(button: HTMLButtonElement): void {
  button.style.backgroundColor = 'rgba(255, 255, 255, 0.08)';
  button.style.color = 'white';
  button.style.border = '1px solid rgba(255, 255, 255, 0.15)';
  button.style.padding = '8px 16px';
  button.style.borderRadius = '4px';
  button.style.cursor = 'pointer';
  button.style.fontWeight = '600';
  button.style.fontSize = '14px';
  button.style.transition = 'all 0.2s';

  button.addEventListener('mouseenter', () => {
    button.style.backgroundColor = 'rgba(255, 255, 255, 0.12)';
  });
  button.addEventListener('mouseleave', () => {
    button.style.backgroundColor = 'rgba(255, 255, 255, 0.08)';
  });
}

function updatePageInfo(pageInfo: HTMLElement): void {
  const start = (currentPage - 1) * ITEMS_PER_PAGE + 1;
  const end = Math.min(currentPage * ITEMS_PER_PAGE, allOffers.length);
  pageInfo.textContent = `Showing ${start}-${end} of ${allOffers.length} offers (Page ${currentPage} of ${totalPages})`;
}

function updatePaginationButtons(): void {
  const prevButton = document.getElementById('c1-prev-page') as HTMLButtonElement;
  const nextButton = document.getElementById('c1-next-page') as HTMLButtonElement;
  const pageInfo = document.getElementById('c1-page-info');
  const pageInput = document.getElementById('c1-page-input') as HTMLInputElement;
  const totalPagesLabel = document.getElementById('c1-total-pages-label');

  if (prevButton) {
    prevButton.disabled = currentPage === 1;
    prevButton.style.opacity = currentPage === 1 ? '0.5' : '1';
    prevButton.style.cursor = currentPage === 1 ? 'not-allowed' : 'pointer';
  }

  if (nextButton) {
    nextButton.disabled = currentPage >= totalPages;
    nextButton.style.opacity = currentPage >= totalPages ? '0.5' : '1';
    nextButton.style.cursor = currentPage >= totalPages ? 'not-allowed' : 'pointer';
  }

  if (pageInfo) {
    updatePageInfo(pageInfo);
  }

  if (pageInput) {
    pageInput.value = String(currentPage);
    pageInput.max = String(totalPages);
  }

  if (totalPagesLabel) {
    totalPagesLabel.textContent = `of ${totalPages}`;
  }
}

/**
 * Renders current page, keeping non-visible tiles in main container (hidden)
 */
async function renderCurrentPage(): Promise<void> {
  // Preserve scroll position during page navigation
  const scrollX = window.scrollX;
  const scrollY = window.scrollY;

  const tableContainer = document.getElementById(TABLE_CONTAINER_ID);
  if (!tableContainer) return;

  const mainContainer = findMainContainer();
  if (!mainContainer) return;

  const start = (currentPage - 1) * ITEMS_PER_PAGE;
  const end = start + ITEMS_PER_PAGE;
  const pageOffers = allOffers.slice(start, end);

  const showFavorites = await areFavoritesEnabled();

  // Update table container width based on whether favorites are shown
  const newWidth = showFavorites ? '1500px' : '1400px';
  tableContainer.style.maxWidth = newWidth;

  // Force a reflow to ensure width is applied before creating table
  void tableContainer.offsetHeight;

  // Before removing existing table, move tiles back to main container (hidden)
  const existingTable = document.getElementById(TABLE_ID);
  if (existingTable) {
    const tilesInOldTable = Array.from(existingTable.querySelectorAll('[data-testid^="feed-tile-"]')) as HTMLElement[];
    tilesInOldTable.forEach(tile => {
      // Don't restore state here - tiles will be reused with overlay in next render
      // State is only restored when completely exiting table view
      // Keep tiles hidden in main container when not in current page
      tile.style.display = 'none';
      mainContainer.appendChild(tile);
    });
    existingTable.remove();
  }

  // Create and insert new table
  const table = await createTable(pageOffers, showFavorites);
  const paginationControls = document.getElementById('c1-table-pagination');
  if (paginationControls) {
    tableContainer.insertBefore(table, paginationControls);
  } else {
    tableContainer.appendChild(table);
  }

  // Force a reflow to ensure all styles are applied immediately
  // This prevents the "auto-correction" behavior when navigating pages
  void table.offsetHeight;
  void tableContainer.offsetHeight;

  updatePaginationButtons();

  // Restore scroll position multiple times to combat any async scroll changes
  // This handles cases where star creation or other async operations cause unwanted scrolling
  const restoreScroll = () => window.scrollTo(scrollX, scrollY);

  // Immediate restore
  restoreScroll();

  // After next paint
  requestAnimationFrame(() => {
    restoreScroll();
    // And again after the following paint
    requestAnimationFrame(() => {
      restoreScroll();
      // Final restore after a small delay to catch any late async operations
      setTimeout(restoreScroll, 50);
    });
  });
}

/**
 * Refreshes the current table to reflect updated favorites state, sorting, or filtering
 * Re-extracts offer data to pick up any changes from filtering or sorting
 */
export async function refreshTableView(): Promise<void> {
  if (!isTableViewActive()) {
    return;
  }

  const tableContainer = document.getElementById(TABLE_CONTAINER_ID);
  if (!tableContainer) return;

  const showFavorites = await areFavoritesEnabled();

  // Update table container width based on whether favorites are shown
  tableContainer.style.maxWidth = showFavorites ? '1500px' : '1400px';

  // Re-extract offer data to pick up any changes from filtering or sorting
  // This now properly collects tiles from both main container and table
  allOffers = extractOfferData();

  // Recalculate pagination based on new offer count
  totalPages = Math.ceil(allOffers.length / ITEMS_PER_PAGE);

  // If current page is now out of bounds, go to last page
  if (currentPage > totalPages && totalPages > 0) {
    currentPage = totalPages;
  }

  // Re-render the current page
  await renderCurrentPage();
}

/**
 * Checks if table view is currently active
 */
export function isTableViewActive(): boolean {
  return !!document.getElementById(TABLE_CONTAINER_ID);
}

/**
 * Applies table view by hiding grid and showing table
 */
export async function applyTableView(): Promise<{ success: boolean; offersShown: number; error?: string }> {
  try {
    const mainContainer = findMainContainer();
    if (!mainContainer) {
      return {
        success: false,
        offersShown: 0,
        error: 'Could not find offers container',
      };
    }

    // Clean up any leftover table artifacts
    const existingTableContainer = document.getElementById(TABLE_CONTAINER_ID);
    if (existingTableContainer) {
      existingTableContainer.remove();
    }

    // Extract offer data
    allOffers = extractOfferData();

    if (allOffers.length === 0) {
      return {
        success: false,
        offersShown: 0,
        error: 'No offers found to display in table',
      };
    }

    // Calculate pagination
    currentPage = 1;
    totalPages = Math.ceil(allOffers.length / ITEMS_PER_PAGE);

    // Check if favorites are enabled
    const showFavorites = await areFavoritesEnabled();

    // Hide the main container to show only table view
    mainContainer.style.display = 'none';

    // Create fresh table container
    const tableContainer = document.createElement('div');
    tableContainer.id = TABLE_CONTAINER_ID;
    tableContainer.style.width = '100%';
    tableContainer.style.maxWidth = showFavorites ? '1500px' : '1400px';
    tableContainer.style.margin = '0 auto';
    tableContainer.style.padding = '20px';
    tableContainer.style.backgroundColor = '#1a1a1a';
    tableContainer.style.borderRadius = '8px';
    mainContainer.parentElement?.insertBefore(tableContainer, mainContainer);

    // Get first page of offers
    const firstPageOffers = allOffers.slice(0, ITEMS_PER_PAGE);

    // Create and append table
    const table = await createTable(firstPageOffers, showFavorites);
    tableContainer.appendChild(table);

    // Add pagination controls
    const paginationControls = createPaginationControls();
    tableContainer.appendChild(paginationControls);

    // Force a reflow to ensure all styles are applied immediately
    // This prevents layout issues on initial table creation
    void table.offsetHeight;
    void tableContainer.offsetHeight;

    return {
      success: true,
      offersShown: allOffers.length,
    };
  } catch (error) {
    console.error('[Table View] Error:', error);
    return {
      success: false,
      offersShown: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Removes table view and restores grid
 * OPTIMIZED: Uses WeakMap for state instead of DOM attributes
 */
export async function removeTableView(): Promise<{ success: boolean; error?: string }> {
  try {
    const mainContainer = findMainContainer();
    if (!mainContainer) {
      return {
        success: false,
        error: 'Could not find offers container',
      };
    }

    // Collect ALL tiles from both table and main container
    const tableContainer = document.getElementById(TABLE_CONTAINER_ID);
    const allTiles: HTMLElement[] = [];

    // Get tiles from table (currently visible page)
    if (tableContainer) {
      const tilesInTable = Array.from(tableContainer.querySelectorAll('[data-testid^="feed-tile-"]')) as HTMLElement[];
      allTiles.push(...tilesInTable);
    }

    // Get tiles from main container (hidden tiles from other pages)
    const tilesInMain = Array.from(mainContainer.querySelectorAll('[data-testid^="feed-tile-"]')) as HTMLElement[];
    allTiles.push(...tilesInMain);

    // PERFORMANCE: Use DocumentFragment for batched DOM operations
    const fragment = document.createDocumentFragment();

    // Restore all tiles' styles and add to fragment
    allTiles.forEach(tile => {
      restoreTileState(tile);
      fragment.appendChild(tile);
    });

    // Single DOM operation: append all tiles at once
    mainContainer.appendChild(fragment);

    // Remove table container
    if (tableContainer) {
      tableContainer.remove();
    }

    // Restore the main container display
    mainContainer.style.display = '';

    return {
      success: true,
    };
  } catch (error) {
    console.error('[Table View] Error removing table:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
