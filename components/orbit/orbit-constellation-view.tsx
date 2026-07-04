"use client";

import { motion, useReducedMotion } from "framer-motion";
import { GitBranch, Lock, Settings, Trash2, Unlock } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import type { ForkRelationship, Orbit } from "@/hooks/use-orbit-layout";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────

type NodeData = Orbit & {
  x: number;
  y: number;
  radius: number;
  depth: number;
  isRoot: boolean;
  childCount: number;
  parentId?: string;
};

type ConstellationProps = {
  orbits: Orbit[];
  forkRelationships: ForkRelationship[];
  currentUserId?: string;
  onSettingsClick?: (orbit: Orbit) => void;
  onDeleteClick?: (orbit: Orbit) => void;
};

 // ─── Subtle reference grid (barely visible for alignment) ────────────────────

// Create a very subtle grid reference - only visible on close inspection
const referencePoints: { id: number; x: number; y: number; size: number; color: string; opacity: number }[] = [];
for (let x = 50; x <= 750; x += 100) {
  for (let y = 50; y <= 550; y += 100) {
    referencePoints.push({
      id: referencePoints.length,
      x,
      y,
      size: 0.3,
      color: "bg-gray-100/5",
      opacity: 0.08,
    });
  }
}

// ─── Layout algorithm (more geometric/workspace-like) ────────────────────

function computeLayout(
  orbits: Orbit[],
  forkRelationships: ForkRelationship[],
  W: number,
  H: number
): NodeData[] {
  if (orbits.length === 0) return [];

  const childrenOf = new Map<string, string[]>();
  const parentOf = new Map<string, string>();

  for (const rel of forkRelationships) {
    if (!childrenOf.has(rel.parentSferaId)) childrenOf.set(rel.parentSferaId, []);
    childrenOf.get(rel.parentSferaId)!.push(rel.forkedSferaId);
    parentOf.set(rel.forkedSferaId, rel.parentSferaId);
  }

  const roots = orbits.filter((o) => !parentOf.has(o.id));

  const positions = new Map<string, { x: number; y: number; depth: number }>();

  // Place roots in a precise grid (workspace-appropriate, tighter spacing)
  const cols = Math.ceil(Math.sqrt(roots.length));
  const cellW = (W * 0.72) / Math.max(cols, 1); // Tighter horizontal spacing
  const cellH = (H * 0.62) / Math.max(Math.ceil(roots.length / cols), 1); // Tighter vertical spacing
  const marginX = W * 0.14;
  const marginY = H * 0.19;

  roots.forEach((root, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    // Perfectly aligned grid - no decorative offset for workspace precision
    positions.set(root.id, {
      x: marginX + col * cellW + cellW / 2,
      y: marginY + row * cellH + cellH / 2,
      depth: 0,
    });
  });

  // Place children in orthogonal layout (more structured)
  function placeChildren(parentId: string, depth: number) {
    const children = childrenOf.get(parentId) ?? [];
    if (children.length === 0) return;

    const parent = positions.get(parentId);
    if (!parent) return;

    // Distribute children in a compact grid around parent
    const childCols = Math.ceil(Math.sqrt(children.length));
    const childCellW = 90; // Tighter spacing
    const childCellH = 75; // Tighter spacing

    children.forEach((childId, idx) => {
      const childCol = idx % childCols;
      const childRow = Math.floor(idx / childCols);

      // Compact grid positioning for workspace efficiency
      const offsetX = (childCol - Math.floor(childCols / 2)) * childCellW;
      const offsetY = (childRow - Math.floor(childCols / 2)) * childCellH; // Use child cell height for consistency

      positions.set(childId, {
        x: parent.x + offsetX,
        y: parent.y + offsetY,
        depth,
      });
      placeChildren(childId, depth + 1);
    });
  }

  for (const root of roots) placeChildren(root.id, 1);

  // Any orphaned nodes (in forkRelationships but no position yet)
  let orphanX = marginX;
  for (const orbit of orbits) {
    if (!positions.has(orbit.id)) {
      positions.set(orbit.id, { x: orphanX, y: H / 2, depth: 0 });
      orphanX += cellW;
    }
  }

  return orbits.map((o) => {
    const pos = positions.get(o.id) ?? { x: W / 2, y: H / 2, depth: 0 };
    const children = childrenOf.get(o.id) ?? [];
    const isRoot = !parentOf.has(o.id);
    return {
      ...o,
      x: pos.x,
      y: pos.y,
      depth: pos.depth,
      isRoot,
      childCount: children.length,
      radius: isRoot ? 38 : 28, // Even more compact for dense workspace layouts
      parentId: parentOf.get(o.id),
    };
  });
}

