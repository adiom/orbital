import { useMemo } from "react";

export type Orbit = {
  id: string;
  title: string;
  description: string | null;
  visibility: string;
  role: string;
  createdAt: Date;
  updatedAt: Date;
  ownerId: string;
};

export type ForkRelationship = {
  parentSferaId: string;
  forkedSferaId: string;
  createdAt: Date;
};

export type NodePosition = {
  x: number;
  y: number;
  id: string;
};

/**
 * Hook for calculating orbit positions in graph layout
 * Uses hierarchical tree layout or circular layout depending on relationships
 */
export function useOrbitLayout(
  orbits: Orbit[],
  forkRelationships: ForkRelationship[],
  containerWidth?: number,
  containerHeight?: number
) {
  const nodePositions = useMemo(() => {
    if (orbits.length === 0) {
      return new Map<string, NodePosition>();
    }

    const positions = new Map<string, NodePosition>();
    const width = containerWidth || window.innerWidth - 64;
    const height = containerHeight || window.innerHeight - 200;

    // Build parent-child relationship maps
    const childrenMap = new Map<string, string[]>();
    const parentMap = new Map<string, string>();

    for (const rel of forkRelationships) {
      if (!childrenMap.has(rel.parentSferaId)) {
        childrenMap.set(rel.parentSferaId, []);
      }
      childrenMap.get(rel.parentSferaId)?.push(rel.forkedSferaId);
      parentMap.set(rel.forkedSferaId, rel.parentSferaId);
    }

    const roots = orbits.filter((o) => !parentMap.has(o.id));

    // Circular layout (no fork relationships)
    if (roots.length === 0 && orbits.length > 0) {
      for (let index = 0; index < orbits.length; index++) {
        const orbit = orbits[index];
        const angle = (index / orbits.length) * 2 * Math.PI;
        const radius = Math.min(width, height) * 0.35;
        positions.set(orbit.id, {
          id: orbit.id,
          x: width / 2 + radius * Math.cos(angle),
          y: height / 2 + radius * Math.sin(angle),
        });
      }
      return positions;
    }

    // Hierarchical tree layout
    const levels = new Map<string, number>();
    const getLevel = (id: string): number => {
      const cachedLevel = levels.get(id);
      if (cachedLevel !== undefined) {
        return cachedLevel;
      }
      const parent = parentMap.get(id);
      const level = parent ? getLevel(parent) + 1 : 0;
      levels.set(id, level);
      return level;
    };

    // Calculate levels for all orbits
    for (const o of orbits) {
      getLevel(o.id);
    }
    const maxLevel = Math.max(...Array.from(levels.values()), 0);

    // Group orbits by level
    const levelGroups = new Map<number, string[]>();
    for (const o of orbits) {
      const level = levels.get(o.id) || 0;
      if (!levelGroups.has(level)) {
        levelGroups.set(level, []);
      }
      levelGroups.get(level)?.push(o.id);
    }

    // Position orbits within each level
    for (const [level, ids] of levelGroups) {
      const y = maxLevel > 0
        ? (level / maxLevel) * (height - 100) + 50
        : height / 2;

      for (let index = 0; index < ids.length; index++) {
        const id = ids[index];
        const x = ((index + 1) / (ids.length + 1)) * width;
        positions.set(id, { id, x, y });
      }
    }

    return positions;
  }, [orbits, forkRelationships, containerWidth, containerHeight]);

  return { nodePositions };
}
