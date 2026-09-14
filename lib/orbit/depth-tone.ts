/**
 * Depth-of-conversation tone for the living map.
 *
 * Color encodes how much life a conversation has accumulated (message count
 * tiers), and the card label spells the same number out — hue and text tell
 * one story. Recency stays a separate micro-signal (the emerald sparkle on
 * cards that woke up in the last 12h).
 */

export type DepthTier = "empty" | "spark" | "living" | "deep" | "profound";

/** Message-count tiers: each step up the palette adds a deeper hue. */
export function getDepthTier(messageCount: number): DepthTier {
  if (messageCount <= 0) return "empty";
  if (messageCount <= 10) return "spark";
  if (messageCount <= 40) return "living";
  if (messageCount <= 100) return "deep";
  return "profound";
}

export type DepthTone = {
  /** Soft outer glow color (box-shadow). */
  glow: string;
  /** Tailwind gradient stops for the blurred ring behind the card. */
  ring: string;
  /** Tailwind bg class for the status dot. */
  dot: string;
};

const DEPTH_TONES: Record<DepthTier, DepthTone> = {
  empty: {
    glow: "rgba(148,163,184,0.16)",
    ring: "from-stone-300/50 via-stone-200/20 to-transparent",
    dot: "bg-stone-300",
  },
  spark: {
    glow: "rgba(96,165,250,0.22)",
    ring: "from-sky-300/70 via-blue-200/30 to-transparent",
    dot: "bg-sky-400",
  },
  living: {
    glow: "rgba(16,185,129,0.24)",
    ring: "from-emerald-300/80 via-teal-200/30 to-transparent",
    dot: "bg-emerald-400",
  },
  deep: {
    glow: "rgba(168,85,247,0.20)",
    ring: "from-violet-300/70 via-fuchsia-200/25 to-transparent",
    dot: "bg-violet-400",
  },
  profound: {
    glow: "rgba(251,191,36,0.22)",
    ring: "from-amber-300/80 via-amber-200/30 to-transparent",
    dot: "bg-amber-400",
  },
};

export function getDepthTone(tier: DepthTier): DepthTone {
  return DEPTH_TONES[tier];
}

/** RGB triple (no parens) for edge strokes / drop-shadows. */
const DEPTH_RGB: Record<DepthTier, string> = {
  empty: "148,163,184",
  spark: "56,189,248",
  living: "52,211,153",
  deep: "167,139,250",
  profound: "251,191,36",
};

export function getDepthRgb(tier: DepthTier): string {
  return DEPTH_RGB[tier];
}

/** "пусто" / "1 сообщение" / "3 сообщения" / "12 сообщений". */
export function formatMessageCount(count: number): string {
  if (count <= 0) return "пусто";
  const mod10 = count % 10;
  const mod100 = count % 100;
  let word = "сообщений";
  if (mod10 === 1 && mod100 !== 11) {
    word = "сообщение";
  } else if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) {
    word = "сообщения";
  }
  return `${count} ${word}`;
}