// ─── Tier styling by role / depth ────────────────────────────────────────

type NodeTier = {
  ringClass: string;
  dotClass: string;
  labelClass: string;
  rootPulseRgba: string;
  legendLabel: string;
};

function nodeTier(node: NodeData): NodeTier {
  if (node.role === "owner" && node.isRoot) {
    return {
      ringClass: "border-indigo-300/80",
      dotClass: "bg-indigo-500",
      labelClass: "text-indigo-700",
      rootPulseRgba: "rgba(99,102,241,0.4)",
      legendLabel: "Your root orbit",
    };
  }
  if (node.role === "owner") {
    return {
      ringClass: "border-indigo-200",
      dotClass: "bg-indigo-300",
      labelClass: "text-indigo-600",
      rootPulseRgba: "rgba(99,102,241,0.3)",
      legendLabel: "Owned fork",
    };
  }
  if (node.depth === 1) {
    return {
      ringClass: "border-blue-200",
      dotClass: "bg-blue-300",
      labelClass: "text-blue-600",
      rootPulseRgba: "rgba(59,130,246,0.25)",
      legendLabel: "Member — level 1",
    };
  }
  return {
    ringClass: "border-gray-200",
    dotClass: "bg-gray-300",
    labelClass: "text-gray-500",
    rootPulseRgba: "rgba(99,102,241,0.2)",
    legendLabel: "Deeper fork",
  };
}

const TIER_LEGEND_ORDER: NodeTier[] = [
  {
    ringClass: "border-indigo-300/80",
    dotClass: "bg-indigo-500",
    labelClass: "text-indigo-700",
    rootPulseRgba: "rgba(99,102,241,0.4)",
    legendLabel: "Your root orbit",
  },
  {
    ringClass: "border-indigo-200",
    dotClass: "bg-indigo-300",
    labelClass: "text-indigo-600",
    rootPulseRgba: "rgba(99,102,241,0.3)",
    legendLabel: "Owned fork",
  },
  {
    ringClass: "border-blue-200",
    dotClass: "bg-blue-300",
    labelClass: "text-blue-600",
    rootPulseRgba: "rgba(59,130,246,0.25)",
    legendLabel: "Member — level 1",
  },
  {
    ringClass: "border-gray-200",
    dotClass: "bg-gray-300",
    labelClass: "text-gray-500",
    rootPulseRgba: "rgba(99,102,241,0.2)",
    legendLabel: "Deeper fork",
  },
];

// ─── SVG connection path ────────────────────────────────────────────────

function curvePath(x1: number, y1: number, x2: number, y2: number) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const cx1 = x1 + dx * 0.35 + dy * 0.15;
  const cy1 = y1 + dy * 0.35 - dx * 0.15;
  const cx2 = x2 - dx * 0.35 - dy * 0.15;
  const cy2 = y2 - dy * 0.35 + dx * 0.15;
  return `M${x1},${y1} C${cx1},${cy1} ${cx2},${cy2} ${x2},${y2}`;
}

// ─── Single edge ────────────────────────────────────────────────────────

function ConstellationEdge({
  from,
  to,
  highlighted,
  dimmed,
}: {
  from: NodeData;
  to: NodeData;
  highlighted: boolean;
  dimmed: boolean;
}) {
  // More direct, technical connection - mostly straight with minimal curve for flow
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const curveStrength = 0.1; // Very subtle curve for natural flow
  const cx1 = from.x + dx * curveStrength;
  const cy1 = from.y + dy * curveStrength;
  const cx2 = to.x - dx * curveStrength;
  const cy2 = to.y - dy * curveStrength;
  const d = `M${from.x},${from.y} C${cx1},${cy1} ${cx2},${cy2} ${to.x},${to.y}`;

  // More technical stroke - sharper, less soft
  const stroke = "rgb(100,110,140)"; // More muted, technical blue-gray

  return (
    <path
      d={d}
      fill="none"
      stroke={stroke}
      strokeWidth={highlighted ? 1.2 : 0.8} // Thinner, more precise lines
      strokeLinecap="square" // Square ends for technical feel
      opacity={dimmed ? 0.08 : highlighted ? 0.6 : 0.15}
      style={{ transition: "opacity 0.15s ease, stroke-width 0.15s ease" }}
    />
  );
}

