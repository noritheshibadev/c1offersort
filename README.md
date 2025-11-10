# C1 Offers Sorter

> Enhance your Capital One rewards experience with intelligent sorting and favorites management

## Features

**Smart Sorting**
- Sort offers by highest or lowest mileage rewards
- Sort alphabetically by merchant name (A-Z or Z-A)
- Automatically loads all available offers before sorting

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

3. **Sort Your Offers**
   - Choose your sorting preference (mileage or alphabetical)
   - Select order (highest/lowest or A-Z/Z-A)
   - Click "Sort Offers"

4. **Manage Favorites**
   - Toggle "Favorites" switch to enable star buttons
   - Click stars on offers to mark as favorites
   - Use "Show Favorites Only" to filter the page

## Usage

### Sorting Offers

1. Navigate to [capitaloneoffers.com/feed](https://capitaloneoffers.com/feed) or [capitaloneoffers.com/c1-offers](https://capitaloneoffers.com/c1-offers)
2. Click the extension icon
3. Select sort criteria (Mileage or Alphabetical)
4. Choose order (Highest/Lowest or A-Z/Z-A)
5. Click "Sort Offers"

### Managing Favorites

1. Toggle the favorites switch in the popup
2. Click star buttons on any offer
3. Click "Show Favorites Only" to filter the page

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

### Testing

Run the test suite to ensure everything works:

```bash
# Run all tests
yarn test:run

# Run tests in watch mode (for development)
yarn test

# Run tests with UI
yarn test:ui

# Run tests with coverage report
yarn test:coverage

# Type checking
yarn typecheck
```

### Load in Chrome

1. Navigate to `chrome://extensions`
2. Enable "Developer mode" (top right toggle)
3. Click "Load unpacked"
4. Select the `dist` folder from the project

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
