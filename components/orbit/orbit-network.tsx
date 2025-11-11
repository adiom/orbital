"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
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
import {
  type ForkRelationship,
  type Orbit,
  useOrbitLayout,
} from "@/hooks/use-orbit-layout";
import { useOrbitZoom } from "@/hooks/use-orbit-zoom";
import { OrbitContainer } from "./orbit-container";
import { OrbitSettings } from "./orbit-settings";
import { OrbitZoomControls } from "./orbit-zoom-controls";

type Member = {
  userId: string;
  email: string;
  role: string;
};

type OrbitNetworkProps = {
  orbits: Orbit[];
  forkRelationships: ForkRelationship[];
  currentUserId?: string;
  onUpdate?: () => void;
};

export function OrbitNetwork({
  orbits,
  forkRelationships,
  currentUserId,
  onUpdate,
}: OrbitNetworkProps) {
  const router = useRouter();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // State
  const [selectedOrbitForSettings, setSelectedOrbitForSettings] =
    useState<Orbit | null>(null);
  const [orbitMembers, setOrbitMembers] = useState<Member[]>([]);
  const [_isLoadingMembers, setIsLoadingMembers] = useState(false);
  const [orbitToDelete, setOrbitToDelete] = useState<Orbit | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Custom hooks
  const { nodePositions } = useOrbitLayout(orbits, forkRelationships);
  const { zoom, zoomIn, zoomOut, resetZoom, fitToView } = useOrbitZoom();

  const { hoveredNode, handleCanvasClick, handleCanvasMove } =
    useOrbitInteractions(canvasRef, nodePositions, (nodeId) =>
      router.push(`/orbit/${nodeId}`)
    );

  // Render canvas connections
  useOrbitCanvas(canvasRef, nodePositions, forkRelationships);

  // Handlers
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
    if (!orbitToDelete) {
      return;
    }

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
        {/* Canvas for connections */}
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

        {/* Orbit nodes */}
        <div
          style={{
            transform: `scale(${zoom})`,
            transformOrigin: "center",
          }}
        >
          {Array.from(nodePositions.entries()).map(([id, pos]) => {
            const orbit = orbits.find((o) => o.id === id);
            if (!orbit) {
              return null;
            }

            const isHovered = hoveredNode === id;
            const childCount = forkRelationships.filter(
              (r) => r.parentSferaId === id
            ).length;

            return (
              <OrbitContainer
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

        {/* Zoom Controls */}
        <OrbitZoomControls
          onFitToView={fitToView}
          onReset={resetZoom}
          onZoomIn={zoomIn}
          onZoomOut={zoomOut}
          zoom={zoom}
        />
      </div>

      {/* Settings Dialog */}
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

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        onOpenChange={(open) => !open && setOrbitToDelete(null)}
        open={!!orbitToDelete}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Orbit</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{orbitToDelete?.title}"? This
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
