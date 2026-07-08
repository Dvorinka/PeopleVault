import * as React from "react";

/**
 * Debounce a fast-changing value (e.g. a search input).
 * Returns the debounced value after `delayMs` of no changes.
 */
export function useDebouncedValue<T>(value: T, delayMs = 300): T {
  const [debounced, setDebounced] = React.useState<T>(value);
  React.useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(id);
  }, [value, delayMs]);
  return debounced;
}
