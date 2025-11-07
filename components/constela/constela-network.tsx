"use client";

import { GitBranch, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export type ConstelaNode = {
  id: string;
  title: string;
  visibility: string;
  role: string;
};

export type ConstelaRelationship = {
  parentSferaId: string;
  forkedSferaId: string;
  createdAt: string;
};

type NodePosition = {
  id: string;
  x: number;
  y: number;
};

type ConstelaNetworkProps = {
  constelas: ConstelaNode[];
  relationships: ConstelaRelationship[];
  isLoading: boolean;
};

const NODE_RADIUS = 48;

export const ConstelaNetwork = ({
  constelas,
  relationships,
  isLoading,
}: ConstelaNetworkProps) => {
  const router = useRouter();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [positions, setPositions] = useState<Map<string, NodePosition>>(
    new Map()
  );
  const [hovered, setHovered] = useState<string | null>(null);

  const roots = useMemo(() => {
    const forkedIds = new Set(relationships.map((link) => link.forkedSferaId));
    return constelas.filter((node) => !forkedIds.has(node.id));
  }, [constelas, relationships]);

  const buildPositions = useCallback(() => {
    if (!containerRef.current || constelas.length === 0) {
      return;
    }

    const { width, height } = containerRef.current.getBoundingClientRect();
    const layoutWidth = Math.max(width, 640);
    const layoutHeight = Math.max(height, 360);

    const parentMap = new Map<string, string>();
    relationships.forEach((link) => {
      parentMap.set(link.forkedSferaId, link.parentSferaId);
    });

    const levels = new Map<string, number>();
    const getLevel = (id: string): number => {
      if (levels.has(id)) {
        return levels.get(id)!;
      }
      const parent = parentMap.get(id);
      const level = parent ? getLevel(parent) + 1 : 0;
      levels.set(id, level);
      return level;
    };

    constelas.forEach((node) => {
      getLevel(node.id);
    });

    const levelGroups = new Map<number, string[]>();
    constelas.forEach((node) => {
      const level = levels.get(node.id) ?? 0;
      const group = levelGroups.get(level) ?? [];
      group.push(node.id);
      levelGroups.set(level, group);
    });

    const nextPositions = new Map<string, NodePosition>();
    const maxLevel = Math.max(...levelGroups.keys());
    levelGroups.forEach((ids, level) => {
      const y =
        levelGroups.size === 1
          ? layoutHeight / 2
          : ((level + 1) / (maxLevel + 2)) * (layoutHeight - NODE_RADIUS * 2) +
            NODE_RADIUS;
      ids.forEach((id, index) => {
        const x =
          ((index + 1) / (ids.length + 1)) * (layoutWidth - NODE_RADIUS * 2) +
          NODE_RADIUS;
        nextPositions.set(id, { id, x, y });
      });
    });

    setPositions(nextPositions);
  }, [constelas, relationships]);

  useEffect(() => {
    buildPositions();
    const handleResize = () => buildPositions();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [buildPositions]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || positions.size === 0) {
      return;
    }

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return;
    }

    const { width, height } = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    ctx.clearRect(0, 0, width, height);
    ctx.strokeStyle = "rgba(99, 102, 241, 0.3)";
    ctx.lineWidth = 2;

    relationships.forEach((link) => {
      const parent = positions.get(link.parentSferaId);
      const child = positions.get(link.forkedSferaId);
      if (!parent || !child) {
        return;
      }

      ctx.beginPath();
      ctx.moveTo(parent.x, parent.y);
      const midX = (parent.x + child.x) / 2;
      ctx.quadraticCurveTo(midX, parent.y - 40, child.x, child.y);
      ctx.stroke();

      const angle = Math.atan2(child.y - parent.y, child.x - parent.x);
      const arrowSize = 8;
      ctx.beginPath();
      ctx.moveTo(child.x, child.y);
      ctx.lineTo(
        child.x - arrowSize * Math.cos(angle - Math.PI / 6),
        child.y - arrowSize * Math.sin(angle - Math.PI / 6)
      );
      ctx.lineTo(
        child.x - arrowSize * Math.cos(angle + Math.PI / 6),
        child.y - arrowSize * Math.sin(angle + Math.PI / 6)
      );
      ctx.closePath();
      ctx.fillStyle = "rgba(99, 102, 241, 0.5)";
      ctx.fill();
    });
  }, [positions, relationships]);

  const handleOpen = (id: string) => {
    router.push(`/constela/${id}`);
  };

  if (isLoading) {
    return (
      <Card className="flex min-h-[320px] flex-col justify-center gap-4 p-6">
        <div className="mx-auto flex items-center gap-3 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Загружаем карту Constela...</span>
        </div>
        <Skeleton className="h-48 w-full" />
      </Card>
    );
  }

  if (constelas.length === 0) {
    return (
      <Card className="flex flex-col items-center justify-center gap-4 p-10 text-center">
        <GitBranch className="h-10 w-10 text-muted-foreground" />
        <div>
          <p className="font-semibold text-lg">Нет активных Constela</p>
          <p className="text-muted-foreground text-sm">
            Создайте первую Constela, чтобы начать ветвящееся обсуждение.
          </p>
        </div>
        <Button onClick={() => router.push("/constela/new")}>
          Создать Constela
        </Button>
      </Card>
    );
  }

  return (
    <Card className="relative overflow-hidden p-6" ref={containerRef}>
      <div className="absolute inset-0">
        <canvas className="size-full" ref={canvasRef} />
      </div>
      <div className="relative">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {constelas.map((node) => {
            const position = positions.get(node.id);
            return (
              <div
                className="transition"
                key={node.id}
                onMouseEnter={() => setHovered(node.id)}
                onMouseLeave={() => setHovered(null)}
              >
                <Card
                  className="hover:-translate-y-1 relative h-full cursor-pointer border-primary/20 bg-background/90 p-4 shadow-sm transition hover:border-primary"
                  onClick={() => handleOpen(node.id)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-semibold text-sm leading-tight">
                        {node.title}
                      </h3>
                      <Badge className="mt-2" variant="outline">
                        {node.visibility}
                      </Badge>
                    </div>
                    <Badge>{node.role}</Badge>
                  </div>
                  {position ? (
                    <div className="mt-4 text-muted-foreground text-xs">
                      Координаты: {Math.round(position.x)},{" "}
                      {Math.round(position.y)}
                    </div>
                  ) : null}
                  {hovered === node.id ? (
                    <div className="absolute inset-x-0 bottom-0 rounded-b-2xl bg-primary/10 p-2 text-center font-medium text-primary text-xs">
                      Открыть Constela
                    </div>
                  ) : null}
                </Card>
              </div>
            );
          })}
        </div>
      </div>
    </Card>
  );
};
