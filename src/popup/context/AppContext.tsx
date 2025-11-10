import React, { createContext, useContext, useEffect, useState, useMemo, type ReactNode } from 'react';
import { useCurrentTab } from '../hooks/useCurrentTab';
import { isValidCapitalOneUrl } from '@/utils/typeGuards';
import { chromeService } from '@/services/ChromeService';

/**
 * Context for app-level state (current tab, URL validation)
 */
interface AppContextValue {
  currentTabId: number | undefined;
  currentUrl: string | null;
  isValidUrl: boolean;
  isTabIdLoading: boolean;
}

const AppContext = createContext<AppContextValue | undefined>(undefined);

interface AppProviderProps {
  children: ReactNode;
}

export const AppProvider: React.FC<AppProviderProps> = ({ children }) => {
  const currentUrl = useCurrentTab();
  const [currentTabId, setCurrentTabId] = useState<number | undefined>(undefined);
  const [isTabIdLoading, setIsTabIdLoading] = useState(true);
  const isValidUrl = useMemo(() => isValidCapitalOneUrl(currentUrl), [currentUrl]);

  // Get current tab ID on mount
  useEffect(() => {
    async function fetchTabId() {
      try {
        const tab = await chromeService.getCurrentTab();
        if (tab?.id) {
          setCurrentTabId(tab.id);
        }
      } catch (error) {
        console.error('[AppContext] Failed to get current tab:', error);
      } finally {
        setIsTabIdLoading(false);
      }
    }
    fetchTabId();
  }, []);

  const value = useMemo(
    () => ({
      currentTabId,
      currentUrl,
      isValidUrl,
      isTabIdLoading,
    }),
    [currentTabId, currentUrl, isValidUrl, isTabIdLoading]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

/**
 * Hook to access app-level state
 */
export const useApp = (): AppContextValue => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within AppProvider');
  }
  return context;
};
