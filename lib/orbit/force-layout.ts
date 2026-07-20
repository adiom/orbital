import {
  forceCenter,
  forceCollide,
  forceLink,
  forceManyBody,
  forceSimulation,
  forceX,
  forceY,
  type SimulationLinkDatum,
  type SimulationNodeDatum,
} from "d3-force";

export type ForceLayoutOptions = {
  width: number;
  height: number;
  nodeRadius?: number;
  iterations?: number;
  linkDistance?: number;
  chargeStrength?: number;
  /** Seed positions (e.g. persisted coords) so the sim drifts instead of teleporting. */
  existingPositions?: Map<string, { x: number; y: number }>;
  /** Ids whose seeded position is fixed — the sim lays out the rest around them. */
  pinnedIds?: Set<string>;
};

type SimNode = SimulationNodeDatum & { id: string };

/**
 * Compute a force-directed constellation layout for the living map.
 *
 * Runs a synchronous d3-force simulation (no ticking on the main render loop):
 * nodes repel each other, fork links act as springs, a weak center + x/y force
 * keeps the graph from drifting away. Returns top-left corner coordinates for
 * each node (React Flow positions the node by its top-left, so we offset by the
 * node half-size).
 *
 * Pure function — safe to call from any client component. d3-force has no
 * browser-only dependencies, but this is invoked only on the client.
 */
export function computeForceLayout(
  orbits: { id: string }[],
  links: { source: string; target: string }[],
  opts: ForceLayoutOptions
): Map<string, { x: number; y: number }> {
  const result = new Map<string, { x: number; y: number }>();
  if (orbits.length === 0) return result;

  const {
    width,
    height,
    nodeRadius = 150,
    linkDistance = 260,
    chargeStrength = -1400,
    existingPositions,
    pinnedIds,
  } = opts;

  // Scale iterations down a touch on very large graphs to keep it snappy.
  const iterations =
    opts.iterations ?? (orbits.length > 120 ? 220 : 320);

  const cx = width / 2;
  const cy = height / 2;

  const nodes: SimNode[] = orbits.map((o, index) => {
    const seed = existingPositions?.get(o.id);
    // Deterministic spiral spread for unseeded nodes (no Math.random for SSR-safety).
    const angle = index * 2.399_963; // golden angle
    const radius = 40 + Math.sqrt(index) * 60;
    const x = seed?.x ?? cx + Math.cos(angle) * radius;
    const y = seed?.y ?? cy + Math.sin(angle) * radius;
    const node: SimNode = { id: o.id, x, y };
    // Pin persisted nodes so the sim only rearranges the newcomers.
    if (pinnedIds?.has(o.id)) {
      node.fx = x;
      node.fy = y;
    }
    return node;
  });

  const nodeById = new Map(nodes.map((n) => [n.id, n]));

  const simLinks: SimulationLinkDatum<SimNode>[] = links
    .filter((l) => nodeById.has(l.source) && nodeById.has(l.target))
    .map((l) => ({
      source: nodeById.get(l.source) as SimNode,
      target: nodeById.get(l.target) as SimNode,
    }));

  const simulation = forceSimulation<SimNode>(nodes)
    .force("charge", forceManyBody().strength(chargeStrength))
    .force(
      "link",
      forceLink<SimNode, SimulationLinkDatum<SimNode>>(simLinks)
        .id((n) => n.id)
        .distance(linkDistance)
        .strength(0.55)
    )
    .force("center", forceCenter(cx, cy))
    .force("collide", forceCollide(nodeRadius).strength(0.9))
    .force("x", forceX(cx).strength(0.04))
    .force("y", forceY(cy).strength(0.04))
    .stop();

  for (let i = 0; i < iterations; i++) {
    simulation.tick();
  }

  for (const n of nodes) {
    result.set(n.id, { x: n.x ?? cx, y: n.y ?? cy });
  }

  return result;
}
