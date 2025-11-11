import { useMemo, useState } from "react";
import type { Orbit } from "./use-orbit-layout";

export interface OrbitFilters {
  role: string | null;
  visibility: string | null;
}

/**
 * Hook for managing orbit search and filters
 * Provides filtered orbits based on search query and filter criteria
 */
export function useOrbitFilters(orbits: Orbit[]) {
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string | null>(null);
  const [visibilityFilter, setVisibilityFilter] = useState<string | null>(null);

  const filteredOrbits = useMemo(() => {
    return orbits.filter((orbit) => {
      // Search by title
      if (searchQuery && !orbit.title.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }

      // Filter by role
      if (roleFilter && orbit.role !== roleFilter) {
        return false;
      }

      // Filter by visibility
      if (visibilityFilter && orbit.visibility !== visibilityFilter) {
        return false;
      }

      return true;
    });
  }, [orbits, searchQuery, roleFilter, visibilityFilter]);

  const resetFilters = () => {
    setSearchQuery("");
    setRoleFilter(null);
    setVisibilityFilter(null);
  };

  return {
    searchQuery,
    setSearchQuery,
    roleFilter,
    setRoleFilter,
    visibilityFilter,
    setVisibilityFilter,
    filteredOrbits,
    resetFilters,
    hasActiveFilters: !!(searchQuery || roleFilter || visibilityFilter),
  };
}
