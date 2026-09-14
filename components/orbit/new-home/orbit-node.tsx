"use client";

import { Brain, GitBranch, Settings, Trash2 } from "lucide-react";
import { Handle, Position } from "@xyflow/react";
import type { KeyboardEvent } from "react";
import { Button } from "@/components/ui/button";
import { getScale } from "@/lib/orbit/node-scale";
import {
  formatMessageCount,
  getDepthTone,
  type DepthTier,
} from "@/lib/orbit/depth-tone";
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
  /** Recency signal (<12h) — drives only the emerald sparkle, not the color. */
  lifeState: "born" | "alive" | "settled" | "quiet";
  /** How much conversation the orbit holds — drives color and the count label. */
  depthTier: DepthTier;
  density: number;
  /** How the orbit renders: quiet singletons collapse to star dots. */
  presentation: "full" | "compact" | "dot";
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
  const tone = getDepthTone(data.depthTier);
  const countLabel = formatMessageCount(data.messageCount);
  const hasParticipants = Boolean(data.recentParticipants?.length);
  const displayDescription = getDisplayDescription(data.description);
  const isCompact = data.presentation === "compact";
  const isDot = data.presentation === "dot";

  const handleOrbitClick = () => {
    data.onSelectOrbit?.(data.id);
  };

  const handleOrbitKeyDown = (event: KeyboardEvent) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      handleOrbitClick();
    }
  };

  const nodeAriaLabel = `${data.title} — ${countLabel}`;

  const isOwner = data.currentUserId === data.ownerId;

  // Quiet singletons render as star dots: just a glowing point of life.
  if (isDot) {
    return (
      <div
        aria-label={nodeAriaLabel}
        className={cn(
          "pointer-events-auto group relative cursor-pointer rounded-full transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400",
          data.dimmed && "opacity-35"
        )}
        data-orbit-title={data.title}
        data-testid="orbit-node"
        onClick={handleOrbitClick}
        onKeyDown={handleOrbitKeyDown}
        role="button"
        style={{
          width: 16,
          height: 16,
          boxShadow: `0 0 24px ${tone.glow}`,
        }}
        tabIndex={0}
        title={`${data.title} — ${countLabel}`}
      >
        <Handle position={Position.Top} type="target" className="!h-0 !w-0 !border-0 !bg-transparent" />

        <span
          className={cn(
            "block h-4 w-4 rounded-full",
            tone.dot,
            "transition-transform group-hover:scale-125"
          )}
        />

        <Handle position={Position.Bottom} type="source" className="!h-0 !w-0 !border-0 !bg-transparent" />
      </div>
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
        data-testid="orbit-node"
        data-orbit-title={data.title}
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
      aria-label={nodeAriaLabel}
      className={cn(
        "pointer-events-auto group relative cursor-grab rounded-[28px] bg-white/72 px-4 py-3 shadow-[0_24px_80px_rgba(15,23,42,0.10)] backdrop-blur-2xl transition-opacity active:cursor-grabbing focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400",
        selected
          ? "ring-2 ring-violet-400/80"
          : "ring-1 ring-white/70 hover:ring-neutral-200/80",
        data.dimmed && "opacity-35"
      )}
      data-orbit-title={data.title}
      data-testid="orbit-node"
      onClick={handleOrbitClick}
      onKeyDown={handleOrbitKeyDown}
      role="button"
      style={{
        width: 230 * scale,
        minHeight: 148 * scale,
        padding: `${15 * scale}px ${17 * scale}px`,
        boxShadow: selected
          ? `0 22px ${54 * scale}px rgba(15, 23, 42, 0.12), 0 0 0 6px rgba(168,85,247,0.10), 0 0 ${42 * scale}px ${tone.glow}`
          : `0 22px ${54 * scale}px rgba(15, 23, 42, 0.10), 0 0 ${42 * scale}px ${tone.glow}`,
      }}
      tabIndex={0}
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
              className={cn("relative inline-flex h-2.5 w-2.5 rounded-full", tone.dot)}
            />
          </span>
          <span className="font-medium text-[10px] uppercase tracking-[0.2em] text-neutral-400">
            {countLabel}
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

      {/* Owner actions — hover overlay, reserves no layout space */}
      {isOwner && (
        <div className="nodrag absolute bottom-3 right-3 flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
          <Button
            aria-label={`Настройки: ${data.title}`}
            className="h-6 w-6 rounded-full bg-white/60 text-neutral-400 shadow-sm hover:bg-white hover:text-neutral-700"
            data-testid="orbit-node-settings"
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
            aria-label={`Удалить: ${data.title}`}
            className="h-6 w-6 rounded-full bg-white/60 text-neutral-300 shadow-sm hover:bg-red-50 hover:text-red-500"
            data-testid="orbit-node-delete"
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

      <Handle position={Position.Bottom} type="source" className="!h-0 !w-0 !border-0 !bg-transparent" />
    </div>
  );
}
