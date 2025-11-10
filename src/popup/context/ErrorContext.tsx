import React, { createContext, useContext, useState, useCallback, useMemo, type ReactNode } from 'react';

/**
 * Context for global error handling
 */
interface ErrorContextValue {
  errorMessage: string | null;
  setError: (message: string | null) => void;
  clearError: () => void;
}

const ErrorContext = createContext<ErrorContextValue | undefined>(undefined);

interface ErrorProviderProps {
  children: ReactNode;
}

export const ErrorProvider: React.FC<ErrorProviderProps> = ({ children }) => {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const setError = useCallback((message: string | null) => {
    setErrorMessage(message);
  }, []);

  const clearError = useCallback(() => {
    setErrorMessage(null);
  }, []);

  const value = useMemo(
    () => ({
      errorMessage,
      setError,
      clearError,
    }),
    [errorMessage, setError, clearError]
  );

  return <ErrorContext.Provider value={value}>{children}</ErrorContext.Provider>;
};

/**
 * Hook to access error state and handlers
 */
export const useError = (): ErrorContextValue => {
  const context = useContext(ErrorContext);
  if (!context) {
    throw new Error('useError must be used within ErrorProvider');
  }
  return context;
};
