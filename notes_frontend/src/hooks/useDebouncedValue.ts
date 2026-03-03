"use client";

import { useEffect, useState } from "react";

// PUBLIC_INTERFACE
export function useDebouncedValue<T>(value: T, delayMs: number): T {
  /** Returns a debounced version of `value` that updates after `delayMs` of inactivity. */
  const [debounced, setDebounced] = useState<T>(value);

  useEffect(() => {
    const t = window.setTimeout(() => setDebounced(value), delayMs);
    return () => window.clearTimeout(t);
  }, [value, delayMs]);

  return debounced;
}
