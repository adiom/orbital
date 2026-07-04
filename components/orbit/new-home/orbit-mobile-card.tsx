"use client";

import { GitBranch, Settings, Sparkles, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type LifeState = "born" | "alive" | "settled" | "quiet";

type OrbitMobileCardProps = {
  orbit: {
    id: string;
    title: string;
    description: string | null;
    visibility: string;
    messageCount?: number;
    memberCount?: number;
    lastMessageAt?: Date | null;
    updatedAt: Date;
    createdAt: Date;
    recentParticipants?: Array<{
      id: string;
      name: string;
      image?: string | null;
    }>;
  };
  childCount: number;
  density: number;
  lifeState: LifeState;
  activityLabel: string;
  isFork?: boolean;
  isOwner?: boolean;
  onOpen: () => void;
  onSettingsClick?: () => void;
  onDeleteClick?: () => void;
};

function getLifeTone(lifeState: LifeState) {
  if (lifeState === "born") {
    return {
      glow: "rgba(96,165,250,0.22)",
      ring: "from-sky-300/70 via-blue-200/30 to-transparent",
      dot: "bg-sky-400",
      label: "родилось",
    };
  }
  if (lifeState === "alive") {
    return {
      glow: "rgba(16,185,129,0.24)",
      ring: "from-emerald-300/80 via-teal-200/30 to-transparent",
      dot: "bg-emerald-400",
      label: "живет",
    };
  }
  if (lifeState === "settled") {
    return {
      glow: "rgba(168,85,247,0.20)",
      ring: "from-violet-300/70 via-fuchsia-200/25 to-transparent",
      dot: "bg-violet-400",
      label: "созревает",
    };
  }
  return {
    glow: "rgba(148,163,184,0.16)",
    ring: "from-stone-300/50 via-stone-200/20 to-transparent",
    dot: "bg-stone-300",
    label: "тихо",
  };
}

function getDisplayDescription(description: string | null) {
  if (!description) return "Смысл еще формируется";
  return description
    .replace(/^Forked from:\s*/i, "Продолжение: ")
    .replace(/^Forked from Sfera\s*/i, "Продолжение: ");
}

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export function OrbitMobileCard({
  orbit,
  childCount,
  density,
  lifeState,
  activityLabel,
  isFork = false,
  isOwner = false,
  onOpen,
  onSettingsClick,
  onDeleteClick,
}: OrbitMobileCardProps) {
  const tone = getLifeTone(lifeState);
  const displayDescription = getDisplayDescription(orbit.description);

  if (isFork) {
    return (
      <button
        className={cn(
          "flex w-full shrink-0 items-center gap-3 rounded-[20px] bg-white/65 p-3 text-left backdrop-blur-xl transition-all active:scale-[0.98]",
          "ring-1 ring-white/60"
        )}
        onClick={onOpen}
        type="button"
        style={{
          boxShadow: `0 16px 40px rgba(15, 23, 42, 0.08), 0 0 28px ${tone.glow}`,
        }}
      >
        <span className={cn("h-2 w-2 shrink-0 rounded-full", tone.dot)} />
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-medium text-[13px] text-neutral-900 leading-tight">
            {orbit.title}
          </h3>
          {orbit.messageCount && orbit.messageCount > 0 && (
            <p className="mt-0.5 text-[10px] text-neutral-400">
              {orbit.messageCount} сообщений
            </p>
          )}
        </div>
        <GitBranch className="h-3 w-3 shrink-0 text-neutral-300" />
      </button>
    );
  }

  return (
    <div
      className={cn(
        "flex w-full flex-col rounded-[28px] bg-white/72 p-5 backdrop-blur-2xl",
        "ring-1 ring-white/70"
      )}
      style={{
        boxShadow: `0 22px 54px rgba(15, 23, 42, 0.10), 0 0 42px ${tone.glow}`,
      }}
    >
      {/* Glow ring */}
      <div
        className={cn(
          "pointer-events-none absolute -inset-4 -z-10 rounded-[36px] bg-gradient-to-br opacity-70 blur-xl",
          tone.ring
        )}
      />

      {/* Top highlight */}
      <div className="pointer-events-none absolute inset-x-5 top-0 h-px bg-gradient-to-r from-transparent via-white to-transparent" />

      {/* Header: life state + fork count */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={cn("h-2.5 w-2.5 rounded-full", tone.dot)} />
          <span className="text-[10px] uppercase tracking-[0.2em] text-neutral-400">
            {tone.label}
          </span>
        </div>
        {childCount > 0 && (
          <div className="flex items-center gap-1 rounded-full bg-white/70 px-2 py-1 text-[10px] text-neutral-500 shadow-sm">
            <GitBranch className="h-3 w-3" />
            {childCount}
          </div>
        )}
      </div>

      {/* Title */}
      <h2 className="mt-4 font-medium text-xl leading-tight text-neutral-950 tracking-[-0.01em]">
        {orbit.title}
      </h2>

      {/* Description */}
      <p className="mt-2 text-[13px] leading-snug text-neutral-500 line-clamp-2">
        {displayDescription}
      </p>

      {/* Stats, badges + participants */}
      <div className="mt-3 flex items-end justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            {orbit.description && (
              <span className="rounded-full bg-white/70 px-2 py-1 text-[10px] text-neutral-500 shadow-sm">
                суть есть
              </span>
            )}
            {childCount > 0 && (
              <span className="rounded-full bg-white/70 px-2 py-1 text-[10px] text-neutral-500 shadow-sm">
                растет
              </span>
            )}
            {orbit.visibility === "private" && (
              <span className="rounded-full bg-white/70 px-2 py-1 text-[10px] text-neutral-500 shadow-sm">
                личное
              </span>
            )}
          </div>
        </div>
        {orbit.recentParticipants && orbit.recentParticipants.length > 0 && (
          <div className="flex shrink-0 -space-x-2">
            {orbit.recentParticipants.slice(0, 3).map((participant) => (
              <div
                className="flex h-6 w-6 items-center justify-center rounded-full border border-white bg-neutral-900 text-[9px] font-medium text-white shadow-sm"
                key={participant.id}
              >
                {getInitials(participant.name)}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Density bar */}
      <div className="mt-auto pt-4">
        <div className="h-1 overflow-hidden rounded-full bg-neutral-100/80">
          <div
            className="h-full rounded-full bg-gradient-to-r from-sky-300 via-emerald-300 to-violet-300 transition-all duration-700"
            style={{ width: `${Math.max(18, density * 100)}%` }}
          />
        </div>
        <p className="mt-2 text-[10px] text-neutral-400">
          {activityLabel}
        </p>
      </div>

      {/* Action bar — always visible on mobile */}
      <div className="mt-4 flex items-center justify-between border-white/60 border-t pt-3">
        <button
          className="flex items-center gap-1.5 text-[11px] text-neutral-500 transition-colors hover:text-neutral-700"
          onClick={onOpen}
          type="button"
        >
          <Sparkles className="h-3.5 w-3.5" />
          Открыть
        </button>
        {isOwner && (
          <div className="flex items-center gap-1">
            <Button
              className="h-7 w-7 rounded-full bg-white/60 text-neutral-400 hover:bg-white hover:text-neutral-700"
              onClick={(e) => {
                e.stopPropagation();
                onSettingsClick?.();
              }}
              size="icon"
              variant="ghost"
            >
              <Settings className="h-3.5 w-3.5" />
            </Button>
            <Button
              className="h-7 w-7 rounded-full bg-white/60 text-neutral-300 hover:bg-red-50 hover:text-red-500"
              onClick={(e) => {
                e.stopPropagation();
                onDeleteClick?.();
              }}
              size="icon"
              variant="ghost"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
