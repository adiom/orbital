import { useEffect, useState } from "react";

export type ViewMode = "graph" | "list" | "grid";

const STORAGE_KEY = "orbit-view-mode";

/**
 * Hook for managing view mode preference
 * Persists selection in localStorage
 */
export function useOrbitViewMode(defaultMode: ViewMode = "graph"): {
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
} {
  const [viewMode, setViewModeState] = useState<ViewMode>(defaultMode);

  // Load from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as ViewMode | null;
    if (stored && ["graph", "list", "grid"].includes(stored)) {
      setViewModeState(stored);
    }
  }, []);

  const setViewMode = (mode: ViewMode) => {
    setViewModeState(mode);
    localStorage.setItem(STORAGE_KEY, mode);
  };

  return { viewMode, setViewMode };
}
