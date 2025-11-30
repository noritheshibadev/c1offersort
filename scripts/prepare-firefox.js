#!/usr/bin/env node

/**
 * Firefox Build Preparation Script
 * Copies the Chrome build to a Firefox-specific directory and replaces the manifest
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DIST_DIR = path.join(__dirname, '..', 'dist');
const FIREFOX_DIST_DIR = path.join(__dirname, '..', 'dist-firefox');
const FIREFOX_MANIFEST_PATH = path.join(__dirname, '..', 'public', 'manifest.firefox.json');

console.log('🦊 Preparing Firefox build...\n');

// Step 1: Check if dist directory exists
if (!fs.existsSync(DIST_DIR)) {
  console.error('❌ Error: dist/ directory not found. Run yarn build:prod first.');
  process.exit(1);
}

// Step 2: Check if Firefox manifest exists
if (!fs.existsSync(FIREFOX_MANIFEST_PATH)) {
  console.error('❌ Error: manifest.firefox.json not found.');
  process.exit(1);
}

// Step 3: Remove old Firefox dist if it exists
if (fs.existsSync(FIREFOX_DIST_DIR)) {
  console.log('🗑️  Removing old dist-firefox directory...');
  fs.rmSync(FIREFOX_DIST_DIR, { recursive: true, force: true });
}

// Step 4: Copy dist to dist-firefox
console.log('📦 Copying dist/ to dist-firefox/...');
fs.cpSync(DIST_DIR, FIREFOX_DIST_DIR, { recursive: true });

// Step 5: Replace manifest.json with Firefox version
console.log('📝 Replacing manifest.json with Firefox version...');
const firefoxManifest = fs.readFileSync(FIREFOX_MANIFEST_PATH, 'utf-8');
fs.writeFileSync(
  path.join(FIREFOX_DIST_DIR, 'manifest.json'),
  firefoxManifest,
  'utf-8'
);

// Step 6: Verify the Firefox manifest
const installedManifest = JSON.parse(
  fs.readFileSync(path.join(FIREFOX_DIST_DIR, 'manifest.json'), 'utf-8')
);

if (!installedManifest.browser_specific_settings) {
  console.error('❌ Error: Firefox manifest missing browser_specific_settings');
  process.exit(1);
}

console.log('✅ Firefox build prepared successfully!');
console.log(`📁 Output directory: ${FIREFOX_DIST_DIR}`);
console.log(`🆔 Extension ID: ${installedManifest.browser_specific_settings.gecko.id}`);
console.log(`📦 Version: ${installedManifest.version}\n`);
