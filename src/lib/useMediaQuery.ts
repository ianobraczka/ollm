"use client";

import * as React from "react";

/**
 * SSR-safe media query hook. Server and first client paint use `ssrValue`
 * (default true) to avoid hydration mismatches; updates after mount.
 */
export function useMediaQuery(query: string, ssrValue = true): boolean {
  const subscribe = React.useCallback(
    (onStoreChange: () => void) => {
      const media = window.matchMedia(query);
      media.addEventListener("change", onStoreChange);
      return () => media.removeEventListener("change", onStoreChange);
    },
    [query],
  );

  const getSnapshot = React.useCallback(() => window.matchMedia(query).matches, [query]);
  const getServerSnapshot = React.useCallback(() => ssrValue, [ssrValue]);

  return React.useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
