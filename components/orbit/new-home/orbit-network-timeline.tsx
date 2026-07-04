"use client";

import {
  type Edge,
  type Node,
  ReactFlow,
  useNodesState,
  useEdgesState,
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
import { OrbitSettings } from "../orbit-settings";
import { OrbitChatPanel } from "../orbit-chat-panel";
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
  selectedOrbitId?: string | null;
  onSelectOrbit?: (id: string | null) => void;
};

const nodeTypes = {
  orbit: OrbitNode,
};

const NODE_WIDTH = 340;
const NODE_HEIGHT = 260;
const CANVAS_CENTER_X = 720;
const ROOT_Y = 100;
const CHILD_Y_GAP = 370;
const ROW_Y_GAP = 280;

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
    x: Math.sin(index * 1.73) * 15,
    y: Math.cos(index * 1.17) * 10,
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
  forkRelationships: ForkRelationship[],
  hiddenIds: Set<string>
) {
  const { childrenMap, parentMap } = buildRelationshipMaps(forkRelationships);
  const orbitIds = new Set(orbits.map((orbit) => orbit.id));
  const roots = orbits.filter((orbit) => !parentMap.has(orbit.id) && !hiddenIds.has(orbit.id));
  const fallbackRoots = roots.length > 0 ? roots : orbits.filter((o) => !hiddenIds.has(o.id)).slice(0, 1);
  const positions = new Map<string, { x: number; y: number }>();
  const visited = new Set<string>();

  const placeBranch = (id: string, centerX: number, centerY: number) => {
    if (visited.has(id) || !orbitIds.has(id) || hiddenIds.has(id)) return;

    visited.add(id);
    positions.set(id, {
      x: centerX - NODE_WIDTH / 2,
      y: centerY - NODE_HEIGHT / 2,
    });

    const children = (childrenMap.get(id) || []).filter(
      (childId) => orbitIds.has(childId) && !hiddenIds.has(childId)
    );
    const maxColumns = children.length > 6 ? 4 : 3;
    const horizontalGap = children.length > 6 ? 370 : 410;

    children.forEach((childId, index) => {
      const row = Math.floor(index / maxColumns);
      const columnOffset = getCenteredColumnOffset(
        index,
        children.length,
        maxColumns
      );
      const stagger = row % 2 === 0 ? 0 : horizontalGap * 0.15;
      const childX = centerX + columnOffset * horizontalGap + stagger;
      const childY = centerY + CHILD_Y_GAP + row * ROW_Y_GAP;

      placeBranch(childId, Math.max(140, Math.min(1300, childX)), childY);
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
    const rootX = CANVAS_CENTER_X + columnOffset * 460;
    const rootY = ROOT_Y + row * 640;

    placeBranch(root.id, rootX, rootY);
  });

  const unplacedOrbits = orbits.filter(
    (orbit) => !positions.has(orbit.id) && !hiddenIds.has(orbit.id)
  );
  unplacedOrbits.forEach((orbit, index) => {
    const row = Math.floor(index / 3);
    const columnOffset = getCenteredColumnOffset(index, unplacedOrbits.length, 3);
    positions.set(orbit.id, {
      x: CANVAS_CENTER_X + columnOffset * 380 - NODE_WIDTH / 2,
      y: ROOT_Y + 600 + row * 300 - NODE_HEIGHT / 2,
    });
  });

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
  const positions = getConstellationPositions(orbits, forkRelationships, allHidden);

  const visibleOrbits = orbits.filter((o) => !allHidden.has(o.id));

  const nodes: Node<OrbitNodeData>[] = visibleOrbits.map((orbit, index) => {
    const pos = positions.get(orbit.id) || { x: CANVAS_CENTER_X, y: ROOT_Y };
    const childCount = childCountMap.get(orbit.id) || 0;
    const density = getDensity(orbit, childCount);
    const lifeState = getLifeState(orbit, childCount);
    const offset = getOrganicOffset(index);
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
      const opacity = 0.30 + intensity * 0.35;
      const width = 1.8 + intensity * 1.2;

      return {
        id: `${rel.parentSferaId}-${rel.forkedSferaId}`,
        source: rel.parentSferaId,
        target: rel.forkedSferaId,
        type: "default",
        animated: false,
        style: {
          stroke: `rgba(${parentColor}, ${opacity})`,
          strokeWidth: width,
          strokeLinecap: "round" as const,
          filter: `drop-shadow(0 0 ${4 + intensity * 6}px rgba(${childColor}, ${opacity * 0.7}))`,
        },
      };
    });

  const archiveCount = deadIds.size + hiddenForkIds.size;

  return { nodes, edges, archiveCount, archiveOrbits: orbits.filter((o) => allHidden.has(o.id)) };
}

export function OrbitNetworkTimeline({
  orbits,
  forkRelationships,
  currentUserId,
  onUpdate,
  selectedOrbitId,
  onSelectOrbit,
}: OrbitNetworkTimelineProps) {
  const router = useRouter();
  const [selectedOrbitForSettings, setSelectedOrbitForSettings] =
    useState<Orbit | null>(null);
  const [orbitMembers, setOrbitMembers] = useState<Member[]>([]);
  const [, setIsLoadingMembers] = useState(false);
  const [orbitToDelete, setOrbitToDelete] = useState<Orbit | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showArchive, setShowArchive] = useState(false);
  const graphRef = useRef<HTMLDivElement>(null);

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

  const { nodes: initialNodes, edges: initialEdges, archiveCount, archiveOrbits } = useMemo(() => {
    return buildGraph(
      orbits,
      forkRelationships,
      currentUserId,
      handleOpenSettings,
      setOrbitToDelete,
      handleSelectOrbit
    );
  }, [orbits, forkRelationships, currentUserId, handleSelectOrbit]);

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
  const graphHeight = Math.max(760, maxY - minY + 320);

  return (
    <>
      {/* Stats bar */}
      <div className="pointer-events-auto fixed bottom-6 left-6 z-20 hidden items-center gap-2 md:flex">
        <div className="max-w-xs rounded-full border border-white/70 bg-white/55 px-4 py-2 text-[11px] text-neutral-400 shadow-[0_18px_60px_rgba(15,23,42,0.08)] backdrop-blur-2xl">
          {nodes.length} {nodes.length === 1 ? "мысль" : "живых точек"} · {edges.length} связей · {orbits.reduce((sum, o) => sum + (o.messageCount || 0), 0)} сообщений
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

      <div className="relative w-full" ref={graphRef} style={{ height: graphHeight }}>
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
          defaultViewport={{ x: 90, y: 50, zoom: 0.82 }}
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
