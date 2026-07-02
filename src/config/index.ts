/**
 * Central configuration for the C1 Offers Sorter extension.
 *
 * Kept deliberately small: only the values actually read at runtime live here.
 * DOM selectors, pagination timings, URL patterns, and other constants live
 * in `src/utils/constants.ts` and are the single source of truth. Do not
 * reintroduce shadow copies of those here — the two diverged historically and
 * hid bugs.
 */

export const config = {
  app: {
    name: "C1 Offers Sorter",
    get version() {
      // Dynamically get version from manifest
      if (typeof chrome !== "undefined" && chrome.runtime?.getManifest) {
        return chrome.runtime.getManifest().version;
      }
      return "2.1.0"; // Fallback for test environment
    },
  },

  logging: {
    enabled: import.meta.env.MODE !== "production",
    contexts: {
      content: "[Content Script]",
      popup: "[Popup]",
      background: "[Background]",
      injected: "[Injected Script]",
    },
  },
} as const;
