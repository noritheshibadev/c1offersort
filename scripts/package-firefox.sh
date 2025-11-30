#!/bin/bash

# C1 Offers Sorter - Firefox Add-ons Package Script
# This script builds the extension and packages it for Firefox Add-ons submission

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
ZIP_NAME="c1offers-firefox-v${VERSION}.zip"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}C1 Offers Sorter - Firefox Package${NC}"
echo -e "${BLUE}Version: ${VERSION}${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Step 1: Clean previous builds
echo -e "${YELLOW}[1/6]${NC} Cleaning previous builds..."
if [ -d "dist" ]; then
  rm -rf dist
  echo "✓ Removed dist/ directory"
fi
if [ -d "dist-firefox" ]; then
  rm -rf dist-firefox
  echo "✓ Removed dist-firefox/ directory"
fi

# Step 2: Run production build
echo ""
echo -e "${YELLOW}[2/6]${NC} Running production build..."
yarn build:prod
echo "✓ Production build complete"

# Step 3: Prepare Firefox-specific build
echo ""
echo -e "${YELLOW}[3/6]${NC} Preparing Firefox build..."
node scripts/prepare-firefox.js
echo "✓ Firefox build prepared"

# Step 4: Validate build
echo ""
echo -e "${YELLOW}[4/6]${NC} Validating Firefox build..."

# Check required files
REQUIRED_FILES=("dist-firefox/manifest.json" "dist-firefox/index.html" "dist-firefox/main.js" "dist-firefox/content.js" "dist-firefox/background.js")
MISSING_FILES=()

for file in "${REQUIRED_FILES[@]}"; do
  if [ ! -f "$file" ]; then
    MISSING_FILES+=("$file")
  fi
done

if [ ${#MISSING_FILES[@]} -gt 0 ]; then
  echo -e "${RED}✗ Missing required files:${NC}"
  for file in "${MISSING_FILES[@]}"; do
    echo -e "  ${RED}- $file${NC}"
  done
  exit 1
fi

# Check for browser_specific_settings in manifest
if ! grep -q "browser_specific_settings" "dist-firefox/manifest.json"; then
  echo -e "${RED}✗ Firefox manifest missing browser_specific_settings${NC}"
  exit 1
fi

echo "✓ All required files present"

# Verify manifest version matches package.json
MANIFEST_VERSION=$(node -p "require('./dist-firefox/manifest.json').version")
if [ "$MANIFEST_VERSION" != "$VERSION" ]; then
  echo -e "${RED}✗ Version mismatch!${NC}"
  echo -e "  package.json: ${VERSION}"
  echo -e "  manifest.json: ${MANIFEST_VERSION}"
  exit 1
fi
echo "✓ Version numbers match (v${VERSION})"

# Calculate package size
DIST_SIZE=$(du -sh dist-firefox | cut -f1)
echo "✓ Package size: ${DIST_SIZE}"

# Step 5: Create zip file
echo ""
echo -e "${YELLOW}[5/6]${NC} Creating zip package..."

# Create releases directory if it doesn't exist
mkdir -p "$OUTPUT_DIR"

# Remove old zip if it exists
if [ -f "${OUTPUT_DIR}/${ZIP_NAME}" ]; then
  rm "${OUTPUT_DIR}/${ZIP_NAME}"
  echo "✓ Removed old package"
fi

# Create zip (excluding .DS_Store files)
cd dist-firefox
zip -r "../${OUTPUT_DIR}/${ZIP_NAME}" . -x "*.DS_Store" > /dev/null
cd ..

ZIP_SIZE=$(du -sh "${OUTPUT_DIR}/${ZIP_NAME}" | cut -f1)
echo "✓ Created ${ZIP_NAME} (${ZIP_SIZE})"

# Also create a timestamped backup
BACKUP_ZIP_NAME="c1offers-firefox-v${VERSION}-${TIMESTAMP}.zip"
cp "${OUTPUT_DIR}/${ZIP_NAME}" "${OUTPUT_DIR}/${BACKUP_ZIP_NAME}"
echo "✓ Created backup: ${BACKUP_ZIP_NAME}"

# Step 6: Summary
echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}✓ Firefox package created successfully!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "${BLUE}Package Details:${NC}"
echo -e "  Version:       ${VERSION}"
echo -e "  Package Size:  ${ZIP_SIZE}"
echo -e "  Location:      ${OUTPUT_DIR}/${ZIP_NAME}"
echo -e "  Backup:        ${OUTPUT_DIR}/${BACKUP_ZIP_NAME}"
echo ""
echo -e "${BLUE}Next Steps:${NC}"
echo -e "  1. Upload ${ZIP_NAME} to addons.mozilla.org"
echo -e "  2. Provide source code for review (required by Mozilla)"
echo -e "  3. Fill out submission form with:"
echo -e "     - Description"
echo -e "     - Screenshots"
echo -e "     - Privacy policy"
echo -e "     - Build instructions"
echo -e "  4. Submit for review (1-3 days)"
echo ""
echo -e "${YELLOW}Important for Firefox:${NC}"
echo -e "  • Mozilla requires buildable source code"
echo -e "  • Include README with build instructions"
echo -e "  • Review process is manual (takes longer than Chrome)"
echo -e "  • Test in Firefox first: about:debugging → Load Temporary Add-on"
echo ""
