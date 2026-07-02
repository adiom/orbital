"use client";

import { motion } from "framer-motion";
import { GitBranch, Lock, Settings, Trash2, Unlock } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import type { ForkRelationship, Orbit } from "@/hooks/use-orbit-layout";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

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

// ─── Static star field ────────────────────────────────────────────────────────

const STAR_COUNT = 180;

const starField = Array.from({ length: STAR_COUNT }, (_, i) => ({
  id: i,
  x: (i * 137.508 + 23) % 100,
  y: (i * 97.381 + 11) % 100,
  size: i % 7 === 0 ? 1.5 : i % 3 === 0 ? 1 : 0.5,
  opacity: 0.15 + ((i * 53) % 100) / 200,
  delay: (i * 0.17) % 4,
  duration: 2.5 + ((i * 31) % 30) / 10,
}));

// ─── Layout algorithm ─────────────────────────────────────────────────────────

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
  const orbitMap = new Map(orbits.map((o) => [o.id, o]));

  const positions = new Map<string, { x: number; y: number; depth: number }>();

  // Place roots in a soft grid with organic offsets
  const cols = Math.ceil(Math.sqrt(roots.length * 1.6));
  const cellW = (W * 0.82) / Math.max(cols, 1);
  const cellH = (H * 0.76) / Math.max(Math.ceil(roots.length / cols), 1);
  const marginX = W * 0.09;
  const marginY = H * 0.12;

  roots.forEach((root, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    // Organic offset using deterministic pseudo-random
    const jitterX = ((root.id.charCodeAt(0) * 37 + root.id.charCodeAt(1) * 13) % 40) - 20;
    const jitterY = ((root.id.charCodeAt(2) * 29 + root.id.charCodeAt(3) * 17) % 40) - 20;
    positions.set(root.id, {
      x: marginX + col * cellW + cellW / 2 + jitterX,
      y: marginY + row * cellH + cellH / 2 + jitterY,
      depth: 0,
    });
  });

  // Place children radially around parents
  function placeChildren(parentId: string, depth: number) {
    const children = childrenOf.get(parentId) ?? [];
    if (children.length === 0) return;

    const parent = positions.get(parentId);
    if (!parent) return;

    const orbitRadius = 140 - depth * 20;
    children.forEach((childId, idx) => {
      const angle = ((idx / children.length) * 2 * Math.PI) - Math.PI / 2;
      positions.set(childId, {
        x: parent.x + orbitRadius * Math.cos(angle),
        y: parent.y + orbitRadius * Math.sin(angle),
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
      radius: isRoot ? 48 : 36,
      parentId: parentOf.get(o.id),
    };
  });
}

// ─── Glow colour by role / depth ──────────────────────────────────────────────

function nodeGlow(node: NodeData) {
  if (node.role === "owner" && node.isRoot) return { core: "#7fffd4", ring: "#00ffe0", trail: "#00ffe044" };
  if (node.role === "owner") return { core: "#a5f3fc", ring: "#38bdf8", trail: "#38bdf844" };
  if (node.depth === 1) return { core: "#d8b4fe", ring: "#a855f7", trail: "#a855f744" };
  return { core: "#fda4af", ring: "#f43f5e", trail: "#f43f5e33" };
}

// ─── SVG connection path ──────────────────────────────────────────────────────

function curvePath(x1: number, y1: number, x2: number, y2: number) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const cx1 = x1 + dx * 0.35 + dy * 0.15;
  const cy1 = y1 + dy * 0.35 - dx * 0.15;
  const cx2 = x2 - dx * 0.35 - dy * 0.15;
  const cy2 = y2 - dy * 0.35 + dx * 0.15;
  return `M${x1},${y1} C${cx1},${cy1} ${cx2},${cy2} ${x2},${y2}`;
}

