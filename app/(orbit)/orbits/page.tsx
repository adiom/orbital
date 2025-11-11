"use client";

import { GitBranch, Loader2, Plus, Sparkles } from "lucide-react";
import { redirect, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { OrbitContainer } from "@/components/orbit/orbit-container";
import { OrbitSettings } from "@/components/orbit/orbit-settings";
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
import { Button } from "@/components/ui/button";

type Orbit = {
  id: string;
  title: string;
  description: string | null;
  visibility: string;
  role: string;
  createdAt: Date;
  updatedAt: Date;
  ownerId: string;
};

type ForkRelationship = {
  parentSferaId: string;
  forkedSferaId: string;
  createdAt: Date;
};

type NodePosition = {
  x: number;
  y: number;
  id: string;
};

type Member = {
  userId: string;
  email: string;
  role: string;
};

export default function OrbitsPage() {
  const { status, data: session } = useSession();

  if (status === "unauthenticated") {
    redirect("/login");
  }

  const router = useRouter();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [orbits, setOrbits] = useState<Orbit[]>([]);
  const [forkRelationships, setForkRelationships] = useState<
    ForkRelationship[]
  >([]);
  const [isLoading, setIsLoading] = useState(true);
  const [nodePositions, setNodePositions] = useState<Map<string, NodePosition>>(
    new Map()
  );
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [selectedOrbitForSettings, setSelectedOrbitForSettings] =
    useState<Orbit | null>(null);
  const [orbitMembers, setOrbitMembers] = useState<Member[]>([]);
  const [_isLoadingMembers, setIsLoadingMembers] = useState(false);
  const [orbitToDelete, setOrbitToDelete] = useState<Orbit | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchOrbits = useCallback(async () => {
    try {
      const response = await fetch("/api/sfera", {
        credentials: "include",
      });

      if (response.status === 401) {
        window.location.href = `/login?callbackUrl=${encodeURIComponent(window.location.pathname)}`;
        return;
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to fetch orbits");
      }

      const data = await response.json();
      setOrbits(data.sferas || []);
      setForkRelationships(data.forkRelationships || []);
    } catch (error) {
      console.error("Error fetching orbits:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrbits();
  }, [fetchOrbits]);

  const buildTree = useCallback(() => {
    const childrenMap = new Map<string, string[]>();
    const parentMap = new Map<string, string>();

    for (const rel of forkRelationships) {
      if (!childrenMap.has(rel.parentSferaId)) {
        childrenMap.set(rel.parentSferaId, []);
      }
      childrenMap.get(rel.parentSferaId)?.push(rel.forkedSferaId);
      parentMap.set(rel.forkedSferaId, rel.parentSferaId);
    }

    const roots = orbits.filter((o) => !parentMap.has(o.id));

    return { childrenMap, parentMap, roots };
  }, [forkRelationships, orbits]);

  useEffect(() => {
    if (orbits.length === 0) {
      return;
    }

    const { parentMap, roots } = buildTree();
    const positions = new Map<string, NodePosition>();

    const containerWidth = window.innerWidth - 64;
    const containerHeight = window.innerHeight - 200;

    if (roots.length === 0 && orbits.length > 0) {
      for (let index = 0; index < orbits.length; index++) {
        const orbit = orbits[index];
        const angle = (index / orbits.length) * 2 * Math.PI;
        const radius = Math.min(containerWidth, containerHeight) * 0.35;
        positions.set(orbit.id, {
          id: orbit.id,
          x: containerWidth / 2 + radius * Math.cos(angle),
          y: containerHeight / 2 + radius * Math.sin(angle),
        });
      }
    } else {
      const levels = new Map<string, number>();
      const getLevel = (id: string): number => {
        const cachedLevel = levels.get(id);
        if (cachedLevel !== undefined) {
          return cachedLevel;
        }
        const parent = parentMap.get(id);
        const level = parent ? getLevel(parent) + 1 : 0;
        levels.set(id, level);
        return level;
      };

      for (const o of orbits) {
        getLevel(o.id);
      }
      const maxLevel = Math.max(...Array.from(levels.values()));

      const levelGroups = new Map<number, string[]>();
      for (const o of orbits) {
        const level = levels.get(o.id) || 0;
        if (!levelGroups.has(level)) {
          levelGroups.set(level, []);
        }
        levelGroups.get(level)?.push(o.id);
      }

      for (const [level, ids] of levelGroups) {
        const y = (level / (maxLevel || 1)) * (containerHeight - 100) + 50;
        for (let index = 0; index < ids.length; index++) {
          const id = ids[index];
          const x = ((index + 1) / (ids.length + 1)) * containerWidth;
          positions.set(id, { id, x, y });
        }
      }
    }

    setNodePositions(positions);
  }, [orbits, buildTree]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || nodePositions.size === 0) {
      return;
    }

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return;
    }

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();

    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    ctx.clearRect(0, 0, rect.width, rect.height);

    // Draw connections with gradient
    for (const rel of forkRelationships) {
      const parent = nodePositions.get(rel.parentSferaId);
      const child = nodePositions.get(rel.forkedSferaId);
      if (parent && child) {
        const gradient = ctx.createLinearGradient(
          parent.x,
          parent.y,
          child.x,
          child.y
        );
        gradient.addColorStop(0, "#3b82f6");
        gradient.addColorStop(1, "#a855f7");

        ctx.strokeStyle = gradient;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(parent.x, parent.y);

        const midX = (parent.x + child.x) / 2;
        const midY = (parent.y + child.y) / 2;
        const offset = 40;
        ctx.quadraticCurveTo(midX + offset, midY, child.x, child.y);

        ctx.stroke();

        // Arrow
        const angle = Math.atan2(child.y - midY, child.x - (midX + offset));
        ctx.beginPath();
        ctx.moveTo(child.x, child.y);
        ctx.lineTo(
          child.x - 12 * Math.cos(angle - Math.PI / 6),
          child.y - 12 * Math.sin(angle - Math.PI / 6)
        );
        ctx.lineTo(
          child.x - 12 * Math.cos(angle + Math.PI / 6),
          child.y - 12 * Math.sin(angle + Math.PI / 6)
        );
        ctx.closePath();
        ctx.fillStyle = "#a855f7";
        ctx.fill();
      }
    }
  }, [nodePositions, forkRelationships]);

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    for (const [id, pos] of nodePositions) {
      const distance = Math.sqrt((x - pos.x) ** 2 + (y - pos.y) ** 2);
      if (distance < 50) {
        router.push(`/orbit/${id}`);
        return;
      }
    }
  };

  const handleCanvasMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    let foundHover: string | null = null;
    for (const [id, pos] of nodePositions) {
      const distance = Math.sqrt((x - pos.x) ** 2 + (y - pos.y) ** 2);
      if (distance < 50) {
        foundHover = id;
        break;
      }
    }

    setHoveredNode(foundHover);
    if (foundHover) {
      canvas.style.cursor = "pointer";
    } else {
      canvas.style.cursor = "default";
    }
  };

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
    fetchOrbits();
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
      fetchOrbits();
    } catch (error) {
      console.error("Error deleting Orbit:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to delete Orbit"
      );
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50">
        <div className="text-center">
          <Loader2 className="mx-auto mb-4 h-16 w-16 animate-spin text-blue-500" />
          <p className="text-gray-600 text-sm">Loading orbits...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-gradient-to-br from-gray-50 via-blue-50/50 to-purple-50/50">
      {/* Header */}
      <header className="border-gray-200/50 border-b bg-white/80 px-8 py-6 shadow-sm backdrop-blur-xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text font-bold text-3xl text-transparent">
              Orbit Network
            </h1>
            <div className="mt-2 flex items-center gap-4 text-sm">
              <div className="flex items-center gap-2 rounded-full bg-blue-100 px-3 py-1 text-blue-700">
                <Sparkles className="h-4 w-4" />
                <span className="font-medium">
                  {orbits.length} {orbits.length === 1 ? "orbit" : "orbits"}
                </span>
              </div>
              <div className="flex items-center gap-2 rounded-full bg-purple-100 px-3 py-1 text-purple-700">
                <GitBranch className="h-4 w-4" />
                <span className="font-medium">
                  {forkRelationships.length}{" "}
                  {forkRelationships.length === 1 ? "fork" : "forks"}
                </span>
              </div>
            </div>
          </div>
          <Button
            className="gap-2 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-6 text-white shadow-lg transition-all hover:shadow-xl"
            onClick={() => router.push("/orbits/new")}
          >
            <Plus className="h-5 w-5" />
            <span className="font-semibold">New Orbit</span>
          </Button>
        </div>
      </header>

      {/* Graph View */}
      {orbits.length === 0 ? (
        <div className="flex flex-1 items-center justify-center">
          <div className="text-center">
            <div className="mx-auto mb-6 flex h-32 w-32 items-center justify-center rounded-full bg-gradient-to-br from-blue-100 to-purple-100">
              <Sparkles className="h-16 w-16 text-blue-500" />
            </div>
            <h2 className="mb-3 font-semibold text-2xl text-gray-800">
              No Orbits Yet
            </h2>
            <p className="mb-8 max-w-md text-gray-600">
              Create your first Orbit to start collaborative discussions with
              branching conversations and AI assistance
            </p>
            <Button
              className="gap-2 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 px-8 py-6 text-white shadow-lg transition-all hover:shadow-xl"
              onClick={() => router.push("/orbits/new")}
            >
              <Plus className="h-5 w-5" />
              <span className="font-semibold">Create Your First Orbit</span>
            </Button>
          </div>
        </div>
      ) : (
        <div className="relative flex-1">
          <canvas
            className="absolute inset-0 h-full w-full"
            onClick={handleCanvasClick}
            onMouseMove={handleCanvasMove}
            ref={canvasRef}
          />

          {/* Node overlays */}
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
                currentUserId={session?.user?.id}
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
      )}

      {/* Settings Dialog */}
      {selectedOrbitForSettings && (
        <OrbitSettings
          currentDescription={selectedOrbitForSettings.description}
          currentMembers={orbitMembers}
          currentTitle={selectedOrbitForSettings.title}
          isOpen={!!selectedOrbitForSettings}
          isOwner={selectedOrbitForSettings.ownerId === session?.user?.id}
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
    </div>
  );
}
