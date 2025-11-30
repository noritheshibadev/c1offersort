import { defineConfig } from 'wxt';
import pkg from './package.json';

export default defineConfig({
  srcDir: 'src',
  entrypointsDir: 'entrypoints',
  outDir: 'dist',

  // Cross-browser support
  manifestVersion: 3,

  // React module for automatic React setup
  modules: ['@wxt-dev/module-react'],

  // Vite configuration
  vite: () => ({
    resolve: {
      alias: {
        '@': '/src',
      },
    },
    build: {
      minify: 'terser',
      terserOptions: {
        compress: {
          drop_debugger: true,
          drop_console: true,
        },
        format: {
          comments: false,
        },
      },
    },
  }),

  // Manifest configuration
  manifest: {
    name: 'C1 Offers Sorter',
    description:
      'Search, sort, and filter Capital One shopping offers. Find high-value rewards instantly with favorites and smart sorting.',
    version: pkg.version,
    minimum_chrome_version: '109',
    permissions: ['activeTab', 'scripting', 'storage'],
    homepage_url: 'https://github.com/noritheshibadev/c1offersort',
    icons: {
      16: 'icons/icon16.png',
      32: 'icons/icon32.png',
      48: 'icons/icon48.png',
      128: 'icons/icon128.png',
    },
    content_security_policy: {
      extension_pages: "script-src 'self'; object-src 'self'",
    },
    // WXT generates pagination.js at root level from unlisted script
    web_accessible_resources: [
      {
        resources: ['pagination.js'],
        matches: ['https://capitaloneoffers.com/*'],
      },
    ],
  },
});
