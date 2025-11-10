/**
 * Throttles a function to execute at most once per wait period.
 * Guarantees the last call will execute after the wait period.
 *
 * @param func - Function to throttle
 * @param wait - Minimum time between executions (ms)
 * @returns Throttled function
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  let lastArgs: Parameters<T> | null = null;
  let lastCallTime = 0;

  return function throttled(...args: Parameters<T>) {
    const now = Date.now();
    lastArgs = args;

    // If enough time has passed, execute immediately
    if (now - lastCallTime >= wait) {
      lastCallTime = now;
      func(...args);
      lastArgs = null;
      return;
    }

    // Otherwise, schedule for later (and cancel previous schedule)
    if (timeout !== null) {
      clearTimeout(timeout);
    }

    timeout = setTimeout(() => {
      timeout = null;
      lastCallTime = Date.now();
      if (lastArgs) {
        func(...lastArgs);
        lastArgs = null;
      }
    }, wait - (now - lastCallTime));
  };
}
