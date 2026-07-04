"use client";

import { GitBranch } from "lucide-react";
import { Handle, Position } from "@xyflow/react";
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
  if (score <= 70) return 1.20;
  return 1.30;
}

function getLifeTone(lifeState: OrbitNodeData["lifeState"]) {
  if (lifeState === "born") {
    return {
      glow: "rgba(96,165,250,0.22)",
      dot: "bg-sky-400",
      label: "родилось",
    };
  }
  if (lifeState === "alive") {
    return {
      glow: "rgba(16,185,129,0.24)",
      dot: "bg-emerald-400",
      label: "живет",
    };
  }
  if (lifeState === "settled") {
    return {
      glow: "rgba(168,85,247,0.20)",
      dot: "bg-violet-400",
      label: "созревает",
    };
  }
  return {
    glow: "rgba(148,163,184,0.16)",
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

export function OrbitNode({ data, selected }: OrbitNodeProps) {
  const scale = getScale(data.childCount, data.density, data.messageCount);
  const tone = getLifeTone(data.lifeState);
  const displayDescription = getDisplayDescription(data.description);
  const isCompact = scale < 0.75;
  const isMedium = scale >= 0.75 && scale < 1.0;

  const handleOrbitClick = () => {
    data.onSelectOrbit?.(data.id);
  };

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
        className={cn(
          "pointer-events-auto group relative cursor-pointer rounded-[20px] bg-white/65 backdrop-blur-xl",
          selected ? "ring-1 ring-blue-300/70" : "ring-1 ring-white/60"
        )}
        style={{
          width: 160,
          minHeight: 72,
          padding: "10px 14px",
          boxShadow: `0 16px 40px rgba(15, 23, 42, 0.08), 0 0 28px ${tone.glow}`,
        }}
        onClick={handleOrbitClick}
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
        "pointer-events-auto group relative cursor-pointer rounded-[26px] bg-white/70 backdrop-blur-2xl",
        selected ? "ring-1 ring-blue-300/70" : "ring-1 ring-white/65"
      )}
      style={{
        width: isMedium ? 200 : 230 * scale,
        minHeight: isMedium ? 120 : 140 * scale,
        padding: isMedium ? "12px 15px" : `${14 * scale}px ${16 * scale}px`,
        boxShadow: `0 20px ${50 * scale}px rgba(15, 23, 42, 0.09), 0 0 ${36 * scale}px ${tone.glow}`,
      }}
      onClick={handleOrbitClick}
    >
      <Handle position={Position.Top} type="target" className="!h-0 !w-0 !border-0 !bg-transparent" />

      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className={cn("h-2.5 w-2.5 shrink-0 rounded-full", tone.dot)} />
          <span className="font-medium text-[9.5px] uppercase tracking-[0.18em] text-neutral-400">
            {tone.label}
          </span>
        </div>
        {data.childCount > 0 && (
          <div className="flex items-center gap-1 rounded-full bg-white/60 px-2 py-0.5 text-[9px] text-neutral-500">
            <GitBranch className="h-2.5 w-2.5" />
            {data.childCount}
          </div>
        )}
      </div>

      <h3
        className="mb-1.5 line-clamp-2 font-medium leading-tight text-neutral-950"
        style={{ fontSize: isMedium ? 14 : 15 * scale }}
      >
        {data.title}
      </h3>

      {!isMedium && (
        <p
          className="line-clamp-2 leading-snug text-neutral-500"
          style={{ fontSize: 11 * scale }}
        >
          {displayDescription}
        </p>
      )}

      <div className="mt-4 h-0.5 overflow-hidden rounded-full bg-neutral-100/80">
        <div
          className="h-full rounded-full bg-gradient-to-r from-sky-300 via-emerald-300 to-violet-300"
          style={{ width: `${Math.max(18, data.density * 100)}%` }}
        />
      </div>

      {!isMedium && (
        <div className="mt-3 flex items-end justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[10px] leading-none text-neutral-400">
              {data.activityLabel}
            </p>
            <div className="mt-1.5 flex flex-wrap items-center gap-1">
              {data.description && (
                <span className="rounded-full bg-white/60 px-1.5 py-0.5 text-[9px] text-neutral-500">
                  суть есть
                </span>
              )}
              {data.childCount > 0 && (
                <span className="rounded-full bg-white/60 px-1.5 py-0.5 text-[9px] text-neutral-500">
                  растет
                </span>
              )}
              {data.visibility === "private" && (
                <span className="rounded-full bg-white/60 px-1.5 py-0.5 text-[9px] text-neutral-500">
                  личное
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      <Handle position={Position.Bottom} type="source" className="!h-0 !w-0 !border-0 !bg-transparent" />
    </div>
  );
}
