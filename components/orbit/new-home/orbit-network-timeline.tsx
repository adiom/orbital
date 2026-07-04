"use client";

import {
  type Edge,
  type Node,
  ReactFlow,
  useNodesState,
  useEdgesState,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Loader2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
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
import { OrbitSettings } from "../orbit-settings";
import { OrbitNode, type OrbitNodeData } from "./orbit-node";

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
};

const nodeTypes = {
  orbit: OrbitNode,
};

const NODE_WIDTH = 280;
const NODE_HEIGHT = 210;
const CANVAS_CENTER_X = 720;
const ROOT_Y = 220;
const CHILD_Y_GAP = 330;
const ROW_Y_GAP = 245;

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
  const updatedAt = new Date(orbit.updatedAt).getTime();
  const ageInMinutes = Math.max(1, Math.floor((Date.now() - updatedAt) / 60_000));

  if (ageInMinutes < 60) return "ожило недавно";
  if (ageInMinutes < 60 * 24) return "обсуждалось сегодня";
  if (childCount > 0) return "есть новые ветви";
  return "ждет продолжения";
}

function getDensity(orbit: Orbit, childCount: number) {
  const hasDescription = orbit.description ? 0.16 : 0;
  const forkDensity = Math.min(childCount * 0.16, 0.48);
  const updatedAt = new Date(orbit.updatedAt).getTime();
  const ageInHours = (Date.now() - updatedAt) / (1000 * 60 * 60);
  const recencyDensity = Math.max(0, 0.36 - ageInHours / 240);

  return Math.min(1, 0.18 + hasDescription + forkDensity + recencyDensity);
}

function getOrganicOffset(index: number) {
  return {
    x: Math.sin(index * 1.73) * 38,
    y: Math.cos(index * 1.17) * 28,
  };
}

function buildRelationshipMaps(forkRelationships: ForkRelationship[]) {
  const childrenMap = new Map<string, string[]>();
  const parentMap = new Map<string, string>();

  for (const rel of forkRelationships) {
    const existingChildren = childrenMap.get(rel.parentSferaId) || [];
    childrenMap.set(rel.parentSferaId, [...existingChildren, rel.forkedSferaId]);
    parentMap.set(rel.forkedSferaId, rel.parentSferaId);
  }

  return { childrenMap, parentMap };
}

function getCenteredColumnOffset(index: number, total: number, maxColumns: number) {
  const row = Math.floor(index / maxColumns);
  const column = index % maxColumns;
  const itemsInRow = Math.min(maxColumns, total - row * maxColumns);

  return column - (itemsInRow - 1) / 2;
}

function getConstellationPositions(
  orbits: Orbit[],
  forkRelationships: ForkRelationship[]
) {
  const { childrenMap, parentMap } = buildRelationshipMaps(forkRelationships);
  const orbitIds = new Set(orbits.map((orbit) => orbit.id));
  const roots = orbits.filter((orbit) => !parentMap.has(orbit.id));
  const fallbackRoots = roots.length > 0 ? roots : orbits.slice(0, 1);
  const positions = new Map<string, { x: number; y: number }>();
  const visited = new Set<string>();

  const placeBranch = (id: string, centerX: number, centerY: number) => {
    if (visited.has(id) || !orbitIds.has(id)) return;

    visited.add(id);
    positions.set(id, {
      x: centerX - NODE_WIDTH / 2,
      y: centerY - NODE_HEIGHT / 2,
    });

    const children = (childrenMap.get(id) || []).filter((childId) =>
      orbitIds.has(childId)
    );
    const maxColumns = children.length > 6 ? 4 : 3;
    const horizontalGap = children.length > 6 ? 315 : 365;

    children.forEach((childId, index) => {
      const row = Math.floor(index / maxColumns);
      const columnOffset = getCenteredColumnOffset(
        index,
        children.length,
        maxColumns
      );
      const stagger = row % 2 === 0 ? 0 : horizontalGap * 0.2;
      const childX = centerX + columnOffset * horizontalGap + stagger;
      const childY = centerY + CHILD_Y_GAP + row * ROW_Y_GAP;

      placeBranch(childId, Math.max(170, Math.min(1270, childX)), childY);
    });
  };

  const rootMaxColumns = fallbackRoots.length > 4 ? 3 : 2;
  fallbackRoots.forEach((root, index) => {
    const row = Math.floor(index / rootMaxColumns);
    const columnOffset = getCenteredColumnOffset(
      index,
      fallbackRoots.length,
      rootMaxColumns
    );
    const rootX = CANVAS_CENTER_X + columnOffset * 440;
    const rootY = ROOT_Y + row * 720;

    placeBranch(root.id, rootX, rootY);
  });

  const unplacedOrbits = orbits.filter((orbit) => !positions.has(orbit.id));
  unplacedOrbits.forEach((orbit, index) => {
    const row = Math.floor(index / 3);
    const columnOffset = getCenteredColumnOffset(index, unplacedOrbits.length, 3);
    positions.set(orbit.id, {
      x: CANVAS_CENTER_X + columnOffset * 360 - NODE_WIDTH / 2,
      y: ROOT_Y + 720 + row * 280 - NODE_HEIGHT / 2,
    });
  });

  return positions;
}

