// lib/hooks.ts
"use client";

import { useEffect, useState } from "react";

/**
 * Hydration-safe state.
 * - Renders a stable `fallback` on the server and first client render.
 * - After mount, it calls `get()` (if provided) and updates the state once.
 * - Returns [value, setValue, mounted].
 */
export function useHydratedState<T>(
  fallback: T,
  get?: () => T
): [T, React.Dispatch<React.SetStateAction<T>>, boolean] {
  const [value, setValue] = useState<T>(fallback);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (!get) return;
    try {
      const v = get();
      // Avoid setting undefined/null accidentally
      if (v !== undefined && v !== null) setValue(v);
    } catch {
      // no-op
    }
  }, []);

  return [value, setValue, mounted];
}
