import "@testing-library/jest-dom/vitest";
import { vi } from "vitest";

type MessageListener = (
  message: any,
  sender: chrome.runtime.MessageSender,
  sendResponse: (response?: any) => void
) => void;

const messageListeners = new Set<MessageListener>();

globalThis.chrome = {
  runtime: {
    id: 'test-extension-id',
    onMessage: {
      addListener: (listener: MessageListener) => {
        messageListeners.add(listener);
      },
      removeListener: (listener: MessageListener) => {
        messageListeners.delete(listener);
      },
      callListeners: (message: any, sender: chrome.runtime.MessageSender, sendResponse: (response?: any) => void) => {
        messageListeners.forEach(listener => listener(message, sender, sendResponse));
      },
    },
    sendMessage: vi.fn().mockResolvedValue({}),
  },
  storage: {
    local: {
      get: vi.fn(() => Promise.resolve({})),
      set: vi.fn(() => Promise.resolve()),
      remove: vi.fn(() => Promise.resolve()),
      clear: vi.fn(() => Promise.resolve()),
    },
  },
  tabs: {
    query: vi.fn().mockResolvedValue([{ id: 1, url: 'https://capitaloneoffers.com/feed' }]),
    sendMessage: vi.fn().mockResolvedValue({ isActive: false }),
  },
  scripting: {
    executeScript: vi.fn(),
  },
} as any;
