import { cn } from "@/lib/utils";

export type LifeState = "born" | "alive" | "settled" | "quiet";

export const LIFE_STROKE: Record<LifeState, string> = {
  born: "#38BDF8",
  alive: "#34D399",
  settled: "#A78BFA",
  quiet: "#D6D3D1",
};

export const LIFE_LABEL: Record<LifeState, string> = {
  born: "родилась",
  alive: "живёт",
  settled: "созревает",
  quiet: "тихо",
};

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function daysSince(value?: string | Date | null): number | null {
  if (!value) {
    return null;
  }
  const then = new Date(value).getTime();
  if (Number.isNaN(then)) {
    return null;
  }
  return Math.floor((Date.now() - then) / MS_PER_DAY);
}

/**
 * Life state from last activity, mirroring the living map:
 * never active but new -> born, <2d alive, <7d settled, otherwise quiet.
 */
export function lifeState(
  lastSeen?: string | Date | null,
  createdAt?: string | Date | null
): LifeState {
  const seen = daysSince(lastSeen);

  if (seen === null) {
    const age = daysSince(createdAt);
    return age !== null && age < 2 ? "born" : "quiet";
  }
  if (seen < 2) {
    return "alive";
  }
  if (seen < 7) {
    return "settled";
  }
  return "quiet";
}

export function LifeDot({
  state,
  className,
}: {
  state: LifeState;
  className?: string;
}) {
  return (
    <span
      aria-hidden="true"
      className={cn("inline-block h-1.5 w-1.5 shrink-0 rounded-full", className)}
      style={{
        backgroundColor: LIFE_STROKE[state],
        boxShadow:
          state === "alive" ? "0 0 10px rgba(16,185,129,0.55)" : undefined,
      }}
    />
  );
}

export function LifeLabel({
  state,
  className,
}: {
  state: LifeState;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "text-[10px] uppercase tracking-[0.2em] text-neutral-400",
        className
      )}
    >
      {LIFE_LABEL[state]}
    </span>
  );
}
