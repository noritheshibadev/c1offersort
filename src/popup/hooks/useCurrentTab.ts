import { useState, useEffect } from "react";
import { chromeService } from "@/services/ChromeService";

/**
 * Custom hook that fetches and returns the URL of the current active tab.
 * Runs once on mount to get the initial tab URL.
 *
 * @returns The current tab's URL, or empty string if unavailable
 */
export function useCurrentTab(): string {
  const [currentUrl, setCurrentUrl] = useState<string>("");

  useEffect(() => {
    chromeService.getCurrentTab()
      .then((tab) => {
        if (tab?.url) {
          setCurrentUrl(tab.url);
        }
      })
      .catch((error) => {
        console.error("Failed to get current tab:", error);
        setCurrentUrl("");
      });
  }, []);

  return currentUrl;
}
