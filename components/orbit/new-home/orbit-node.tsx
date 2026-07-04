"use client";

import { Brain, GitBranch, Settings, Sparkles, Trash2 } from "lucide-react";
import { Handle, Position } from "@xyflow/react";
import { useRouter } from "next/navigation";
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
  createdAt: Date;
  updatedAt: Date;
  activityLabel: string;
  lifeState: "born" | "alive" | "settled" | "quiet";
  density: number;
  recentParticipants?: Array<{
    id: string;
    name: string;
    image?: string | null;
  }>;
  insightBadges?: string[];
  currentUserId?: string;
  onSettingsClick?: () => void;
  onDeleteClick?: () => void;
};

type OrbitNodeProps = {
  data: OrbitNodeData;
  selected?: boolean;
};

function getScale(childCount: number, density: number): number {
  if (childCount >= 5 || density > 0.8) return 1.32;
  if (childCount >= 3 || density > 0.55) return 1.18;
  if (childCount >= 1 || density > 0.3) return 1.07;
  return 1;
}

function getLifeTone(lifeState: OrbitNodeData["lifeState"]) {
  if (lifeState === "born") {
    return {
      glow: "rgba(96,165,250,0.22)",
      ring: "from-sky-300/70 via-blue-200/30 to-transparent",
      label: "родилось",
    };
  }

  if (lifeState === "alive") {
    return {
      glow: "rgba(16,185,129,0.24)",
      ring: "from-emerald-300/80 via-teal-200/30 to-transparent",
      label: "живет",
    };
  }

  if (lifeState === "settled") {
    return {
      glow: "rgba(168,85,247,0.20)",
      ring: "from-violet-300/70 via-fuchsia-200/25 to-transparent",
      label: "созревает",
    };
  }

  return {
    glow: "rgba(148,163,184,0.16)",
    ring: "from-stone-300/50 via-stone-200/20 to-transparent",
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
  const router = useRouter();
  const scale = getScale(data.childCount, data.density);
  const tone = getLifeTone(data.lifeState);
  const hasParticipants = Boolean(data.recentParticipants?.length);
  const displayDescription = getDisplayDescription(data.description);

  const handleOrbitClick = () => {
    router.push(`/orbit/${data.id}`);
  };

  const isOwner = data.currentUserId === data.ownerId;

  return (
    <div
      className={cn(
        "orbital-living-node pointer-events-auto group relative rounded-[28px] bg-white/72 px-4 py-3 shadow-[0_24px_80px_rgba(15,23,42,0.10)] backdrop-blur-2xl transition-all duration-500 hover:-translate-y-1 hover:bg-white/88 hover:shadow-[0_30px_100px_rgba(15,23,42,0.14)]",
        selected
          ? "ring-1 ring-blue-300/70"
          : "ring-1 ring-white/70 hover:ring-neutral-200/80"
      )}
      style={{
        width: 230 * scale,
        minHeight: 148 * scale,
        padding: `${15 * scale}px ${17 * scale}px`,
        boxShadow: `0 22px ${54 * scale}px rgba(15, 23, 42, 0.10), 0 0 ${42 * scale}px ${tone.glow}`,
        animationDelay: `${data.id.charCodeAt(0) % 7}s`,
      }}
    >
      <div
        className={cn(
          "pointer-events-none absolute -inset-4 -z-10 rounded-[36px] bg-gradient-to-br opacity-70 blur-xl transition-opacity duration-500 group-hover:opacity-100",
          tone.ring
        )}
      />
      <div className="pointer-events-none absolute inset-x-5 top-0 h-px bg-gradient-to-r from-transparent via-white to-transparent" />
      <Handle
        position={Position.Top}
        type="target"
        className="!h-0 !w-0 !border-0 !bg-transparent"
      />

      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            {data.lifeState === "alive" && (
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-300 opacity-60" />
            )}
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
        className="w-full cursor-pointer text-left"
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
          className="h-full rounded-full bg-gradient-to-r from-sky-300 via-emerald-300 to-violet-300 transition-all duration-700"
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

      <div className="mt-4 flex items-center justify-between border-white/60 border-t pt-3 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
        <div className="flex items-center gap-1.5 text-[10px] text-neutral-400">
          <Sparkles className="h-3 w-3" />
          Открыть
        </div>
        {isOwner && (
          <div className="flex items-center gap-1">
            <Button
              className="h-6 w-6 rounded-full bg-white/60 text-neutral-400 transition-all hover:bg-white hover:text-neutral-700"
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
              className="h-6 w-6 rounded-full bg-white/60 text-neutral-300 transition-all hover:bg-red-50 hover:text-red-500"
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

      <Handle
        position={Position.Bottom}
        type="source"
        className="!h-0 !w-0 !border-0 !bg-transparent"
      />
    </div>
  );
}
