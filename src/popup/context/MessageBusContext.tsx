/**
 * MessageBusContext - React Context wrapper for Chrome message subscriptions
 *
 * Provides a centralized message listener that dispatches to React components.
 * Solves the problem of multiple listeners for the same message types.
 *
 * Benefits:
 * - Single chrome.runtime.onMessage listener for the entire app
 * - Type-safe message subscriptions via custom hooks
 * - Automatic cleanup on component unmount
 * - Consolidates duplicate listeners across features
 */

import React, { createContext, useContext, useEffect, useRef, ReactNode, useCallback } from 'react';
import { chromeService } from '../../services/ChromeService';
import type { ExtensionMessage } from '../../types/messages';

// Type for message handlers
type MessageHandler<T = ExtensionMessage> = (message: T) => void;

// Type for subscriber map
type SubscriberMap = Map<string, Set<MessageHandler>>;

interface MessageBusContextValue {
  /**
   * Subscribe to messages of a specific type
   * Returns cleanup function
   */
  subscribe: <T extends ExtensionMessage>(
    messageType: string,
    handler: MessageHandler<T>
  ) => () => void;

  /**
   * Subscribe to multiple message types with the same handler
   * Returns cleanup function
   */
  subscribeMultiple: <T extends ExtensionMessage>(
    messageTypes: string[],
    handler: MessageHandler<T>
  ) => () => void;
}

const MessageBusContext = createContext<MessageBusContextValue | null>(null);

interface MessageBusProviderProps {
  children: ReactNode;
}

/**
 * MessageBusProvider - Sets up centralized message listener
 *
 * Usage:
 * ```tsx
 * <MessageBusProvider>
 *   <App />
 * </MessageBusProvider>
 * ```
 */
export const MessageBusProvider: React.FC<MessageBusProviderProps> = ({ children }) => {
  // Map of message types to their subscribers
  const subscribersRef = useRef<SubscriberMap>(new Map());

  // Set up single message listener on mount
  useEffect(() => {
    const cleanup = chromeService.onMessage((message: ExtensionMessage) => {
      if (!message || typeof message !== 'object' || !('type' in message)) {
        return;
      }

      const messageType = message.type;
      const handlers = subscribersRef.current.get(messageType);

      if (handlers && handlers.size > 0) {
        // Dispatch to all subscribers for this message type
        handlers.forEach((handler) => {
          try {
            handler(message);
          } catch (error) {
            console.error(`[MessageBusContext] Handler error for ${messageType}:`, error);
          }
        });
      }
    });

    console.log('[MessageBusContext] Message listener initialized');

    // Cleanup on unmount
    return () => {
      cleanup();
      console.log('[MessageBusContext] Message listener cleaned up');
    };
  }, []);

  /**
   * Subscribe to a specific message type
   */
  const subscribe = useCallback(<T extends ExtensionMessage>(
    messageType: string,
    handler: MessageHandler<T>
  ): (() => void) => {
    const subscribers = subscribersRef.current;

    // Get or create handler set for this message type
    if (!subscribers.has(messageType)) {
      subscribers.set(messageType, new Set());
    }

    const handlerSet = subscribers.get(messageType)!;
    handlerSet.add(handler as MessageHandler);

    console.log(`[MessageBusContext] Subscribed to ${messageType} (${handlerSet.size} total)`);

    // Return cleanup function
    return () => {
      handlerSet.delete(handler as MessageHandler);
      console.log(`[MessageBusContext] Unsubscribed from ${messageType} (${handlerSet.size} remaining)`);

      // Clean up empty sets
      if (handlerSet.size === 0) {
        subscribers.delete(messageType);
      }
    };
  }, []);

  /**
   * Subscribe to multiple message types with the same handler
   */
  const subscribeMultiple = useCallback(<T extends ExtensionMessage>(
    messageTypes: string[],
    handler: MessageHandler<T>
  ): (() => void) => {
    const cleanups = messageTypes.map((type) => subscribe(type, handler));

    // Return combined cleanup function
    return () => {
      cleanups.forEach((cleanup) => cleanup());
    };
  }, [subscribe]);

  const value: MessageBusContextValue = {
    subscribe,
    subscribeMultiple,
  };

  return (
    <MessageBusContext.Provider value={value}>
      {children}
    </MessageBusContext.Provider>
  );
};

/**
 * Hook to access MessageBusContext
 */
function useMessageBusContext(): MessageBusContextValue {
  const context = useContext(MessageBusContext);
  if (!context) {
    throw new Error('useMessageBusContext must be used within MessageBusProvider');
  }
  return context;
}

/**
 * Hook to subscribe to a specific message type
 *
 * Usage:
 * ```tsx
 * useMessageSubscription('SORT_COMPLETE', (message) => {
 *   console.log('Sort completed!', message);
 * });
 * ```
 *
 * @param messageType - The message type to listen for
 * @param handler - Callback function when message is received
 * @param deps - Dependency array (like useEffect deps)
 */
export function useMessageSubscription<T extends ExtensionMessage>(
  messageType: string,
  handler: MessageHandler<T>,
  deps: React.DependencyList = []
): void {
  const { subscribe } = useMessageBusContext();

  useEffect(() => {
    const cleanup = subscribe(messageType, handler);
    return cleanup;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messageType, subscribe, ...deps]);
}

/**
 * Hook to subscribe to multiple message types
 *
 * Usage:
 * ```tsx
 * useMessageSubscriptionMultiple(
 *   ['PAGINATION_PROGRESS', 'SORTING_START'],
 *   (message) => {
 *     if (message.type === 'PAGINATION_PROGRESS') {
 *       // Handle pagination
 *     } else if (message.type === 'SORTING_START') {
 *       // Handle sort start
 *     }
 *   }
 * );
 * ```
 *
 * @param messageTypes - Array of message types to listen for
 * @param handler - Callback function when any message is received
 * @param deps - Dependency array (like useEffect deps)
 */
export function useMessageSubscriptionMultiple<T extends ExtensionMessage>(
  messageTypes: string[],
  handler: MessageHandler<T>,
  deps: React.DependencyList = []
): void {
  const { subscribeMultiple } = useMessageBusContext();

  useEffect(() => {
    const cleanup = subscribeMultiple(messageTypes, handler);
    return cleanup;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subscribeMultiple, ...deps]);
}

/**
 * Hook to access the ChromeService directly
 *
 * Usage:
 * ```tsx
 * const chrome = useChromeService();
 * const sortResult = await chrome.sendSortRequest(tabId, config);
 * ```
 */
export function useChromeService() {
  return chromeService;
}
