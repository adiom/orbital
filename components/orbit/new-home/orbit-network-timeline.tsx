"use client";

import {
  Background,
  type Edge,
  type Node,
  type OnSelectionChangeParams,
  Panel,
  ReactFlow,
  ReactFlowProvider,
  SelectionMode,
  useEdgesState,
  useNodesState,
  useReactFlow,
  type XYPosition,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Archive, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { ForkRelationship, Orbit } from "@/hooks/use-orbit-layout";
import { useOrbitViewMode } from "@/hooks/use-orbit-view-mode";
import { findClusters } from "@/lib/orbit/cluster-detection";
import { computeForceLayout } from "@/lib/orbit/force-layout";
import { ClusterOverlay } from "./cluster-overlay";
import { OrbitControlBar } from "./orbit-control-bar";
import { OrbitEdge } from "./orbit-edge";
import { OrbitNode, type OrbitNodeData } from "./orbit-node";
import { OrbitToolbar } from "./orbit-toolbar";
import { OrbitSettings } from "../orbit-settings";
import { OrbitChatPanel } from "../orbit-chat-panel";

type Member = {
  userId: string;
  email: string;
  role: string;
};

type OrbitNetworkTimelineProps = {
  orbits: Orbit[];
  forkRelationships: ForkRelationship[];
  currentUserId?: string;
  onUpdate?: () => void;
  selectedOrbitId?: string | null;
  onSelectOrbit?: (id: string | null) => void;
};

const nodeTypes = {
  orbit: OrbitNode,
};

const edgeTypes = {
  orbit: OrbitEdge,
};

const NODE_WIDTH = 280;
const NODE_HEIGHT = 200;
const CANVAS_CENTER_X = 720;
const ROOT_Y = 80;

const LIFE_STATE_COLORS: Record<string, string> = {
  born: "96,165,250",
  alive: "16,185,129",
  settled: "168,85,247",
  quiet: "148,163,184",
};

function getChildCount(orbitId: string, forkRelationships: ForkRelationship[]) {
  return forkRelationships.filter((r) => r.parentSferaId === orbitId).length;
}

function getLifeState(orbit: Orbit, childCount: number): OrbitNodeData["lifeState"] {
  const updatedAt = new Date(orbit.updatedAt).getTime();
  const ageInHours = (Date.now() - updatedAt) / (1000 * 60 * 60);

  if (ageInHours < 12) return "alive";
  if (ageInHours < 72 || childCount > 0) return "settled";
  if (ageInHours < 168) return "born";
  return "quiet";
}

function getActivityLabel(orbit: Orbit, childCount: number) {
  const msgCount = orbit.messageCount || 0;
  const memberCount = orbit.memberCount || 0;
  const lastMsg = orbit.lastMessageAt
    ? new Date(orbit.lastMessageAt).getTime()
    : null;
  const ageInMinutes = lastMsg
    ? Math.max(1, Math.floor((Date.now() - lastMsg) / 60_000))
    : Infinity;

  if (ageInMinutes < 60) return "ожило недавно";
  if (ageInMinutes < 60 * 24) return "обсуждалось сегодня";
  if (msgCount > 50) return `${msgCount} сообщений`;
  if (memberCount > 1) return `${memberCount} участников`;
  if (childCount > 0) return "есть новые ветви";
  return "ждет продолжения";
}

function getDensity(orbit: Orbit, childCount: number) {
  const msgCount = orbit.messageCount || 0;
  const memberCount = orbit.memberCount || 0;
  const hasDescription = orbit.description ? 0.12 : 0;
  const forkDensity = Math.min(childCount * 0.14, 0.42);
  const messageDensity = Math.min(msgCount * 0.01, 0.30);
  const memberDensity = Math.min(memberCount * 0.06, 0.16);

  return Math.min(1, 0.10 + hasDescription + forkDensity + messageDensity + memberDensity);
}

function getDataScore(childCount: number, messageCount: number, density: number): number {
  return messageCount + childCount * 8 + density * 10;
}

function isDeadCard(orbit: Orbit, childCount: number): boolean {
  const msgCount = orbit.messageCount || 0;
  return msgCount === 0 && !orbit.description && childCount === 0;
}

function getOrganicOffset(index: number) {
  return {
    x: Math.sin(index * 1.73) * 8,
    y: Math.cos(index * 1.17) * 6,
  };
}

/**
 * Compute node positions (top-left corner, React Flow space) for the living map.
 *
 * Persisted coords (positionX/Y) are used as-is and pinned; orbits without a
 * saved position are placed by a force simulation that settles them around the
 * pinned ones. The simulation runs in "center space" (node midpoints) and the
 * result is converted back to top-left so persisted nodes round-trip exactly.
 */
function computePositions(
  visibleOrbits: Orbit[],
  forkRelationships: ForkRelationship[],
  ignorePersisted = false
) {
  const halfW = NODE_WIDTH / 2;
  const halfH = NODE_HEIGHT / 2;

  const existingPositions = new Map<string, { x: number; y: number }>();
  const pinnedIds = new Set<string>();

  if (!ignorePersisted) {
    for (const orbit of visibleOrbits) {
      if (
        typeof orbit.positionX === "number" &&
        typeof orbit.positionY === "number"
      ) {
        // Stored as top-left → seed the sim with the center point.
        existingPositions.set(orbit.id, {
          x: orbit.positionX + halfW,
          y: orbit.positionY + halfH,
        });
        pinnedIds.add(orbit.id);
      }
    }
  }

  const visibleIds = new Set(visibleOrbits.map((o) => o.id));
  const links = forkRelationships
    .filter(
      (rel) =>
        visibleIds.has(rel.parentSferaId) && visibleIds.has(rel.forkedSferaId)
    )
    .map((rel) => ({ source: rel.parentSferaId, target: rel.forkedSferaId }));

  const spread = Math.max(1200, Math.sqrt(visibleOrbits.length) * 460);

  const centers = computeForceLayout(
    visibleOrbits.map((o) => ({ id: o.id })),
    links,
    {
      width: spread,
      height: spread * 0.72,
      nodeRadius: 165,
      linkDistance: 280,
      chargeStrength: -1500,
      existingPositions,
      pinnedIds,
    }
  );

  // Convert centers → top-left.
  const positions = new Map<string, { x: number; y: number }>();
  for (const [id, c] of centers) {
    positions.set(id, { x: c.x - halfW, y: c.y - halfH });
  }
  return positions;
}

function buildGraph(
  orbits: Orbit[],
  forkRelationships: ForkRelationship[],
  currentUserId?: string,
  onSettingsClick?: (orbit: Orbit) => void,
  onDeleteClick?: (orbit: Orbit) => void,
  onSelectOrbit?: (id: string) => void
) {
  const childCountMap = new Map<string, number>();
  for (const orbit of orbits) {
    childCountMap.set(orbit.id, getChildCount(orbit.id, forkRelationships));
  }

  const deadIds = new Set<string>();
  const hiddenForkIds = new Set<string>();

  for (const orbit of orbits) {
    const cc = childCountMap.get(orbit.id) || 0;
    if (isDeadCard(orbit, cc)) {
      deadIds.add(orbit.id);
    }
  }

  for (const orbit of orbits) {
    const cc = childCountMap.get(orbit.id) || 0;
    if (cc >= 4) {
      const children = forkRelationships
        .filter((r) => r.parentSferaId === orbit.id)
        .map((r) => orbits.find((o) => o.id === r.forkedSferaId))
        .filter(Boolean) as Orbit[];

      const scored = children
        .map((c) => ({
          orbit: c,
          score: getDataScore(
            childCountMap.get(c.id) || 0,
            c.messageCount || 0,
            getDensity(c, childCountMap.get(c.id) || 0)
          ),
        }))
        .sort((a, b) => b.score - a.score);

      const visibleCount = Math.ceil(cc / 2);
      for (let i = visibleCount; i < scored.length; i++) {
        hiddenForkIds.add(scored[i].orbit.id);
      }
    }
  }

  const allHidden = new Set<string>([...deadIds, ...hiddenForkIds]);
  const visibleOrbits = orbits.filter((o) => !allHidden.has(o.id));
  const positions = computePositions(visibleOrbits, forkRelationships);

  const clusterMap = findClusters(
    visibleOrbits.map((o) => o.id),
    forkRelationships
  );

  const nodes: Node<OrbitNodeData>[] = visibleOrbits.map((orbit, index) => {
    const fallback = { x: CANVAS_CENTER_X, y: ROOT_Y };
    const pos = positions.get(orbit.id) || fallback;
    const childCount = childCountMap.get(orbit.id) || 0;
    const density = getDensity(orbit, childCount);
    const lifeState = getLifeState(orbit, childCount);
    // Only jitter unplaced (never-persisted) nodes; pinned ones keep exact coords.
    const isPinned =
      typeof orbit.positionX === "number" &&
      typeof orbit.positionY === "number";
    const offset = isPinned ? { x: 0, y: 0 } : getOrganicOffset(index);
    const messageCount = orbit.messageCount || 0;

    return {
      id: orbit.id,
      type: "orbit",
      position: {
        x: pos.x + offset.x,
        y: pos.y + offset.y,
      },
      data: {
        id: orbit.id,
        title: orbit.title,
        description: orbit.description,
        visibility: orbit.visibility,
        role: orbit.role,
        ownerId: orbit.ownerId,
        childCount,
        messageCount,
        createdAt: orbit.createdAt,
        updatedAt: orbit.updatedAt,
        activityLabel: getActivityLabel(orbit, childCount),
        lifeState,
        density,
        isSleeping: false,
        recentParticipants: orbit.recentParticipants || [],
        insightBadges: [],
        currentUserId,
        onSettingsClick: () => onSettingsClick?.(orbit),
        onDeleteClick: () => onDeleteClick?.(orbit),
        onSelectOrbit: () => onSelectOrbit?.(orbit.id),
      },
    };
  });

  const visibleIds = new Set(visibleOrbits.map((o) => o.id));

  const edges: Edge[] = forkRelationships
    .filter((rel) => visibleIds.has(rel.parentSferaId) && visibleIds.has(rel.forkedSferaId))
    .map((rel) => {
      const parentOrbit = orbits.find((o) => o.id === rel.parentSferaId);
      const childOrbit = orbits.find((o) => o.id === rel.forkedSferaId);
      const parentCC = childCountMap.get(rel.parentSferaId) || 0;
      const childCC = childCountMap.get(rel.forkedSferaId) || 0;
      const parentLife = parentOrbit ? getLifeState(parentOrbit, parentCC) : "quiet";
      const childLife = childOrbit ? getLifeState(childOrbit, childCC) : "quiet";
      const parentColor = LIFE_STATE_COLORS[parentLife] || LIFE_STATE_COLORS.quiet;
      const childColor = LIFE_STATE_COLORS[childLife] || LIFE_STATE_COLORS.quiet;
      const parentMsg = parentOrbit?.messageCount || 0;
      const childMsg = childOrbit?.messageCount || 0;
      const intensity = Math.min(1, (parentMsg + childMsg) / 30);
      const opacity = 0.15 + intensity * 0.20;
      const width = 1.5 + intensity * 0.8;

      return {
        id: `${rel.parentSferaId}-${rel.forkedSferaId}`,
        source: rel.parentSferaId,
        target: rel.forkedSferaId,
        type: "orbit",
        animated: false,
        data: {
          baseStroke: `rgba(${parentColor}, ${opacity})`,
          glowColor: childColor,
          intensity,
        },
        style: {
          stroke: `rgba(${parentColor}, ${opacity})`,
          strokeWidth: width,
          strokeLinecap: "round" as const,
          filter: `drop-shadow(0 0 ${2 + intensity * 2}px rgba(${childColor}, ${opacity * 0.6}))`,
        },
      };
    });

  const archiveCount = deadIds.size + hiddenForkIds.size;

  return {
    nodes,
    edges,
    archiveCount,
    archiveOrbits: orbits.filter((o) => allHidden.has(o.id)),
    clusterMap,
  };
}

function OrbitNetworkTimelineInner({
  orbits,
  forkRelationships,
  currentUserId,
  onUpdate,
  selectedOrbitId,
  onSelectOrbit,
}: OrbitNetworkTimelineProps) {
  const router = useRouter();
  const { fitView } = useReactFlow();
  const [selectedOrbitForSettings, setSelectedOrbitForSettings] =
    useState<Orbit | null>(null);
  const [orbitMembers, setOrbitMembers] = useState<Member[]>([]);
  const [, setIsLoadingMembers] = useState(false);
  const [orbitToDelete, setOrbitToDelete] = useState<Orbit | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showArchive, setShowArchive] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string | null>(null);
  const [visibilityFilter, setVisibilityFilter] = useState<string | null>(
    null
  );
  const { viewMode, setViewMode } = useOrbitViewMode();
  const graphRef = useRef<HTMLDivElement>(null);
  // Snapshot of positions at drag start, for group-drag deltas.
  const dragStartRef = useRef<Map<string, XYPosition> | null>(null);

  const handleSelectOrbit = useCallback(
    (id: string) => {
      onSelectOrbit?.(id);
      window.history.pushState({ orbitId: id }, "", `/${id}`);
    },
    [onSelectOrbit]
  );

  const handleCloseOrbit = useCallback(() => {
    onSelectOrbit?.(null);
    window.history.pushState({}, "", "/");
  }, [onSelectOrbit]);

  const handleGoFullScreen = useCallback(
    (id: string) => {
      router.push(`/${id}`);
    },
    [router]
  );

  useEffect(() => {
    if (selectedOrbitId) return;
    const path = window.location.pathname;
    const uuid = path.replace(/^\//, "");
    if (uuid && uuid.length > 10) {
      onSelectOrbit?.(uuid);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && selectedOrbitId) {
        handleCloseOrbit();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedOrbitId, handleCloseOrbit]);

  const handleOpenSettings = async (orbit: Orbit) => {
    setSelectedOrbitForSettings(orbit);
    setIsLoadingMembers(true);
    try {
      const response = await fetch(`/api/sfera/${orbit.id}`);
      if (response.ok) {
        const data = await response.json();
        setOrbitMembers(data.members || []);
      }
    } catch (error) {
      console.error("Error fetching orbit members:", error);
      toast.error("Failed to load orbit members");
    } finally {
      setIsLoadingMembers(false);
    }
  };

  const handleCloseSettings = () => {
    setSelectedOrbitForSettings(null);
    setOrbitMembers([]);
  };

  const handleSettingsUpdate = () => {
    onUpdate?.();
  };

  const handleDeleteOrbit = async () => {
    if (!orbitToDelete) return;

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/sfera/${orbitToDelete.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error || "Не удалось удалить");
      }

      toast.success("Удалено");
      setOrbitToDelete(null);
      onUpdate?.();
    } catch (error) {
      console.error("Error deleting Orbit:", error);
      toast.error(
        error instanceof Error ? error.message : "Не удалось удалить"
      );
    } finally {
      setIsDeleting(false);
    }
  };

  const hasActiveFilters = Boolean(
    searchQuery.trim() || roleFilter || visibilityFilter
  );

  const filteredOrbits = useMemo(() => {
    if (!hasActiveFilters) return orbits;
    const query = searchQuery.trim().toLowerCase();
    return orbits.filter((orbit) => {
      if (
        query &&
        !orbit.title.toLowerCase().includes(query) &&
        !orbit.description?.toLowerCase().includes(query)
      ) {
        return false;
      }
      if (roleFilter && orbit.role !== roleFilter) return false;
      if (visibilityFilter && orbit.visibility !== visibilityFilter) {
        return false;
      }
      return true;
    });
  }, [orbits, hasActiveFilters, searchQuery, roleFilter, visibilityFilter]);

  const {
    nodes: initialNodes,
    edges: initialEdges,
    archiveCount,
    archiveOrbits,
    clusterMap,
  } = useMemo(() => {
    return buildGraph(
      filteredOrbits,
      forkRelationships,
      currentUserId,
      handleOpenSettings,
      setOrbitToDelete,
      handleSelectOrbit
    );
  }, [filteredOrbits, forkRelationships, currentUserId, handleSelectOrbit]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  useEffect(() => {
    setNodes(initialNodes);
    setEdges(initialEdges);
  }, [initialNodes, initialEdges, setNodes, setEdges]);

  // Reflect selection + dimming into node data without rebuilding the graph.
  const decoratedNodes = useMemo(() => {
    const hasSelection = selectedIds.size > 0;
    return nodes.map((node) => {
      const isSelected = selectedIds.has(node.id);
      const dimmed = hasSelection && !isSelected;
      if (node.data.dimmed === dimmed) return node;
      return { ...node, data: { ...node.data, dimmed } };
    });
  }, [nodes, selectedIds]);

  const persistPositions = useCallback(
    async (updates: Array<{ id: string; positionX: number; positionY: number }>) => {
      if (updates.length === 0) return;
      try {
        const res = await fetch("/api/sfera/positions", {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ updates }),
        });
        if (!res.ok) throw new Error(`${res.status}`);
      } catch {
        toast.error("Не удалось сохранить позицию");
        onUpdate?.(); // refetch → snap back to persisted positions
      }
    },
    [onUpdate]
  );

  const handleNodeDragStart = useCallback(
    (_: unknown, node: Node<OrbitNodeData>) => {
      const isGroup = selectedIds.has(node.id) && selectedIds.size > 1;
      const snapshot = new Map<string, XYPosition>();
      const targets = isGroup
        ? nodes.filter((n) => selectedIds.has(n.id))
        : [node];
      for (const n of targets) {
        snapshot.set(n.id, { x: n.position.x, y: n.position.y });
      }
      dragStartRef.current = snapshot;
    },
    [nodes, selectedIds]
  );

  const handleNodeDrag = useCallback(
    (_: unknown, node: Node<OrbitNodeData>) => {
      const snapshot = dragStartRef.current;
      if (!snapshot || snapshot.size <= 1) return;
      const start = snapshot.get(node.id);
      if (!start) return;
      const dx = node.position.x - start.x;
      const dy = node.position.y - start.y;
      // Move the rest of the group by the same delta as the dragged node.
      setNodes((prev) =>
        prev.map((n) => {
          if (n.id === node.id || !snapshot.has(n.id)) return n;
          const s = snapshot.get(n.id) as XYPosition;
          return { ...n, position: { x: s.x + dx, y: s.y + dy } };
        })
      );
    },
    [setNodes]
  );

  const handleNodeDragStop = useCallback(
    (_: unknown, node: Node<OrbitNodeData>) => {
      const snapshot = dragStartRef.current;
      const ids =
        snapshot && snapshot.size > 1 ? [...snapshot.keys()] : [node.id];
      const byId = new Map(nodes.map((n) => [n.id, n]));
      const updates = ids
        .map((id) => byId.get(id))
        .filter(Boolean)
        .map((n) => ({
          id: (n as Node).id,
          positionX: (n as Node).position.x,
          positionY: (n as Node).position.y,
        }));
      dragStartRef.current = null;
      void persistPositions(updates);
    },
    [nodes, persistPositions]
  );

  const handleSelectionChange = useCallback(
    (params: OnSelectionChangeParams) => {
      const next = params.nodes.map((n) => n.id);
      setSelectedIds((prev) => {
        if (prev.size === next.length && next.every((id) => prev.has(id))) {
          return prev; // unchanged — keep reference to avoid a render loop
        }
        return new Set(next);
      });
    },
    []
  );

  const handleReshuffle = useCallback(() => {
    // Recompute a fresh force layout ignoring persisted coords, apply it, and
    // persist the result so it becomes the new baseline.
    const nodeIds = new Set(nodes.map((n) => n.id));
    const visible = orbits.filter((o) => nodeIds.has(o.id));
    const positions = computePositions(visible, forkRelationships, true);
    setNodes((prev) =>
      prev.map((n) => {
        const p = positions.get(n.id);
        return p ? { ...n, position: p } : n;
      })
    );
    const updates = [...positions.entries()].map(([id, p]) => ({
      id,
      positionX: p.x,
      positionY: p.y,
    }));
    void persistPositions(updates);
  }, [nodes, orbits, forkRelationships, setNodes, persistPositions]);

  const handleResetPositions = useCallback(async () => {
    const ids = nodes.map((n) => n.id);
    try {
      // Persisting null clears saved coords → force layout takes over on refetch.
      const res = await fetch("/api/sfera/positions", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          updates: ids.map((id) => ({ id, positionX: null, positionY: null })),
        }),
      });
      if (!res.ok) throw new Error(`${res.status}`);
      onUpdate?.();
      toast.success("Раскладка сброшена");
    } catch {
      toast.error("Не удалось сбросить раскладку");
    }
  }, [nodes, onUpdate]);

  // Clear selection on Escape (independent of the orbit-close Escape below).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && selectedIds.size > 0) {
        setSelectedIds(new Set());
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedIds]);

  if (orbits.length === 0) {
    return (
      <div className="relative flex min-h-screen items-center justify-center px-6">
        <div className="pointer-events-none absolute h-72 w-72 rounded-full bg-violet-200/20 blur-3xl" />
        <div className="relative max-w-sm text-center">
          <div className="mx-auto mb-8 h-3 w-3 rounded-full bg-violet-300 shadow-[0_0_40px_rgba(168,85,247,0.45)]" />
          <p className="mb-3 text-[11px] uppercase tracking-[0.34em] text-neutral-400">
            Пустая вселенная
          </p>
          <h1 className="font-medium text-3xl text-neutral-900 tracking-[-0.04em]">
            Создайте то, что еще не имеет формы.
          </h1>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Search + filters */}
      <div className="pointer-events-auto fixed top-4 left-1/2 z-20 hidden w-full max-w-xl -translate-x-1/2 px-6 md:block">
        <OrbitControlBar
          hasActiveFilters={hasActiveFilters}
          hideViewToggle
          onRoleFilterChange={setRoleFilter}
          onSearchChange={setSearchQuery}
          onViewModeChange={setViewMode}
          onVisibilityFilterChange={setVisibilityFilter}
          resultCount={filteredOrbits.length}
          roleFilter={roleFilter}
          searchQuery={searchQuery}
          totalCount={orbits.length}
          viewMode={viewMode}
          visibilityFilter={visibilityFilter}
        />
      </div>

      {hasActiveFilters && filteredOrbits.length === 0 && (
        <div className="pointer-events-none fixed inset-0 z-10 flex items-center justify-center">
          <p className="text-[11px] text-neutral-400 uppercase tracking-[0.2em]">
            Ничего не нашлось
          </p>
        </div>
      )}

      {/* Stats bar */}
      <div className="pointer-events-auto fixed bottom-6 left-6 z-20 hidden items-center gap-2 md:flex">
        <div className="whitespace-nowrap rounded-full border border-white/70 bg-white/55 px-4 py-2 text-[11px] text-neutral-400 shadow-[0_18px_60px_rgba(15,23,42,0.08)] backdrop-blur-2xl">
          {nodes.length} {nodes.length === 1 ? "мысль" : "живых точек"} · {edges.length} связей · {filteredOrbits.reduce((sum, o) => sum + (o.messageCount || 0), 0)} сообщений
          {archiveCount > 0 && (
            <span className="ml-1.5 text-neutral-300">· {archiveCount} в архиве</span>
          )}
        </div>
      </div>

      {/* Archive card */}
      {archiveCount > 0 && (
        <div className="pointer-events-auto fixed bottom-6 right-6 z-20">
          <button
            className="flex items-center gap-2 rounded-[18px] border border-white/50 bg-white/45 px-4 py-3 text-[12px] text-neutral-500 shadow-[0_14px_40px_rgba(15,23,42,0.07)] backdrop-blur-2xl"
            onClick={() => setShowArchive(!showArchive)}
          >
            <Archive className="h-3.5 w-3.5" />
            {showArchive ? "Скрыть архив" : `${archiveCount} в архиве`}
          </button>
        </div>
      )}

      {/* Expanded archive panel */}
      {showArchive && archiveOrbits.length > 0 && (
        <div className="pointer-events-auto fixed inset-x-6 bottom-20 z-20 max-h-[40vh] overflow-y-auto rounded-[20px] border border-white/50 bg-white/60 p-4 shadow-[0_20px_60px_rgba(15,23,42,0.12)] backdrop-blur-2xl">
          <p className="mb-3 text-[10px] uppercase tracking-[0.2em] text-neutral-400">
            Архив · {archiveOrbits.length} карточек
          </p>
          <div className="flex flex-wrap gap-2">
            {archiveOrbits.map((orbit) => (
              <button
                key={orbit.id}
                className="rounded-[14px] border border-white/40 bg-white/50 px-3 py-2 text-left text-[12px] text-neutral-600 backdrop-blur-xl"
                onClick={() => handleSelectOrbit(orbit.id)}
              >
                {orbit.title}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="relative h-[100dvh] w-full" ref={graphRef}>
        <ReactFlow
          nodes={decoratedNodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeDragStart={handleNodeDragStart}
          onNodeDrag={handleNodeDrag}
          onNodeDragStop={handleNodeDragStop}
          onSelectionChange={handleSelectionChange}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          fitView
          fitViewOptions={{ padding: 0.25 }}
          nodesDraggable
          nodesConnectable={false}
          elementsSelectable
          selectionOnDrag
          selectionMode={SelectionMode.Partial}
          panOnDrag={false}
          panOnScroll
          zoomOnScroll={false}
          zoomOnPinch
          zoomActivationKeyCode="Meta"
          preventScrolling
          minZoom={0.4}
          maxZoom={2}
          nodeDragThreshold={4}
          onlyRenderVisibleElements={filteredOrbits.length > 50}
          proOptions={{ hideAttribution: true }}
          className="orbital-flow"
          style={{ background: "transparent" }}
        >
          <Background color="rgba(15,23,42,0.04)" gap={32} size={1} />
          <ClusterOverlay
            clusterMap={clusterMap}
            nodeHeight={NODE_HEIGHT}
            nodes={nodes}
            nodeWidth={NODE_WIDTH}
          />
          <Panel className="!mt-16" position="top-right">
            <OrbitToolbar
              onFitView={() => fitView({ padding: 0.2, duration: 400 })}
              onReset={handleResetPositions}
              onReshuffle={handleReshuffle}
            />
          </Panel>
        </ReactFlow>
      </div>

      {selectedOrbitForSettings && (
        <OrbitSettings
          currentDescription={selectedOrbitForSettings.description}
          currentMembers={orbitMembers}
          currentTitle={selectedOrbitForSettings.title}
          isOpen={!!selectedOrbitForSettings}
          isOwner={selectedOrbitForSettings.ownerId === currentUserId}
          onClose={handleCloseSettings}
          onUpdate={handleSettingsUpdate}
          orbitId={selectedOrbitForSettings.id}
        />
      )}

      <AlertDialog
        onOpenChange={(open) => !open && setOrbitToDelete(null)}
        open={!!orbitToDelete}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить?</AlertDialogTitle>
            <AlertDialogDescription>
              &ldquo;{orbitToDelete?.title}&rdquo; исчезнет вместе с сообщениями,
              участниками и ответвлениями. Это действие нельзя отменить.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Отмена</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 text-white hover:bg-red-700"
              disabled={isDeleting}
              onClick={handleDeleteOrbit}
            >
              {isDeleting ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Удаляем...
                </span>
              ) : (
                "Удалить"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {selectedOrbitId && (
        <OrbitChatPanel
          orbitId={selectedOrbitId}
          currentUserId={currentUserId}
          onClose={handleCloseOrbit}
          onGoFullScreen={handleGoFullScreen}
        />
      )}
    </>
  );
}

export function OrbitNetworkTimeline(props: OrbitNetworkTimelineProps) {
  // ReactFlowProvider is required so the toolbar/overlays can use useReactFlow.
  return (
    <ReactFlowProvider>
      <OrbitNetworkTimelineInner {...props} />
    </ReactFlowProvider>
  );
}