// ─── Single edge ──────────────────────────────────────────────────────────────

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
  const colors = nodeGlow(from);
  const d = curvePath(from.x, from.y, to.x, to.y);
  const id = `grad-${from.id.slice(0, 6)}-${to.id.slice(0, 6)}`;

  return (
    <g>
      <defs>
        <linearGradient id={id} gradientUnits="userSpaceOnUse"
          x1={from.x} y1={from.y} x2={to.x} y2={to.y}>
          <stop offset="0%" stopColor={nodeGlow(from).ring} stopOpacity={highlighted ? 0.9 : 0.25} />
          <stop offset="100%" stopColor={nodeGlow(to).ring} stopOpacity={highlighted ? 0.6 : 0.1} />
        </linearGradient>
      </defs>
      {/* Glow halo */}
      <path d={d} fill="none"
        stroke={colors.trail} strokeWidth={highlighted ? 10 : 5}
        strokeLinecap="round"
        opacity={dimmed ? 0 : highlighted ? 0.6 : 0.18}
        style={{ transition: "all 0.3s ease" }}
      />
      {/* Main line */}
      <path d={d} fill="none"
        stroke={`url(#${id})`} strokeWidth={highlighted ? 1.5 : 0.8}
        strokeDasharray={highlighted ? "none" : "4 6"}
        strokeLinecap="round"
        opacity={dimmed ? 0.03 : 1}
        style={{ transition: "all 0.3s ease" }}
      />
      {/* Animated particle on highlighted edge */}
      {highlighted && (
        <circle r={2} fill={colors.core} opacity={0.9}>
          <animateMotion dur="1.8s" repeatCount="indefinite" path={d} />
        </circle>
      )}
    </g>
  );
}

// ─── Single node card ─────────────────────────────────────────────────────────

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
}) {
  const colors = nodeGlow(node);
  const [showActions, setShowActions] = useState(false);

  return (
    <motion.div
      className="absolute"
      style={{
        left: node.x,
        top: node.y,
        transform: "translate(-50%, -50%)",
        zIndex: isHovered ? 50 : isConnected ? 30 : 10,
      }}
      initial={{ opacity: 0, scale: 0.4 }}
      animate={{
        opacity: isDimmed ? 0.15 : 1,
        scale: 1,
      }}
      transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
      onMouseEnter={() => { onHover(); setShowActions(true); }}
      onMouseLeave={() => { onLeave(); setShowActions(false); }}
    >
      {/* Outer pulse ring — root nodes only */}
      {node.isRoot && (
        <motion.div
          className="absolute inset-0 rounded-full pointer-events-none"
          style={{
            boxShadow: `0 0 0 0 ${colors.ring}`,
            borderRadius: "50%",
            width: node.radius * 2,
            height: node.radius * 2,
            left: "50%",
            top: "50%",
            transform: "translate(-50%,-50%)",
          }}
          animate={{
            boxShadow: isHovered
              ? [`0 0 0 0 ${colors.ring}88`, `0 0 0 20px ${colors.ring}00`]
              : [`0 0 0 0 ${colors.ring}44`, `0 0 0 12px ${colors.ring}00`],
          }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeOut" }}
        />
      )}

      {/* Glow backdrop */}
      <div
        className="absolute rounded-full pointer-events-none"
        style={{
          width: node.radius * 3.5,
          height: node.radius * 3.5,
          left: "50%",
          top: "50%",
          transform: "translate(-50%,-50%)",
          background: `radial-gradient(circle, ${colors.trail} 0%, transparent 70%)`,
          opacity: isHovered ? 1 : 0.5,
          transition: "opacity 0.3s ease",
        }}
      />

      {/* Main card */}
      <motion.button
        type="button"
        onClick={onClick}
        whileHover={{ scale: 1.06 }}
        whileTap={{ scale: 0.97 }}
        transition={{ type: "spring", stiffness: 300, damping: 20 }}
        className={cn(
          "relative flex flex-col items-center justify-center",
          "rounded-2xl border cursor-pointer select-none",
          "text-center transition-colors duration-300",
          node.isRoot
            ? "w-[112px] h-[112px] px-3"
            : "w-[86px] h-[86px] px-2",
        )}
        style={{
          background: isHovered
            ? `radial-gradient(circle at 40% 35%, ${colors.ring}22 0%, #0a0f1e 100%)`
            : "radial-gradient(circle at 40% 35%, #0f1a2e 0%, #070b14 100%)",
          borderColor: isHovered ? colors.ring : `${colors.ring}44`,
          boxShadow: isHovered
            ? `0 0 24px ${colors.ring}66, 0 0 6px ${colors.ring}44, inset 0 0 20px ${colors.ring}11`
            : `0 0 10px ${colors.ring}22, inset 0 0 8px ${colors.ring}08`,
        }}
      >
        {/* Fork badge */}
        {node.childCount > 0 && (
          <div
            className="absolute -top-2 -right-2 flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[9px] font-bold"
            style={{ background: colors.ring, color: "#000" }}
          >
            <GitBranch className="h-2.5 w-2.5" />
            {node.childCount}
          </div>
        )}

        {/* Visibility icon */}
        <div className="mb-1 opacity-40">
          {node.visibility === "private"
            ? <Lock className="h-2.5 w-2.5" style={{ color: colors.core }} />
            : <Unlock className="h-2.5 w-2.5" style={{ color: colors.core }} />
          }
        </div>

        {/* Title */}
        <p
          className={cn(
            "font-semibold leading-tight",
            node.isRoot ? "text-[11px]" : "text-[9px]",
          )}
          style={{ color: isHovered ? colors.core : `${colors.core}bb` }}
        >
          {node.title.length > 20 ? `${node.title.slice(0, 18)}…` : node.title}
        </p>

        {/* Role label */}
        <p
          className="mt-0.5 text-[8px] uppercase tracking-widest opacity-50"
          style={{ color: colors.ring }}
        >
          {node.role}
        </p>
      </motion.button>

      {/* Hover action buttons */}
      {isOwner && (
        <motion.div
          className="absolute left-1/2 -translate-x-1/2 flex gap-1.5 mt-1"
          style={{ top: "100%", paddingTop: 6 }}
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: showActions ? 1 : 0, y: showActions ? 0 : -4 }}
          transition={{ duration: 0.15 }}
        >
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onSettings?.(); }}
            className="flex h-6 w-6 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/50 transition-colors hover:bg-white/15 hover:text-white/90"
          >
            <Settings className="h-3 w-3" />
          </button>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onDelete?.(); }}
            className="flex h-6 w-6 items-center justify-center rounded-full border border-red-500/20 bg-red-500/5 text-red-400/50 transition-colors hover:bg-red-500/20 hover:text-red-400"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        </motion.div>
      )}
    </motion.div>
  );
}

