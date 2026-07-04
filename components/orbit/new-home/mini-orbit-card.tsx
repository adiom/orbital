"use client";

import { cn } from "@/lib/utils";

type MiniOrbitCardProps = {
  title?: string;
  description?: string;
  lifeState?: "born" | "alive" | "settled" | "quiet";
  className?: string;
};

const LIFE_STATES = {
  born: {
    glow: "rgba(96,165,250,0.28)",
    ring: "from-sky-300/70 via-blue-200/30 to-transparent",
    dot: "bg-sky-400",
    dotShadow: "shadow-[0_0_14px_rgba(56,189,248,0.5)]",
  },
  alive: {
    glow: "rgba(16,185,129,0.30)",
    ring: "from-emerald-300/80 via-teal-200/30 to-transparent",
    dot: "bg-emerald-400",
    dotShadow: "shadow-[0_0_16px_rgba(52,211,153,0.55)]",
  },
  settled: {
    glow: "rgba(168,85,247,0.26)",
    ring: "from-violet-300/70 via-fuchsia-200/25 to-transparent",
    dot: "bg-violet-400",
    dotShadow: "shadow-[0_0_14px_rgba(167,139,250,0.5)]",
  },
  quiet: {
    glow: "rgba(148,163,184,0.20)",
    ring: "from-stone-300/50 via-stone-200/20 to-transparent",
    dot: "bg-stone-300",
    dotShadow: "",
  },
};

export function MiniOrbitCard({
  title = "Новая мысль",
  description,
  lifeState = "born",
  className,
}: MiniOrbitCardProps) {
  const tone = LIFE_STATES[lifeState];

  return (
    <div className={cn("relative select-none", className)}>
      {/* Outer glow ring */}
      <div
        className={cn(
          "pointer-events-none absolute -inset-3 rounded-[24px] bg-gradient-to-b opacity-60 blur-lg",
          tone.ring
        )}
      />

      {/* Card */}
      <div
        className="relative overflow-hidden rounded-[20px] border border-white/60 bg-white/70 p-4 shadow-[0_20px_60px_rgba(15,23,42,0.10),0_0_30px_rgba(15,23,42,0.06)] backdrop-blur-xl"
        style={{
          boxShadow: `0 20px 60px rgba(15,23,42,0.10), 0 0 30px ${tone.glow}`,
        }}
      >
        {/* Top highlight line */}
        <div className="pointer-events-none absolute inset-x-4 top-0 h-px bg-gradient-to-r from-transparent via-white to-transparent" />

        {/* Status dot */}
        <div className="mb-3 flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span
              className={cn(
                "absolute inline-flex h-full w-full rounded-full opacity-60",
                lifeState === "alive" && "animate-ping",
                tone.dot
              )}
            />
            <span
              className={cn(
                "relative inline-flex h-2 w-2 rounded-full",
                tone.dot,
                tone.dotShadow
              )}
            />
          </span>
          <span className="text-[10px] font-medium uppercase tracking-[0.2em] text-neutral-400">
            {lifeState === "born" && "рождается"}
            {lifeState === "alive" && "живёт"}
            {lifeState === "settled" && "созревает"}
            {lifeState === "quiet" && "тихо"}
          </span>
        </div>

        {/* Title */}
        <h3 className="mb-1 line-clamp-2 text-[15px] font-medium leading-tight tracking-[-0.01em] text-neutral-950">
          {title}
        </h3>

        {/* Description */}
        {description && (
          <p className="mb-3 line-clamp-1 text-[11px] leading-snug text-neutral-500">
            {description}
          </p>
        )}

        {/* Density bar */}
        <div className="mt-3 h-1 overflow-hidden rounded-full bg-neutral-100/80">
          <div
            className="h-full rounded-full bg-gradient-to-r from-sky-300 via-emerald-300 to-violet-300"
            style={{ width: "18%" }}
          />
        </div>
      </div>
    </div>
  );
}
