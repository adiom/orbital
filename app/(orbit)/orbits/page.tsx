"use client";

import { GitBranch, Loader2, Plus, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useSession } from 'next-auth/react';
import { redirect } from "next/navigation";

type Orbit = {
  id: string;
  title: string;
  description: string | null;
  visibility: string;
  role: string;
  createdAt: Date;
  updatedAt: Date;
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

export default function OrbitsPage() {
  const { status } = useSession();

  if (status === 'unauthenticated') {
    redirect('/login');
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
              <div
                className="pointer-events-none absolute"
                key={id}
                style={{
                  left: `${pos.x}px`,
                  top: `${pos.y}px`,
                  transform: "translate(-50%, -50%)",
                }}
              >
                <button
                  className={cn(
                    "pointer-events-auto relative cursor-pointer overflow-hidden rounded-3xl border-2 bg-white shadow-lg transition-all duration-300",
                    isHovered
                      ? "scale-110 border-blue-400 shadow-2xl shadow-blue-200"
                      : "border-gray-200 hover:border-blue-300"
                  )}
                  onClick={() => router.push(`/orbit/${id}`)}
                  style={{
                    width: "180px",
                    padding: "16px",
                  }}
                  type="button"
                >
                  {/* Gradient background effect */}
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 via-purple-50/30 to-pink-50/20" />

                  {/* Role badge */}
                  <div className="-top-2 -right-2 absolute z-10 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 px-3 py-1 font-semibold text-[11px] text-white shadow-md">
                    {orbit.role}
                  </div>

                  {/* Content */}
                  <div className="relative z-10">
                    <h3 className="mb-2 line-clamp-2 font-semibold text-gray-900 text-sm">
                      {orbit.title}
                    </h3>

                    {orbit.description && (
                      <p className="mb-2 line-clamp-1 text-[11px] text-gray-500">
                        {orbit.description}
                      </p>
                    )}

                    <div className="flex items-center justify-between text-[11px] text-gray-500">
                      <span className="rounded-full bg-gray-100 px-2 py-0.5 font-medium">
                        {orbit.visibility}
                      </span>
                      {childCount > 0 && (
                        <div className="flex items-center gap-1 rounded-full bg-purple-100 px-2 py-0.5 text-purple-600">
                          <GitBranch className="h-3 w-3" />
                          <span className="font-medium">{childCount}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
