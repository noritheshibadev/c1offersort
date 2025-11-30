#!/bin/bash

# C1 Offers Sorter - Source Code Packaging Script for Firefox Add-ons
# Creates a clean source code archive for Mozilla review

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Get version from package.json
VERSION=$(node -p "require('./package.json').version")
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
OUTPUT_DIR="releases"
SOURCE_ZIP_NAME="c1offers-source-v${VERSION}.zip"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}C1 Offers Sorter - Source Code Archive${NC}"
echo -e "${BLUE}Version: ${VERSION}${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Create releases directory if it doesn't exist
mkdir -p "$OUTPUT_DIR"

# Remove old source zip if it exists
if [ -f "${OUTPUT_DIR}/${SOURCE_ZIP_NAME}" ]; then
  rm "${OUTPUT_DIR}/${SOURCE_ZIP_NAME}"
  echo -e "${YELLOW}✓${NC} Removed old source archive"
fi

echo ""
echo -e "${YELLOW}[1/4]${NC} Creating source code archive from git repository..."

# Use git archive to create a clean source code zip
# This automatically excludes:
# - Anything in .gitignore
# - Untracked files
# - .git directory
git archive --format=zip --output="${OUTPUT_DIR}/${SOURCE_ZIP_NAME}" HEAD

if [ $? -ne 0 ]; then
  echo -e "${RED}✗ Failed to create git archive${NC}"
  exit 1
fi

echo -e "${GREEN}✓${NC} Git archive created"

echo ""
echo -e "${YELLOW}[2/4]${NC} Verifying archive contents..."

# List contents to verify (first 30 files)
echo ""
echo -e "${BLUE}Archive contains:${NC}"
unzip -l "${OUTPUT_DIR}/${SOURCE_ZIP_NAME}" | head -35

echo ""
echo -e "${YELLOW}[3/4]${NC} Checking for sensitive files..."

# Check for files that should NOT be in the archive
SENSITIVE_PATTERNS=(
  ".env"
  ".env.local"
  ".env.production"
  "*.pem"
  "*.crx"
  ".claude/CLAUDE.md"
  ".claude/settings"
  "node_modules/"
  "dist/"
  "dist-firefox/"
)

HAS_SENSITIVE=0
for pattern in "${SENSITIVE_PATTERNS[@]}"; do
  if unzip -l "${OUTPUT_DIR}/${SOURCE_ZIP_NAME}" | grep -q "$pattern" 2>/dev/null; then
    echo -e "${RED}✗ WARNING: Found sensitive file: $pattern${NC}"
    HAS_SENSITIVE=1
  fi
done

if [ $HAS_SENSITIVE -eq 0 ]; then
  echo -e "${GREEN}✓${NC} No sensitive files found"
else
  echo -e "${RED}✗ SENSITIVE FILES DETECTED! Review archive before submission.${NC}"
  exit 1
fi

# Check archive size
ZIP_SIZE=$(du -sh "${OUTPUT_DIR}/${SOURCE_ZIP_NAME}" | cut -f1)

echo ""
echo -e "${YELLOW}[4/4]${NC} Creating README for Mozilla reviewers..."

# Create a README for the archive
cat > "${OUTPUT_DIR}/SOURCE_README.txt" << 'EOF'
# C1 Offers Sorter - Source Code

This archive contains the complete source code for the C1 Offers Sorter Firefox extension.

## Build Instructions

1. Install dependencies:
   ```
   yarn install
   ```

2. Build Firefox version:
   ```
   yarn build:firefox
   ```

   This runs:
   - `yarn build:prod` - Production build with optimizations
   - `node scripts/prepare-firefox.js` - Prepares Firefox-specific package

3. Output will be in `dist-firefox/` directory

## Alternative Build Commands

- Development build: `yarn build`
- Chrome version: `yarn build:prod`
- Package for submission: `yarn package:firefox`

## Project Structure

- `/src` - TypeScript source code
  - `/popup` - React UI (popup)
  - `/content` - Content scripts
  - `/background` - Service worker
  - `/services` - Chrome/Browser API wrappers
  - `/utils` - Shared utilities

- `/public` - Static assets
  - `manifest.json` - Chrome manifest
  - `manifest.firefox.json` - Firefox manifest (with data_collection_permissions)

- `/scripts` - Build scripts
  - `prepare-firefox.js` - Copies dist to dist-firefox with Firefox manifest
  - `package-firefox.sh` - Creates submission package

## Dependencies

All dependencies are listed in `package.json`:
- `react` + `react-dom` - UI framework
- `webextension-polyfill` - Cross-browser API compatibility
- `fuse.js` - Client-side search functionality
- `vite` - Build tool
- `typescript` - Type checking

No dependencies make external network requests at runtime.

## Verification

The built extension (dist-firefox/) will match this source code exactly.

You can verify by:
1. Running `yarn build:firefox`
2. Comparing output with submitted extension package

## Questions?

GitHub: https://github.com/noritheshibadev/c1offersort
Issues: https://github.com/noritheshibadev/c1offersort/issues
EOF

echo -e "${GREEN}✓${NC} README created"

# Summary
echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}✓ Source code archive created!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "${BLUE}Archive Details:${NC}"
echo -e "  File:          ${SOURCE_ZIP_NAME}"
echo -e "  Location:      ${OUTPUT_DIR}/${SOURCE_ZIP_NAME}"
echo -e "  Size:          ${ZIP_SIZE}"
echo -e "  Build README:  ${OUTPUT_DIR}/SOURCE_README.txt"
echo ""
echo -e "${BLUE}Contents:${NC}"
echo -e "  ✓ Source code (/src, /public, /scripts)"
echo -e "  ✓ Configuration files (package.json, tsconfig.json)"
echo -e "  ✓ Documentation (README.md, PRIVACY.md, etc.)"
echo -e "  ✗ Build artifacts (excluded)"
echo -e "  ✗ Dependencies (excluded - reviewers run 'yarn install')"
echo -e "  ✗ .claude files (excluded)"
echo -e "  ✗ .env files (excluded)"
echo ""
echo -e "${BLUE}Next Steps:${NC}"
echo -e "  1. Upload ${SOURCE_ZIP_NAME} to Firefox Add-ons submission"
echo -e "  2. Also upload the built extension: c1offers-firefox-v${VERSION}.zip"
echo -e "  3. In submission form, link to GitHub repo for reviewers"
echo ""
echo -e "${YELLOW}Note:${NC} Mozilla reviewers will run 'yarn install && yarn build:firefox'"
echo -e "      and verify the output matches your submitted extension package."
echo ""
