"use client";

import { useEffect, useState } from "react";

/**
 * Returns `undefined` until the viewport has been measured client-side,
 * then `true`/`false`. Consumers that need a plain boolean (and are fine
 * defaulting to "not mobile" before mount) can coerce with `!!isMobile`;
 * consumers that need to avoid a hydration-mismatch flash should branch
 * on the `undefined` case instead.
 */
export function useIsMobile(breakpoint = 768) {
  const [isMobile, setIsMobile] = useState<boolean | undefined>(undefined);

  useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${breakpoint - 1}px)`);
    setIsMobile(mql.matches);

    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, [breakpoint]);

  return isMobile;
}