// ─── Single node card ───────────────────────────────────────────────────

function ConstellationNode({
  node,
  isHovered,
  isConnected,
  isDimmed,
  onHover,
  onLeave,
  onClick,
  onSettings,
  onDelete,
  isOwner,
  reduced,
}: {
  node: NodeData;
  isHovered: boolean;
  isConnected: boolean;
  isDimmed: boolean;
  onHover: () => void;
  onLeave: () => void;
  onClick: () => void;
  onSettings?: () => void;
  onDelete?: () => void;
  isOwner: boolean;
  reduced: boolean;
}) {
  const tier = nodeTier(node);

  return (
    <motion.div
      className="group absolute"
      style={{
        left: node.x,
        top: node.y,
        transform: "translate(-50%, -50%)",
        zIndex: isHovered ? 50 : isConnected ? 30 : 10,
      }}
      initial={reduced ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.5 }}
      animate={{ opacity: isDimmed ? 0.4 : 1, scale: 1 }}
      transition={reduced ? { duration: 0 } : { duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
    >
      {/* Subtle pulse for root nodes - more professional */}
      {node.isRoot && !reduced && (
        <div
          className={cn(
            "constellation-pulse pointer-events-none absolute rounded-full",
            isHovered && "constellation-pulse-focused",
          )}
          style={{
            width: node.radius * 2,
            height: node.radius * 2,
            left: "50%",
            top: "50%",
            transform: "translate(-50%,-50%)",
            "--pulse-color": tier.rootPulseRgba,
          } as React.CSSProperties}
          aria-hidden="true"
        />
      )}

      {/* Main card */}
      <motion.button
        type="button"
        onClick={onClick}
        whileHover={reduced ? undefined : { scale: 1.03 }}
        whileTap={reduced ? undefined : { scale: 0.98 }}
        transition={{ type: "spring", stiffness: 200, damping: 20 }}
        className={cn(
          "relative flex flex-col items-center justify-center rounded-lg border bg-white shadow-sm cursor-pointer select-none text-center transition-colors transition-shadow duration-75",
          tier.ringClass,
          node.isRoot ? "w-[76px] h-[76px] px-1" : "w-[56px] h-[56px]",
          isHovered && !isDimmed && "shadow-sm border-blue-400",
          isConnected && !isHovered && "border-blue-200",
        )}
      >
        {/* Workspace-appropriate badge styling */}
        {node.childCount > 0 && (
          <div
            aria-label={`${node.childCount} ${node.childCount === 1 ? "dependency" : "dependencies"}`}
            className="absolute -1 -1 flex h-5 w-5 items-center justify-center rounded-full border border-blue-200 bg-blue-50 text-xs font-mono font-semibold text-blue-800"
          >
            <GitBranch aria-hidden="true" className="h-3 w-3" />
            {node.childCount}
          </div>
        )}

        {/* Status indicator */}
        <div className="mb-1 flex h-3 w-3 items-center justify-center">
          {node.visibility === "private" ? (
            <Lock aria-hidden="true" className="h-2 w-2 text-blue-600" />
          ) : (
            <Unlock aria-hidden="true" className="h-2 w-2 text-blue-400" />
          )}
        </div>

        {/* Title - compact */}
        <p
          className="mb-0.5 line-clamp-1 font-semibold text-[9px] text-gray-900"
          title={node.title}
        >
          {node.title.length > 14 ? `${node.title.slice(0, 12)}…` : node.title}
        </p>

        {/* Role - compact */}
        <p className="text-[8px] font-mono tracking-wider text-gray-400 uppercase">
          {node.role}
        </p>
      </motion.button>

      {/* Workspace-style action buttons - only on hover/focus */}
      {isOwner && (
        <div className="mt-2 flex items-center gap-2 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity duration-100">
          <button
            type="button"
            aria-label="Configure"
            onClick={(e) => {
              e.stopPropagation();
              onSettings?.();
            }}
            className="p-1 rounded hover:bg-blue-50 hover:text-blue-600 transition-colors duration-100"
          >
            <Settings aria-hidden="true" className="h-4 w-4 text-blue-500" />
          </button>
          <button
            type="button"
            aria-label="Remove"
            onClick={(e) => {
              e.stopPropagation();
              onDelete?.();
            }}
            className="p-1 rounded hover:bg-red-50 hover:text-red-600 transition-colors duration-100"
          >
            <Trash2 aria-hidden="true" className="h-4 w-4 text-red-500" />
          </button>
        </div>
      )}
    </motion.div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────

export function OrbitConstellationView({
  orbits,
  forkRelationships,
  currentUserId,
  onSettingsClick,
  onDeleteClick,
}: ConstellationProps) {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ w: 1200, h: 700 });
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const reducedMotion = useReducedMotion();
  const reduced = reducedMotion ?? false;

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      setDimensions({ w: entry.contentRect.width, h: entry.contentRect.height });
    });
    ro.observe(el);
    setDimensions({ w: el.clientWidth, h: el.clientHeight });
    return () => ro.disconnect();
  }, []);

  const nodes = useMemo(
    () => computeLayout(orbits, forkRelationships, dimensions.w, dimensions.h),
    [orbits, forkRelationships, dimensions]
  );

  const nodeMap = useMemo(() => new Map(nodes.map((n) => [n.id, n])), [nodes]);

  // Build adjacency: which nodes are connected to hoveredId
  const connectedIds = useMemo(() => {
    if (!hoveredId) return new Set<string>();
    const set = new Set<string>();
    for (const rel of forkRelationships) {
      if (rel.parentSferaId === hoveredId) set.add(rel.forkedSferaId);
      if (rel.forkedSferaId === hoveredId) set.add(rel.parentSferaId);
    }
    return set;
  }, [hoveredId, forkRelationships]);

  const anyHovered = hoveredId !== null;

  return (
    <div
      ref={containerRef}
      className="relative h-full w-full overflow-hidden bg-gradient-to-br from-gray-50 via-blue-50/50 to-purple-50/50"
    >
      {/* Reference points */}
      <div className="pointer-events-none absolute inset-0">
        {referencePoints.map((point) => (
          <div
            key={point.id}
            className={cn("absolute rounded-full", point.color)}
            style={{
              left: `${point.x}px`,
              top: `${point.y}px`,
              width: point.size,
              height: point.size,
              opacity: point.opacity,
            }}
          />
        ))}
      </div>

      {/* SVG edges layer */}
      <svg
        className="pointer-events-none absolute inset-0"
        width={dimensions.w}
        height={dimensions.h}
        style={{ overflow: "visible" }}
      >
        {forkRelationships.map((rel) => {
          const from = nodeMap.get(rel.parentSferaId);
          const to = nodeMap.get(rel.forkedSferaId);
          if (!from || !to) return null;

          const highlighted =
            hoveredId === from.id || hoveredId === to.id;
          const dimmed =
            anyHovered && !highlighted;

          return (
            <ConstellationEdge
              key={`${rel.parentSferaId}-${rel.forkedSferaId}`}
              from={from}
              to={to}
              highlighted={highlighted}
              dimmed={dimmed}
            />
          );
        })}
      </svg>

      {/* Node layer */}
      <div className="absolute inset-0">
        {nodes.map((node) => {
          const isHovered = hoveredId === node.id;
          const isConnected = connectedIds.has(node.id);
          const isDimmed = anyHovered && !isHovered && !isConnected;
          const isOwner = node.ownerId === currentUserId;

          return (
            <ConstellationNode
              key={node.id}
              node={node}
              isHovered={isHovered}
              isConnected={isConnected}
              isDimmed={isDimmed}
              onHover={() => setHoveredId(node.id)}
              onLeave={() => setHoveredId(null)}
              onClick={() => router.push(`/${node.id}`)}
              onSettings={() => onSettingsClick?.(node)}
              onDelete={() => onDeleteClick?.(node)}
              isOwner={isOwner}
              reduced={reduced}
            />
          );
        })}
      </div>

      {/* Compact legend - workspace style */}
      <div
        aria-label="Orbit legend"
        className="pointer-events-none absolute bottom-4 left-4 flex flex-row gap-3 rounded-md border border-gray-200/30 bg-white/20 px-2 py-1 shadow-sm backdrop-blur-sm backdrop-blur"
      >
        {TIER_LEGEND_ORDER.map((tier, index) => (
          <div key={tier.legendLabel} className="flex items-center gap-1.5">
            <div className="h-2 w-2 rounded-full"
                 style={{ backgroundColor: tier.dotClass.includes('bg-indigo-500') ? '#6366f1' :
                           tier.dotClass.includes('bg-indigo-300') ? '#a5b4fc' :
                           tier.dotClass.includes('bg-blue-300') ? '#60a5fa' :
                           '#9ca3af' }}
            />
            <span className="text-xs font-mono tracking-wider text-gray-400 uppercase">
              {tier.legendLabel}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}