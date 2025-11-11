import { useCallback, useEffect, useState } from "react";
import type { ForkRelationship, Orbit } from "./use-orbit-layout";

export type UseOrbitsReturn = {
  orbits: Orbit[];
  forkRelationships: ForkRelationship[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
};

/**
 * Hook for fetching and managing orbit data
 * Handles loading states and error handling
 */
export function useOrbits(): UseOrbitsReturn {
  const [orbits, setOrbits] = useState<Orbit[]>([]);
  const [forkRelationships, setForkRelationships] = useState<
    ForkRelationship[]
  >([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchOrbits = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch("/api/sfera", {
        credentials: "include",
      });

      if (response.status === 401) {
        window.location.href = `/login?callbackUrl=${encodeURIComponent(
          window.location.pathname
        )}`;
        return;
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to fetch orbits");
      }

      const data = await response.json();
      setOrbits(data.sferas || []);
      setForkRelationships(data.forkRelationships || []);
    } catch (err) {
      console.error("Error fetching orbits:", err);
      setError(
        err instanceof Error ? err : new Error("Failed to fetch orbits")
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrbits();
  }, [fetchOrbits]);

  return {
    orbits,
    forkRelationships,
    isLoading,
    error,
    refetch: fetchOrbits,
  };
}
