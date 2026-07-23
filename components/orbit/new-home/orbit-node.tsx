"use client";

import { Brain, GitBranch, Settings, Sparkles, Trash2 } from "lucide-react";
import { Handle, Position } from "@xyflow/react";
import type { KeyboardEvent } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type OrbitNodeData = {
  id: string;
  title: string;
  description: string | null;
  visibility: string;
  role: string;
  ownerId: string;
  childCount: number;
  messageCount: number;
  createdAt: Date;
  updatedAt: Date;
  activityLabel: string;
  lifeState: "born" | "alive" | "settled" | "quiet";
  density: number;
  isSleeping: boolean;
  recentParticipants?: Array<{
    id: string;
    name: string;
    image?: string | null;
  }>;
  insightBadges?: string[];
  currentUserId?: string;
  dimmed?: boolean;
  onSettingsClick?: () => void;
  onDeleteClick?: () => void;
  onSelectOrbit?: (id: string) => void;
};

type OrbitNodeProps = {
  data: OrbitNodeData;
  selected?: boolean;
};

function getDataScore(childCount: number, messageCount: number, density: number): number {
  return messageCount + childCount * 8 + density * 10;
}

function getScale(childCount: number, density: number, messageCount: number): number {
  const score = getDataScore(childCount, messageCount, density);

  if (score <= 0) return 0.55;
  if (score <= 5) return 0.65;
  if (score <= 12) return 0.78;
  if (score <= 25) return 0.92;
  if (score <= 45) return 1.08;
  if (score <= 70) return 1.22;
  return 1.35;
}