function buildGraph(
  orbits: Orbit[],
  forkRelationships: ForkRelationship[],
  currentUserId?: string,
  onSettingsClick?: (orbit: Orbit) => void,
  onDeleteClick?: (orbit: Orbit) => void
) {
  const positions = getConstellationPositions(orbits, forkRelationships);

  const nodes: Node<OrbitNodeData>[] = orbits.map((orbit, index) => {
    const pos = positions.get(orbit.id) || { x: CANVAS_CENTER_X, y: ROOT_Y };
    const childCount = getChildCount(orbit.id, forkRelationships);
    const density = getDensity(orbit, childCount);
    const lifeState = getLifeState(orbit, childCount);
    const offset = getOrganicOffset(index);

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
        createdAt: orbit.createdAt,
        updatedAt: orbit.updatedAt,
        activityLabel: getActivityLabel(orbit, childCount),
        lifeState,
        density,
        recentParticipants: [],
        insightBadges: [],
        currentUserId,
        onSettingsClick: () => onSettingsClick?.(orbit),
        onDeleteClick: () => onDeleteClick?.(orbit),
      },
    };
  });

  const edges: Edge[] = forkRelationships.map((rel) => ({
    id: `${rel.parentSferaId}-${rel.forkedSferaId}`,
    source: rel.parentSferaId,
    target: rel.forkedSferaId,
    type: "default",
    animated: false,
    style: {
      stroke: "rgba(120, 113, 108, 0.22)",
      strokeLinecap: "round",
      strokeWidth: 1.4,
    },
  }));

  return { nodes, edges };
}

export function OrbitNetworkTimeline({
  orbits,
  forkRelationships,
  currentUserId,
  onUpdate,
}: OrbitNetworkTimelineProps) {
  const [selectedOrbitForSettings, setSelectedOrbitForSettings] =
    useState<Orbit | null>(null);
  const [orbitMembers, setOrbitMembers] = useState<Member[]>([]);
  const [, setIsLoadingMembers] = useState(false);
  const [orbitToDelete, setOrbitToDelete] = useState<Orbit | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

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

  const { initialNodes, initialEdges } = useMemo(() => {
    const { nodes, edges } = buildGraph(
      orbits,
      forkRelationships,
      currentUserId,
      handleOpenSettings,
      setOrbitToDelete
    );
    return { initialNodes: nodes, initialEdges: edges };
  }, [orbits, forkRelationships, currentUserId]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  useEffect(() => {
    setNodes(initialNodes);
    setEdges(initialEdges);
  }, [initialNodes, initialEdges, setNodes, setEdges]);

  if (orbits.length === 0) {
    return (
      <div className="relative flex min-h-screen items-center justify-center px-6">
        <div className="pointer-events-none absolute h-72 w-72 rounded-full bg-violet-200/20 blur-3xl" />
        <div className="relative max-w-sm text-center">
          <div className="mx-auto mb-8 h-3 w-3 rounded-full bg-violet-300 shadow-[0_0_40px_rgba(168,85,247,0.45)] orbital-drift" />
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

  // The canvas grows with the constellation, leaving quiet space around ideas.
  let minX = Infinity,
    maxX = -Infinity,
    minY = Infinity,
    maxY = -Infinity;
  for (const node of nodes) {
    minX = Math.min(minX, node.position.x);
    maxX = Math.max(maxX, node.position.x + NODE_WIDTH);
    minY = Math.min(minY, node.position.y);
    maxY = Math.max(maxY, node.position.y + NODE_HEIGHT);
  }
  const graphHeight = Math.max(760, maxY - minY + 280);

  return (
    <>
      <div className="pointer-events-none absolute left-[12%] top-32 h-2 w-2 rounded-full bg-sky-200/80 blur-[1px] orbital-drift" />
      <div className="pointer-events-none absolute right-[18%] top-[38rem] h-1.5 w-1.5 rounded-full bg-violet-200/80 blur-[1px] orbital-drift-slow" />
      <div className="pointer-events-none absolute left-[68%] top-[18rem] h-1 w-1 rounded-full bg-emerald-200/80 blur-[1px] orbital-drift" />
      <div className="pointer-events-none fixed bottom-6 left-6 z-20 hidden max-w-xs rounded-full border border-white/70 bg-white/55 px-4 py-2 text-[11px] text-neutral-400 shadow-[0_18px_60px_rgba(15,23,42,0.08)] backdrop-blur-2xl md:block">
        {orbits.length} {orbits.length === 1 ? "мысль" : "живых точек"} · {forkRelationships.length} связей
      </div>

      <div className="relative w-full" style={{ height: graphHeight }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          nodeTypes={nodeTypes}
          fitView={false}
          nodesDraggable={false}
          nodesConnectable={false}
          elementsSelectable={false}
          zoomOnScroll={false}
          zoomOnPinch={false}
          panOnDrag={false}
          panOnScroll={false}
          preventScrolling={false}
          minZoom={0.5}
          maxZoom={2}
          proOptions={{ hideAttribution: true }}
          className="pointer-events-none"
          style={{ background: "transparent" }}
          defaultViewport={{ x: 90, y: 120, zoom: 0.82 }}
        />
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
    </>
  );
}
