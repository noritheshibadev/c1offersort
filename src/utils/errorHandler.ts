/**
 * Shared error handling utilities for Chrome extension operations
 */

/**
 * Checks if an error is a Chrome extension connection error
 */
export function isConnectionError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  return (
    error.message.includes('Could not establish connection') ||
    error.message.includes('Receiving end does not exist')
  );
}

/**
 * Extracts a user-friendly error message from an error object
 * @param error - The error to process
 * @param fallbackMessage - Default message if error cannot be parsed
 * @returns User-friendly error message
 */
export function getUserFriendlyErrorMessage(
  error: unknown,
  fallbackMessage: string = 'Operation failed'
): string {
  if (isConnectionError(error)) {
    return 'Please refresh the Capital One page and try again';
  }

  if (error instanceof Error) {
    return error.message;
  }

  return fallbackMessage;
}