function getLifeTone(lifeState: OrbitNodeData["lifeState"]) {
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

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function getDisplayDescription(description: string | null) {
  if (!description) return "Смысл еще формируется";
  return description
    .replace(/^Forked from:\s*/i, "Продолжение: ")
    .replace(/^Forked from Sfera\s*/i, "Продолжение: ");
}

export function OrbitNode({ data, selected }: OrbitNodeProps) {
  const scale = getScale(data.childCount, data.density, data.messageCount);
  const tone = getLifeTone(data.lifeState);
  const hasParticipants = Boolean(data.recentParticipants?.length);
  const displayDescription = getDisplayDescription(data.description);
  const isCompact = scale < 0.75;

  const handleOrbitClick = () => {
    data.onSelectOrbit?.(data.id);
  };

  const handleOrbitKeyDown = (event: KeyboardEvent) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      handleOrbitClick();
    }
  };

  const nodeAriaLabel = `${data.title} — ${tone.label}`;

  const isOwner = data.currentUserId === data.ownerId;

  if (data.isSleeping) {
    return (
      <div
        className="pointer-events-none rounded-[20px] bg-white/20 opacity-0"
        style={{ width: 100, minHeight: 60 }}
      />
    );
  }

  if (isCompact) {
    return (
      <div
        aria-label={nodeAriaLabel}
        className={cn(
          "pointer-events-auto group relative cursor-grab rounded-[20px] bg-white/65 backdrop-blur-xl transition-opacity active:cursor-grabbing focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400",
          selected
            ? "ring-2 ring-violet-400/80"
            : "ring-1 ring-white/60",
          data.dimmed && "opacity-35"
        )}
        onClick={handleOrbitClick}
        onKeyDown={handleOrbitKeyDown}
        role="button"
        style={{
          width: 160,
          minHeight: 72,
          padding: "10px 14px",
          boxShadow: `0 16px 40px rgba(15, 23, 42, 0.08), 0 0 28px ${tone.glow}`,
        }}
        tabIndex={0}
      >
        <Handle position={Position.Top} type="target" className="!h-0 !w-0 !border-0 !bg-transparent" />

        <div className="flex items-center gap-2">
          <span className={cn("h-2 w-2 shrink-0 rounded-full", tone.dot)} />
          <h3 className="truncate font-medium text-[13px] text-neutral-900 leading-tight">
            {data.title}
          </h3>
        </div>

        {data.childCount > 0 && (
          <div className="mt-2 flex items-center gap-1 text-[9px] text-neutral-400">
            <GitBranch className="h-2.5 w-2.5" />
            {data.childCount}
          </div>
        )}

        <Handle position={Position.Bottom} type="source" className="!h-0 !w-0 !border-0 !bg-transparent" />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "pointer-events-auto group relative cursor-grab rounded-[28px] bg-white/72 px-4 py-3 shadow-[0_24px_80px_rgba(15,23,42,0.10)] backdrop-blur-2xl transition-opacity active:cursor-grabbing",
        selected
          ? "ring-2 ring-violet-400/80"
          : "ring-1 ring-white/70 hover:ring-neutral-200/80",
        data.dimmed && "opacity-35"
      )}
      style={{
        width: 230 * scale,
        minHeight: 148 * scale,
        padding: `${15 * scale}px ${17 * scale}px`,
        boxShadow: selected
          ? `0 22px ${54 * scale}px rgba(15, 23, 42, 0.12), 0 0 0 6px rgba(168,85,247,0.10), 0 0 ${42 * scale}px ${tone.glow}`
          : `0 22px ${54 * scale}px rgba(15, 23, 42, 0.10), 0 0 ${42 * scale}px ${tone.glow}`,
      }}
    >
      {/* Gradient glow ring */}
      <div
        className={cn(
          "pointer-events-none absolute -inset-4 -z-10 rounded-[36px] bg-gradient-to-br opacity-70 blur-xl group-hover:opacity-100",
          tone.ring
        )}
      />
      {/* Top highlight line */}
      <div className="pointer-events-none absolute inset-x-5 top-0 h-px bg-gradient-to-r from-transparent via-white to-transparent" />

      <Handle position={Position.Top} type="target" className="!h-0 !w-0 !border-0 !bg-transparent" />

      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            <span
              className={cn(
                "relative inline-flex h-2.5 w-2.5 rounded-full",
                data.lifeState === "born" && "bg-sky-400",
                data.lifeState === "alive" && "bg-emerald-400",
                data.lifeState === "settled" && "bg-violet-400",
                data.lifeState === "quiet" && "bg-stone-300"
              )}
            />
          </span>
          <span className="font-medium text-[10px] uppercase tracking-[0.2em] text-neutral-400">
            {tone.label}
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-neutral-400">
          {data.insightBadges?.includes("summary") && (
            <Brain className="h-3.5 w-3.5 text-violet-400" />
          )}
          {data.childCount > 0 && (
            <div className="flex items-center gap-1 rounded-full bg-white/70 px-2 py-1 text-[10px] text-neutral-500 shadow-sm">
              <GitBranch className="h-3 w-3" />
              {data.childCount}
            </div>
          )}
        </div>
      </div>

      <button
        aria-label={nodeAriaLabel}
        className="w-full cursor-pointer rounded-xl text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400"
        onClick={handleOrbitClick}
        type="button"
      >
        <h3
          className="mb-2 line-clamp-2 font-medium leading-tight text-neutral-950 tracking-[-0.01em]"
          style={{ fontSize: 16 * scale }}
        >
          {data.title}
        </h3>
        <p
          className="line-clamp-2 leading-snug text-neutral-500"
          style={{ fontSize: 11.5 * scale }}
        >
          {displayDescription}
        </p>
      </button>

      <div className="mt-5 h-1 overflow-hidden rounded-full bg-neutral-100/80">
        <div
          className="h-full rounded-full bg-gradient-to-r from-sky-300 via-emerald-300 to-violet-300"
          style={{ width: `${Math.max(18, data.density * 100)}%` }}
        />
      </div>

      <div className="mt-4 flex items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10.5px] leading-none text-neutral-400">
            {data.activityLabel}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            {data.description && (
              <span className="rounded-full bg-white/70 px-2 py-1 text-[10px] text-neutral-500 shadow-sm">
                суть есть
              </span>
            )}
            {data.childCount > 0 && (
              <span className="rounded-full bg-white/70 px-2 py-1 text-[10px] text-neutral-500 shadow-sm">
                растет
              </span>
            )}
            {data.visibility === "private" && (
              <span className="rounded-full bg-white/70 px-2 py-1 text-[10px] text-neutral-500 shadow-sm">
                личное
              </span>
            )}
          </div>
        </div>

        {hasParticipants && (
          <div className="flex -space-x-2">
            {data.recentParticipants?.slice(0, 3).map((participant) => (
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

      {data.lifeState === "alive" && (
        <div className="pointer-events-none absolute -right-1 top-12 h-2 w-2 rounded-full bg-emerald-300 shadow-[0_0_20px_rgba(16,185,129,0.55)]" />
      )}

      {/* Hover action bar */}
      <div className="mt-4 flex items-center justify-between border-white/60 border-t pt-3 opacity-0 group-hover:opacity-100">
        <div className="flex items-center gap-1.5 text-[10px] text-neutral-400">
          <Sparkles className="h-3 w-3" />
          Открыть
        </div>
        {isOwner && (
          <div className="nodrag flex items-center gap-1">
            <Button
              className="h-6 w-6 rounded-full bg-white/60 text-neutral-400 hover:bg-white hover:text-neutral-700"
              onClick={(e) => {
                e.stopPropagation();
                data.onSettingsClick?.();
              }}
              size="icon"
              variant="ghost"
            >
              <Settings className="h-3 w-3" />
            </Button>
            <Button
              className="h-6 w-6 rounded-full bg-white/60 text-neutral-300 hover:bg-red-50 hover:text-red-500"
              onClick={(e) => {
                e.stopPropagation();
                data.onDeleteClick?.();
              }}
              size="icon"
              variant="ghost"
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        )}
      </div>

      <Handle position={Position.Bottom} type="source" className="!h-0 !w-0 !border-0 !bg-transparent" />
    </div>
  );
}
