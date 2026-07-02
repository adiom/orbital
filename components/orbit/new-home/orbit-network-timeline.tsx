"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useRef, useState } from "react";
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
import { useOrbitCanvas } from "@/hooks/use-orbit-canvas";
import { useOrbitInteractions } from "@/hooks/use-orbit-interactions";
import type { ForkRelationship, Orbit } from "@/hooks/use-orbit-layout";
import { useOrbitZoom } from "@/hooks/use-orbit-zoom";
import { OrbitSettings } from "../orbit-settings";
import { OrbitZoomControls } from "../orbit-zoom-controls";
import { OrbitContainerTimeline } from "./orbit-container-timeline";

type Member = {
  userId: string;
  email: string;
  role: string;
};

export type NodePosition = {
  x: number;
  y: number;
  id: string;
};

type OrbitNetworkTimelineProps = {
  orbits: Orbit[];
  forkRelationships: ForkRelationship[];
  currentUserId?: string;
  onUpdate?: () => void;
};

// Простейший layout по времени создания: ось X = createdAt, ось Y = уровень форка
function useTimelineLayout(
  orbits: Orbit[],
  forkRelationships: ForkRelationship[]
) {
  const nodePositions = useMemo(() => {
    if (orbits.length === 0) {
      return new Map<string, NodePosition>();
    }

    const positions = new Map<string, NodePosition>();

    // parent map по forkRelationships
    const parentMap = new Map<string, string>();
    for (const rel of forkRelationships) {
      parentMap.set(rel.forkedSferaId, rel.parentSferaId);
    }

    // уровень по цепочке родителей
    const levels = new Map<string, number>();
    const getLevel = (id: string): number => {
      const cached = levels.get(id);
      if (cached !== undefined) return cached;
      const parent = parentMap.get(id);
      const level = parent ? getLevel(parent) + 1 : 0;
      levels.set(id, level);
      return level;
    };

    // сортируем по времени создания
    const sorted = [...orbits].sort((a, b) => {
      const aTime = new Date(a.createdAt).getTime();
      const bTime = new Date(b.createdAt).getTime();
      return aTime - bTime;
    });

    const minTime = new Date(sorted[0].createdAt).getTime();
    const maxTime = new Date(sorted[sorted.length - 1].createdAt).getTime();
    const timeSpan = Math.max(maxTime - minTime, 1);

    // Сетка по времени: делим ось X на равные слоты
    const maxSlots = Math.min(sorted.length, 12); // до 12 колонок
    const slotWidth = 1 / Math.max(maxSlots, 1);

    // ширину/высоту берём от окна; это client-only компонент
    const width = window.innerWidth - 160;
    const height = window.innerHeight - 260;

    const maxLevel = Math.max(
      0,
      ...sorted.map((orbit) => {
        return getLevel(orbit.id);
      })
    );

    sorted.forEach((orbit, index) => {
      const time = new Date(orbit.createdAt).getTime();
      const tNorm = (time - minTime) / timeSpan; // 0..1

      // дискретный индекс слота по времени
      const slotIndex = Math.min(
        maxSlots - 1,
        Math.floor(tNorm * maxSlots + 0.0001)
      );

      const level = getLevel(orbit.id);

      const xPadding = 80;
      const usableWidth = Math.max(width - xPadding * 2, 400);
      const slotCenter = xPadding + slotWidth * usableWidth * (slotIndex + 0.5);

      // фиксированные ряды по уровню форка
      const rowCount = Math.max(maxLevel + 1, 1);
      const topPadding = 80;
      const bottomPadding = 80;
      const usableHeight = Math.max(height - topPadding - bottomPadding, 240);
      const rowSpacing = rowCount > 1 ? usableHeight / (rowCount - 1) : 0;
      const y =
        rowCount === 1
          ? height / 2
          : topPadding + rowSpacing * Math.min(level, rowCount - 1);

      positions.set(orbit.id, { id: orbit.id, x: slotCenter, y });
    });

    return positions;
  }, [orbits, forkRelationships]);

  return { nodePositions };
}

export function OrbitNetworkTimeline({
  orbits,
  forkRelationships,
  currentUserId,
  onUpdate,
}: OrbitNetworkTimelineProps) {
  const router = useRouter();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [selectedOrbitForSettings, setSelectedOrbitForSettings] =
    useState<Orbit | null>(null);
  const [orbitMembers, setOrbitMembers] = useState<Member[]>([]);
  const [_isLoadingMembers, setIsLoadingMembers] = useState(false);
  const [orbitToDelete, setOrbitToDelete] = useState<Orbit | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const { nodePositions } = useTimelineLayout(orbits, forkRelationships);
  const { zoom, zoomIn, zoomOut, resetZoom, fitToView } = useOrbitZoom();

  const { hoveredNode, handleCanvasClick, handleCanvasMove } =
    useOrbitInteractions(canvasRef, nodePositions, (nodeId) =>
      router.push(`/orbit/${nodeId}`)
    );

  useOrbitCanvas(canvasRef, nodePositions, forkRelationships);

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
        throw new Error(payload.error || "Failed to delete Orbit");
      }

      toast.success("Orbit deleted successfully");
      setOrbitToDelete(null);
      onUpdate?.();
    } catch (error) {
      console.error("Error deleting Orbit:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to delete Orbit"
      );
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <div className="relative h-full">
        <canvas
          className="absolute inset-0 h-full w-full"
          onClick={handleCanvasClick}
          onMouseMove={handleCanvasMove}
          ref={canvasRef}
          style={{
            transform: `scale(${zoom})`,
            transformOrigin: "center",
          }}
        />

        <div
          style={{
            transform: `scale(${zoom})`,
            transformOrigin: "center",
          }}
        >
          {Array.from(nodePositions.entries()).map(([id, pos]) => {
            const orbit = orbits.find((o) => o.id === id);
            if (!orbit) return null;

            const isHovered = hoveredNode === id;
            const childCount = forkRelationships.filter(
              (r) => r.parentSferaId === id
            ).length;

            return (
              <OrbitContainerTimeline
                childCount={childCount}
                currentUserId={currentUserId}
                isHovered={isHovered}
                key={id}
                onDeleteClick={() => setOrbitToDelete(orbit)}
                onSettingsClick={() => handleOpenSettings(orbit)}
                orbit={orbit}
                position={pos}
              />
            );
          })}
        </div>

        <OrbitZoomControls
          onFitToView={fitToView}
          onReset={resetZoom}
          onZoomIn={zoomIn}
          onZoomOut={zoomOut}
          zoom={zoom}
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
            <AlertDialogTitle>Delete Orbit</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &ldquo;{orbitToDelete?.title}&rdquo;? This
              action cannot be undone. All messages, members, and forks will be
              removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 text-white hover:bg-red-700"
              disabled={isDeleting}
              onClick={handleDeleteOrbit}
            >
              {isDeleting ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Deleting...
                </span>
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
