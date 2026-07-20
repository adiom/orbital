/**
 * Group orbits into connected clusters using union-find over fork relationships.
 * Each orbit maps to a stable cluster index; disconnected orbits get their own
 * singleton cluster. Used to tint background regions on the living map.
 */
export function findClusters(
  orbitIds: string[],
  rels: { parentSferaId: string; forkedSferaId: string }[]
): Map<string, number> {
  const parent = new Map<string, string>();
  for (const id of orbitIds) parent.set(id, id);

  const find = (x: string): string => {
    let root = x;
    while (parent.get(root) !== root) {
      root = parent.get(root) as string;
    }
    // Path compression.
    let cur = x;
    while (parent.get(cur) !== root) {
      const next = parent.get(cur) as string;
      parent.set(cur, root);
      cur = next;
    }
    return root;
  };

  const union = (a: string, b: string) => {
    const ra = find(a);
    const rb = find(b);
    if (ra !== rb) parent.set(ra, rb);
  };

  for (const r of rels) {
    if (parent.has(r.parentSferaId) && parent.has(r.forkedSferaId)) {
      union(r.parentSferaId, r.forkedSferaId);
    }
  }

  const rootToIndex = new Map<string, number>();
  let next = 0;
  const result = new Map<string, number>();
  for (const id of orbitIds) {
    const root = find(id);
    let idx = rootToIndex.get(root);
    if (idx === undefined) {
      idx = next++;
      rootToIndex.set(root, idx);
    }
    result.set(id, idx);
  }

  return result;
}

/** Soft pastel background color for a cluster index. */
export function clusterBackground(clusterId: number): string {
  const hue = (clusterId * 47) % 360;
  return `hsl(${hue}, 32%, 88%)`;
}

/** Slightly stronger border color for a cluster index. */
export function clusterBorder(clusterId: number): string {
  const hue = (clusterId * 47) % 360;
  return `hsl(${hue}, 40%, 74%)`;
}
