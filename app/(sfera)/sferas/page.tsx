"use client";

import { GitBranch, Loader2, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";

type Sfera = {
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

export default function SferasPage() {
  const router = useRouter();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [sferas, setSferas] = useState<Sfera[]>([]);
  const [forkRelationships, setForkRelationships] = useState<
    ForkRelationship[]
  >([]);
  const [isLoading, setIsLoading] = useState(true);
  const [nodePositions, setNodePositions] = useState<Map<string, NodePosition>>(
    new Map()
  );
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);

  const fetchSferas = useCallback(async () => {
    try {
      const response = await fetch("/api/sfera", {
        credentials: 'include', // This will include cookies with the request
      });
      
      if (response.status === 401) {
        // If unauthorized, redirect to login
        window.location.href = `/login?callbackUrl=${encodeURIComponent(window.location.pathname)}`;
        return;
      }
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to fetch sferas");
      }
      
      const data = await response.json();
      setSferas(data.sferas || []);
      setForkRelationships(data.forkRelationships || []);
    } catch (error) {
      console.error("Error fetching sferas:", error);
      if (error instanceof Error) {
        // You might want to show this error to the user
        console.error(error.message);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSferas();
  }, [fetchSferas]);

  // Build tree structure
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

    // Find root nodes (nodes without parents)
    const roots = sferas.filter((s) => !parentMap.has(s.id));

    return { childrenMap, parentMap, roots };
  }, [forkRelationships, sferas]);

  // Calculate node positions using force-directed layout
  useEffect(() => {
    if (sferas.length === 0) {
      return;
    }

    const { parentMap, roots } = buildTree();
    const positions = new Map<string, NodePosition>();

    const containerWidth = window.innerWidth - 64;
    const containerHeight = window.innerHeight - 200;

    if (roots.length === 0 && sferas.length > 0) {
      // No tree structure, use circular layout
      for (let index = 0; index < sferas.length; index++) {
        const sfera = sferas[index];
        const angle = (index / sferas.length) * 2 * Math.PI;
        const radius = Math.min(containerWidth, containerHeight) * 0.35;
        positions.set(sfera.id, {
          id: sfera.id,
          x: containerWidth / 2 + radius * Math.cos(angle),
          y: containerHeight / 2 + radius * Math.sin(angle),
        });
      }
    } else {
      // Tree layout
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

      for (const s of sferas) {
        getLevel(s.id);
      }
      const maxLevel = Math.max(...Array.from(levels.values()));

      // Group by level
      const levelGroups = new Map<number, string[]>();
      for (const s of sferas) {
        const level = levels.get(s.id) || 0;
        if (!levelGroups.has(level)) {
          levelGroups.set(level, []);
        }
        levelGroups.get(level)?.push(s.id);
      }

      // Position nodes
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
  }, [sferas, buildTree]);

  // Draw canvas
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

    // Clear canvas
    ctx.clearRect(0, 0, rect.width, rect.height);

    // Draw connections
    ctx.strokeStyle = "#e5e7eb";
    ctx.lineWidth = 2;
    for (const rel of forkRelationships) {
      const parent = nodePositions.get(rel.parentSferaId);
      const child = nodePositions.get(rel.forkedSferaId);
      if (parent && child) {
        ctx.beginPath();
        ctx.moveTo(parent.x, parent.y);

        // Curved connection
        const midX = (parent.x + child.x) / 2;
        const midY = (parent.y + child.y) / 2;
        const offset = 30;
        ctx.quadraticCurveTo(midX + offset, midY, child.x, child.y);

        ctx.stroke();

        // Arrow
        const angle = Math.atan2(child.y - midY, child.x - (midX + offset));
        ctx.beginPath();
        ctx.moveTo(child.x, child.y);
        ctx.lineTo(
          child.x - 10 * Math.cos(angle - Math.PI / 6),
          child.y - 10 * Math.sin(angle - Math.PI / 6)
        );
        ctx.lineTo(
          child.x - 10 * Math.cos(angle + Math.PI / 6),
          child.y - 10 * Math.sin(angle + Math.PI / 6)
        );
        ctx.closePath();
        ctx.fillStyle = "#e5e7eb";
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

    // Check if clicked on a node
    for (const [id, pos] of nodePositions) {
      const distance = Math.sqrt((x - pos.x) ** 2 + (y - pos.y) ** 2);
      if (distance < 40) {
        router.push(`/sfera/${id}`);
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
      if (distance < 40) {
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
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-gray-50">
      {/* Header */}
      <header className="border-gray-200 border-b bg-white px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-semibold text-2xl text-gray-900">
              Sfera Network
            </h1>
            <p className="mt-1 text-gray-500 text-sm">
              {sferas.length} {sferas.length === 1 ? "sfera" : "sferas"} •{" "}
              {forkRelationships.length}{" "}
              {forkRelationships.length === 1 ? "fork" : "forks"}
            </p>
          </div>
          <Button
            className="gap-2 rounded-full bg-black text-white hover:bg-gray-800"
            onClick={() => router.push("/sferas/new")}
          >
            <Plus className="h-4 w-4" />
            New Sfera
          </Button>
        </div>
      </header>

      {/* Graph View */}
      {sferas.length === 0 ? (
        <div className="flex flex-1 items-center justify-center">
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-24 w-24 items-center justify-center rounded-full bg-gray-100">
              <GitBranch className="h-12 w-12 text-gray-400" />
            </div>
            <h2 className="mb-2 font-medium text-gray-900 text-xl">
              No Sferas Yet
            </h2>
            <p className="mb-6 max-w-sm text-gray-500">
              Create your first Sfera to start collaborative discussions with
              branching conversations
            </p>
            <Button
              className="gap-2 rounded-full bg-black text-white hover:bg-gray-800"
              onClick={() => router.push("/sferas/new")}
            >
              <Plus className="h-4 w-4" />
              Create Your First Sfera
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
            const sfera = sferas.find((s) => s.id === id);
            if (!sfera) {
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
                  className={`pointer-events-auto relative cursor-pointer rounded-2xl border-2 bg-white shadow-lg transition-all duration-200 ${isHovered ? "scale-110 border-blue-500 shadow-xl" : "border-gray-200"}
                  `}
                  onClick={() => router.push(`/sfera/${id}`)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      router.push(`/sfera/${id}`);
                    }
                  }}
                  style={{
                    width: "160px",
                    padding: "12px",
                  }}
                  type="button"
                >
                  {/* Role badge */}
                  <div className="-top-2 -right-2 absolute rounded-full bg-blue-600 px-2 py-0.5 font-medium text-[10px] text-white">
                    {sfera.role}
                  </div>

                  {/* Title */}
                  <h3 className="mb-1 line-clamp-2 font-medium text-gray-900 text-sm">
                    {sfera.title}
                  </h3>

                  {/* Meta */}
                  <div className="flex items-center justify-between text-[11px] text-gray-500">
                    <span>{sfera.visibility}</span>
                    {childCount > 0 && (
                      <div className="flex items-center gap-1">
                        <GitBranch className="h-3 w-3" />
                        <span>{childCount}</span>
                      </div>
                    )}
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
