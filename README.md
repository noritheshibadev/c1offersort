# C1 Offers Sorter

> Enhance your Capital One rewards experience with intelligent sorting, powerful search, and favorites management

## Features

**Instant Search**

- Search across all loaded offers by merchant name
- Fuzzy matching finds offers even with typos
- Click any result to instantly scroll to that offer on the page
- Works seamlessly with thousands of offers

**Smart Sorting**

- Sort offers by highest or lowest mileage rewards
- Sort alphabetically by merchant name (A-Z or Z-A)
- Automatically loads all available offers before sorting

**Offer Type Filter**

- Filter by All, Multipliers (5X, 10X), or Static (500 miles) offers
- Quickly find high-multiplier deals or fixed-value offers
- Works with sorting and favorites filtering

**Favorites Management**

- Mark your favorite offers with star buttons
- View all favorites in an expandable list
- Filter to show only favorited offers on the page
- Favorites persist across browsing sessions

**Security & Privacy**

- All data stored locally—nothing sent to external servers
- Open source and transparent
- Minimal permissions required

## Quick Start

1. **Install the Extension**

   - Install from the [Chrome Web Store](https://chrome.google.com/webstore) (coming soon)
   - Or build from source (see Development section below)

2. **Navigate to Capital One Offers**

   - Visit [capitaloneoffers.com/feed](https://capitaloneoffers.com/feed) or [capitaloneoffers.com/c1-offers](https://capitaloneoffers.com/c1-offers)
   - Click the extension icon in your Chrome toolbar

3. **Search for Offers**

   - Use the search box to find specific merchants
   - Click any search result to jump to that offer on the page
   - Search works after all offers are loaded

4. **Sort Your Offers**

   - Choose your sorting preference (mileage or alphabetical)
   - Select order (highest/lowest or A-Z/Z-A)
   - Click "Load & Sort Offers"

5. **Manage Favorites**
   - Toggle "Favorites" switch to enable star buttons
   - Click stars on offers to mark as favorites
   - Use "Show Favorites Only" to filter the page

## Usage

### Searching Offers

1. Navigate to [capitaloneoffers.com/feed](https://capitaloneoffers.com/feed) or [capitaloneoffers.com/c1-offers](https://capitaloneoffers.com/c1-offers)
2. Click the extension icon
3. Click "Load & Sort Offers" to load all available offers (required for search)
4. Type in the search box to find specific merchants
5. Click any search result to instantly jump to that offer on the page

**Tips:**

- Search uses fuzzy matching—it works even if you misspell the merchant name
- Search becomes available after pagination completes (all offers loaded)
- Results show merchant name and mileage value

### Sorting Offers

1. Navigate to [capitaloneoffers.com/feed](https://capitaloneoffers.com/feed) or [capitaloneoffers.com/c1-offers](https://capitaloneoffers.com/c1-offers)
2. Click the extension icon
3. Select sort criteria (Mileage or Alphabetical)
4. Choose order (Highest/Lowest or A-Z/Z-A)
5. Click "Load & Sort Offers"

### Managing Favorites

1. Toggle the favorites switch in the popup
2. Click star buttons on any offer
3. Click "Show Favorites Only" to filter the page
4. View your favorites list by clicking "Your Favorites"

## Privacy & Security

Your privacy matters. This extension:

- ✅ Stores all data **locally** in your browser only
- ✅ **Never transmits** data to external servers
- ✅ Only activates on Capital One domains
- ✅ Uses minimal permissions (activeTab, scripting, storage)
- ✅ Open source—review the code anytime

### Required Permissions

| Permission  | Why We Need It                                           |
| ----------- | -------------------------------------------------------- |
| `activeTab` | Access Capital One offers page when you click extension  |
| `scripting` | Inject sorting and favorites functionality into the page |
| `storage`   | Save your favorite offers locally in your browser        |

Read the full [Privacy Policy](docs/PRIVACY.md).

## Browser Compatibility

- **Chrome**: Version 109 or later
- **Firefox**: Version 109 or later _(New in v2.3)_
- **Edge**: Chromium-based versions supported

## Development

Want to contribute or build from source?

### Setup

```bash
# Clone and install
git clone https://github.com/noritheshibadev/c1offersort.git
cd c1offersort
yarn install

# Build the extension
yarn build
```

### Load in Chrome

1. Navigate to `chrome://extensions`
2. Enable "Developer mode" (top right toggle)
3. Click "Load unpacked"
4. Select the `dist/chrome-mv3` folder from the project

### Load in Firefox

1. Navigate to `about:debugging#/runtime/this-firefox`
2. Click "Load Temporary Add-on"
3. Select `dist/firefox-mv3/manifest.json`

### Load in FireFox

1. Navigate to `about:debugging`
2. Click "This Firefox" (in the sidebar)
3. Click "Load temporary Add-on..."
4. Select `manifest.json` from the `dist` folder of the project

## Contributing

Contributions are welcome! To contribute:

1. Fork the repository
2. Create a feature branch
3. Make your changes and test locally
4. Submit a Pull Request

For bug reports or feature requests, please [open an issue](https://github.com/noritheshibadev/c1offersort/issues).

## Support

- **Bug Reports**: [Open an issue](https://github.com/noritheshibadev/c1offersort/issues)
- **Questions**: [GitHub Discussions](https://github.com/noritheshibadev/c1offersort/discussions)

If you find this extension helpful, consider [buying Nori a treat](https://buymeacoffee.com/shibadev)!

## License

This project is open source and available under the MIT License.

---

**Note**: This extension is not affiliated with or endorsed by Capital One. It's an independent tool created to enhance the user experience of Capital One rewards offers.
