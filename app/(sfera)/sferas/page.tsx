"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Loader2, Plus, GitBranch } from "lucide-react";

interface Sfera {
  id: string;
  title: string;
  description: string | null;
  visibility: string;
  role: string;
  createdAt: Date;
  updatedAt: Date;
}

interface ForkRelationship {
  parentSferaId: string;
  forkedSferaId: string;
  createdAt: Date;
}

interface NodePosition {
  x: number;
  y: number;
  id: string;
}

export default function SferasPage() {
  const router = useRouter();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [sferas, setSferas] = useState<Sfera[]>([]);
  const [forkRelationships, setForkRelationships] = useState<ForkRelationship[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [nodePositions, setNodePositions] = useState<Map<string, NodePosition>>(new Map());
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);

  useEffect(() => {
    fetchSferas();
  }, []);

  const fetchSferas = async () => {
    try {
      const response = await fetch("/api/sfera");
      if (!response.ok) {
        throw new Error("Failed to fetch sferas");
      }
      const data = await response.json();
      setSferas(data.sferas || []);
      setForkRelationships(data.forkRelationships || []);
    } catch (error) {
      console.error("Error fetching sferas:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Build tree structure
  const buildTree = () => {
    const childrenMap = new Map<string, string[]>();
    const parentMap = new Map<string, string>();

    forkRelationships.forEach(rel => {
      if (!childrenMap.has(rel.parentSferaId)) {
        childrenMap.set(rel.parentSferaId, []);
      }
      childrenMap.get(rel.parentSferaId)!.push(rel.forkedSferaId);
      parentMap.set(rel.forkedSferaId, rel.parentSferaId);
    });

    // Find root nodes (nodes without parents)
    const roots = sferas.filter(s => !parentMap.has(s.id));

    return { childrenMap, parentMap, roots };
  };

  // Calculate node positions using force-directed layout
  useEffect(() => {
    if (sferas.length === 0) return;

    const { parentMap, roots } = buildTree();
    const positions = new Map<string, NodePosition>();

    const containerWidth = window.innerWidth - 64;
    const containerHeight = window.innerHeight - 200;

    if (roots.length === 0 && sferas.length > 0) {
      // No tree structure, use circular layout
      sferas.forEach((sfera, index) => {
        const angle = (index / sferas.length) * 2 * Math.PI;
        const radius = Math.min(containerWidth, containerHeight) * 0.35;
        positions.set(sfera.id, {
          id: sfera.id,
          x: containerWidth / 2 + radius * Math.cos(angle),
          y: containerHeight / 2 + radius * Math.sin(angle),
        });
      });
    } else {
      // Tree layout
      const levels = new Map<string, number>();
      const getLevel = (id: string): number => {
        if (levels.has(id)) return levels.get(id)!;
        const parent = parentMap.get(id);
        const level = parent ? getLevel(parent) + 1 : 0;
        levels.set(id, level);
        return level;
      };

      sferas.forEach(s => getLevel(s.id));
      const maxLevel = Math.max(...Array.from(levels.values()));

      // Group by level
      const levelGroups = new Map<number, string[]>();
      sferas.forEach(s => {
        const level = levels.get(s.id) || 0;
        if (!levelGroups.has(level)) {
          levelGroups.set(level, []);
        }
        levelGroups.get(level)!.push(s.id);
      });

      // Position nodes
      levelGroups.forEach((ids, level) => {
        const y = (level / (maxLevel || 1)) * (containerHeight - 100) + 50;
        ids.forEach((id, index) => {
          const x = ((index + 1) / (ids.length + 1)) * containerWidth;
          positions.set(id, { id, x, y });
        });
      });
    }

    setNodePositions(positions);
  }, [sferas, forkRelationships]);

  // Draw canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || nodePositions.size === 0) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

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
    forkRelationships.forEach(rel => {
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
    });
  }, [nodePositions, forkRelationships]);

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

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
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    let foundHover = null;
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
    <div className="h-screen bg-gray-50 flex flex-col overflow-hidden">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Sfera Network</h1>
            <p className="mt-1 text-sm text-gray-500">
              {sferas.length} {sferas.length === 1 ? "sfera" : "sferas"} • {forkRelationships.length} {forkRelationships.length === 1 ? "fork" : "forks"}
            </p>
          </div>
          <Button
            onClick={() => router.push("/sferas/new")}
            className="gap-2 bg-black hover:bg-gray-800 text-white rounded-full"
          >
            <Plus className="h-4 w-4" />
            New Sfera
          </Button>
        </div>
      </header>

      {/* Graph View */}
      {sferas.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="mx-auto h-24 w-24 rounded-full bg-gray-100 flex items-center justify-center mb-4">
              <GitBranch className="h-12 w-12 text-gray-400" />
            </div>
            <h2 className="text-xl font-medium text-gray-900 mb-2">No Sferas Yet</h2>
            <p className="text-gray-500 mb-6 max-w-sm">
              Create your first Sfera to start collaborative discussions with branching conversations
            </p>
            <Button
              onClick={() => router.push("/sferas/new")}
              className="gap-2 bg-black hover:bg-gray-800 text-white rounded-full"
            >
              <Plus className="h-4 w-4" />
              Create Your First Sfera
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex-1 relative">
          <canvas
            ref={canvasRef}
            className="absolute inset-0 w-full h-full"
            onClick={handleCanvasClick}
            onMouseMove={handleCanvasMove}
          />

          {/* Node overlays */}
          {Array.from(nodePositions.entries()).map(([id, pos]) => {
            const sfera = sferas.find(s => s.id === id);
            if (!sfera) return null;

            const isHovered = hoveredNode === id;
            const childCount = forkRelationships.filter(r => r.parentSferaId === id).length;

            return (
              <div
                key={id}
                className="absolute pointer-events-none"
                style={{
                  left: `${pos.x}px`,
                  top: `${pos.y}px`,
                  transform: "translate(-50%, -50%)",
                }}
              >
                <div
                  className={`
                    relative bg-white rounded-2xl border-2 shadow-lg
                    transition-all duration-200 pointer-events-auto cursor-pointer
                    ${isHovered ? "border-blue-500 scale-110 shadow-xl" : "border-gray-200"}
                  `}
                  style={{
                    width: "160px",
                    padding: "12px",
                  }}
                  onClick={() => router.push(`/sfera/${id}`)}
                >
                  {/* Role badge */}
                  <div className="absolute -top-2 -right-2 bg-blue-600 text-white text-[10px] font-medium px-2 py-0.5 rounded-full">
                    {sfera.role}
                  </div>

                  {/* Title */}
                  <h3 className="font-medium text-sm text-gray-900 mb-1 line-clamp-2">
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
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
