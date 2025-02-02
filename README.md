# Capital One Offers Sorter

A Chrome extension that enhances the Capital One rewards offers page by adding mileage-based sorting functionality. Easily find the best mileage deals by sorting offers in ascending or descending order.

![Extension](https://github.com/user-attachments/assets/999668a6-a2dc-415d-853c-0dfdf37d2cdc)

## Features

- Sort offers by mileage value in ascending or descending order
- Automatically handles different mileage formats (e.g., "2X miles", "Up to 60,000 miles")
- Loads all available offers before sorting (handles "View More Offers" pagination)
- Maintains the original page styling while reorganizing offers
- Only activates on the official Capital One offers page for security

## Why Use This Extension?

The default Capital One offers page doesn't provide sorting options for mileage rewards. This extension fills that gap by allowing you to quickly find the highest or lowest mileage offers, making it easier to maximize your rewards based on your preferences.

## Installation

1. Download the extension files
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" in the top right corner
4. Click "Load unpacked" and select the extension directory
5. The extension icon will appear in your Chrome toolbar

## Usage

1. Navigate to `https://capitaloneoffers.com/c1-offers`
2. Click the extension icon in your toolbar
3. Select your preferred sort order:
   - "Highest Miles" for descending order
   - "Lowest Miles" for ascending order
4. Click "Sort Offers"
5. Wait briefly if there are multiple pages of offers to load
6. Offers will be automatically reorganized based on your selection

## Technical Details

### Implementation Features

- Built with React and TypeScript for reliability and maintainability
- Uses DOM manipulation for sorting without affecting the underlying data
- Handles multiple mileage formats through regex pattern matching
- Implements graceful loading states and error handling
- Responsive design that maintains the original page layout
- Works with Chrome version 88 and newer

### Required Permissions

This extension requires two permissions:

- `activeTab`: Needed to interact with the Capital One offers page when you're actively viewing it. This permission is only active when you're on the offers page, ensuring privacy and security.
- `scripting`: Required to inject the sorting functionality into the page. This allows the extension to read offer details and reorder them while maintaining the page's security. The extension only uses this permission on the Capital One offers website.

### Security Features

- Only activates on the official Capital One offers URL
- No data collection or external communications
- All sorting happens locally in your browser
- No modification of offer data, only display order

## Support

If you encounter any issues or have suggestions for improvements, please open an issue in the GitHub repository.

## Contributing

Contributions are welcome! Feel free to submit pull requests or suggest new features.

## Buy Me a Coffee

If you find this extension helpful, consider supporting the developer by buying them a coffee! Look for the coffee button in the extension popup.
