/**
 * Shared node sizing for the living map.
 *
 * Card scale is driven by the orbit's data score (messages, forks, density);
 * the same math is needed by the card renderer (visual size) and the force
 * layout (collision radius), so it lives here to stay in sync.
 */

export function getDataScore(
  childCount: number,
  messageCount: number,
  density: number
): number {
  return messageCount + childCount * 8 + density * 10;
}

export function getScale(
  childCount: number,
  density: number,
  messageCount: number
): number {
  const score = getDataScore(childCount, messageCount, density);

  if (score <= 0) return 0.55;
  if (score <= 5) return 0.65;
  if (score <= 12) return 0.78;
  if (score <= 25) return 0.92;
  if (score <= 45) return 1.08;
  if (score <= 70) return 1.22;
  return 1.35;
}

export type NodeSize = { width: number; height: number };

export type NodePresentation = "full" | "compact" | "dot";

/**
 * How an orbit renders on the map: quiet singletons collapse to star dots,
 * low-score orbits to compact cards, the rest to full cards.
 */
export function getOrbitPresentation(
  childCount: number,
  density: number,
  messageCount: number,
  isQuietSingleton: boolean
): NodePresentation {
  if (isQuietSingleton) return "dot";
  return getScale(childCount, density, messageCount) < 0.75
    ? "compact"
    : "full";
}

/** Rendered card size for a given presentation and data score. */
export function getOrbitNodeSize(
  childCount: number,
  density: number,
  messageCount: number,
  presentation: NodePresentation = "full"
): NodeSize {
  if (presentation === "dot") return { width: 16, height: 16 };
  if (presentation === "compact") return { width: 160, height: 72 };

  const scale = getScale(childCount, density, messageCount);
  return { width: 230 * scale, height: 148 * scale };
}

/** Collision radius for the force simulation: half the longest side + air. */
export function getOrbitCollideRadius(
  childCount: number,
  density: number,
  messageCount: number,
  presentation: NodePresentation = "full"
): number {
  const { width, height } = getOrbitNodeSize(
    childCount,
    density,
    messageCount,
    presentation
  );
  const air = presentation === "dot" ? 24 : 40;
  return Math.max(width, height) / 2 + air;
}
