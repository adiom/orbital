"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { ForkRelationship, Orbit } from "@/hooks/use-orbit-layout";
import { cn } from "@/lib/utils";

type SferaNetworkViewProps = {
  orbits: Orbit[];
  forkRelationships: ForkRelationship[];
};

type NodePosition = {
  x: number;
  y: number;
  vx: number;
  vy: number;
};

export function SferaNetworkView({
  orbits,
  forkRelationships,
}: SferaNetworkViewProps) {
  const router = useRouter();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [positions, setPositions] = useState<Map<string, NodePosition>>(
    new Map()
  );

  // Инициализация позиций узлов
  useEffect(() => {
    if (orbits.length === 0) {
      return;
    }

    const newPositions = new Map<string, NodePosition>();
    const centerX = 400;
    const centerY = 300;
    const radius = 200;

    orbits.forEach((orbit, index) => {
      const angle = (index / orbits.length) * Math.PI * 2;
      newPositions.set(orbit.id, {
        x: centerX + Math.cos(angle) * radius,
        y: centerY + Math.sin(angle) * radius,
        vx: 0,
        vy: 0,
      });
    });

    setPositions(newPositions);
  }, [orbits]);

  // Физическая симуляция для расположения узлов
  useEffect(() => {
    if (positions.size === 0) {
      return;
    }

    const animate = () => {
      setPositions((prev) => {
        const next = new Map(prev);
        const damping = 0.8;
        const repulsion = 5000;
        const attraction = 0.01;
        const linkDistance = 150;

        // Силы отталкивания между всеми узлами
        for (const [id1, pos1] of next) {
          let fx = 0;
          let fy = 0;

          for (const [id2, pos2] of next) {
            if (id1 === id2) {
              continue;
            }

            const dx = pos1.x - pos2.x;
            const dy = pos1.y - pos2.y;
            const dist = Math.sqrt(dx * dx + dy * dy) || 1;

            const force = repulsion / (dist * dist);
            fx += (dx / dist) * force;
            fy += (dy / dist) * force;
          }

          // Силы притяжения для связанных узлов
          for (const rel of forkRelationships) {
            let linkedId: string | null = null;
            if (rel.parentSferaId === id1) {
              linkedId = rel.forkedSferaId;
            }
            if (rel.forkedSferaId === id1) {
              linkedId = rel.parentSferaId;
            }

            if (linkedId) {
              const pos2 = next.get(linkedId);
              if (pos2) {
                const dx = pos2.x - pos1.x;
                const dy = pos2.y - pos1.y;
                const dist = Math.sqrt(dx * dx + dy * dy) || 1;

                const force = (dist - linkDistance) * attraction;
                fx += (dx / dist) * force;
                fy += (dy / dist) * force;
              }
            }
          }

          pos1.vx = (pos1.vx + fx) * damping;
          pos1.vy = (pos1.vy + fy) * damping;
          pos1.x += pos1.vx;
          pos1.y += pos1.vy;

          // Границы
          pos1.x = Math.max(50, Math.min(750, pos1.x));
          pos1.y = Math.max(50, Math.min(550, pos1.y));
        }

        return next;
      });
    };

    const interval = setInterval(animate, 50);
    return () => clearInterval(interval);
  }, [positions.size, forkRelationships]);

  // Отрисовка canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Рисуем связи
    ctx.strokeStyle = "#cbd5e1";
    ctx.lineWidth = 2;

    for (const rel of forkRelationships) {
      const pos1 = positions.get(rel.parentSferaId);
      const pos2 = positions.get(rel.forkedSferaId);

      if (pos1 && pos2) {
        ctx.beginPath();
        ctx.moveTo(pos1.x, pos1.y);
        ctx.lineTo(pos2.x, pos2.y);
        ctx.stroke();
      }
    }
  }, [positions, forkRelationships]);

  const handleNodeClick = (orbitId: string) => {
    router.push(`/${orbitId}`);
  };

  return (
    <div className="relative h-[600px] w-full" ref={containerRef}>
      <canvas
        className="absolute inset-0"
        height={600}
        ref={canvasRef}
        width={800}
      />

      {Array.from(positions.entries()).map(([id, pos]) => {
        const orbit = orbits.find((o) => o.id === id);
        if (!orbit) {
          return null;
        }

        const isHovered = hoveredNode === id;
        const childCount = forkRelationships.filter(
          (r) => r.parentSferaId === id
        ).length;

        return (
          <button
            className={cn(
              "-translate-x-1/2 -translate-y-1/2 absolute flex h-24 w-24 flex-col items-center justify-center rounded-full border-2 bg-white p-2 text-center shadow-md transition-all",
              isHovered
                ? "z-10 scale-110 border-blue-500 shadow-lg"
                : "border-slate-200"
            )}
            key={id}
            onClick={() => handleNodeClick(id)}
            onMouseEnter={() => setHoveredNode(id)}
            onMouseLeave={() => setHoveredNode(null)}
            style={{
              left: `${pos.x}px`,
              top: `${pos.y}px`,
            }}
            type="button"
          >
            <span className="line-clamp-2 font-medium text-slate-900 text-xs">
              {orbit.title || "Без названия"}
            </span>
            {childCount > 0 && (
              <span className="mt-1 text-[10px] text-slate-500">
                {childCount} {childCount === 1 ? "форк" : "форков"}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