// ─── Aurora nebula blobs ──────────────────────────────────────────────────────

function AuroraBlobs() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {[
        { x: "15%", y: "20%", w: 480, h: 280, color: "#00ffe022", rot: -20 },
        { x: "60%", y: "55%", w: 520, h: 240, color: "#7c3aed22", rot: 15 },
        { x: "40%", y: "10%", w: 360, h: 180, color: "#0ea5e922", rot: 5 },
        { x: "75%", y: "75%", w: 300, h: 200, color: "#f43f5e18", rot: -10 },
      ].map((blob, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full"
          style={{
            left: blob.x,
            top: blob.y,
            width: blob.w,
            height: blob.h,
            background: `radial-gradient(ellipse, ${blob.color} 0%, transparent 70%)`,
            rotate: blob.rot,
            filter: "blur(40px)",
          }}
          animate={{
            scale: [1, 1.08, 0.96, 1],
            opacity: [0.7, 1, 0.8, 0.7],
          }}
          transition={{
            duration: 8 + i * 2.5,
            repeat: Infinity,
            ease: "easeInOut",
            delay: i * 1.3,
          }}
        />
      ))}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

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
      className="relative h-full w-full overflow-hidden"
      style={{ background: "#03060f" }}
    >
      {/* Star field */}
      <div className="pointer-events-none absolute inset-0">
        {starField.map((star) => (
          <motion.div
            key={star.id}
            className="absolute rounded-full bg-white"
            style={{
              left: `${star.x}%`,
              top: `${star.y}%`,
              width: star.size,
              height: star.size,
            }}
            animate={{ opacity: [star.opacity, star.opacity * 2.5, star.opacity] }}
            transition={{ duration: star.duration, repeat: Infinity, delay: star.delay, ease: "easeInOut" }}
          />
        ))}
      </div>

      {/* Aurora nebula */}
      <AuroraBlobs />

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
              onClick={() => router.push(`/orbit/${node.id}`)}
              onSettings={() => onSettingsClick?.(node)}
              onDelete={() => onDeleteClick?.(node)}
              isOwner={isOwner}
            />
          );
        })}
      </div>

      {/* Legend */}
      <div className="absolute bottom-6 left-6 flex flex-col gap-2 text-[10px] font-medium tracking-wider uppercase">
        {[
          { color: "#7fffd4", label: "Your root orbit" },
          { color: "#a5f3fc", label: "Owned fork" },
          { color: "#d8b4fe", label: "Member — level 1" },
          { color: "#fda4af", label: "Deeper fork" },
        ].map(({ color, label }) => (
          <div key={label} className="flex items-center gap-2 opacity-40">
            <div
              className="h-1.5 w-1.5 rounded-full"
              style={{ background: color, boxShadow: `0 0 4px ${color}` }}
            />
            <span style={{ color }}>{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
