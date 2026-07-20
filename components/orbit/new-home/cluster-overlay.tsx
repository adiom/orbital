"use client";

import { type Node, useStore, ViewportPortal } from "@xyflow/react";
import { useMemo } from "react";
import {
  clusterBackground,
  clusterBorder,
} from "@/lib/orbit/cluster-detection";

type ClusterOverlayProps = {
  nodes: Node[];
  clusterMap: Map<string, number>;
  nodeWidth: number;
  nodeHeight: number;
};

const PADDING = 44;

/**
 * Soft rounded regions tinting each connected cluster of orbits. Rendered in
 * flow coordinates via ViewportPortal so it pans/zooms with the graph. Fades
 * out when zoomed far out (where the tint would just add noise) and skips
 * singleton clusters (a lone card needs no region).
 */
export function ClusterOverlay({
  nodes,
  clusterMap,
  nodeWidth,
  nodeHeight,
}: ClusterOverlayProps) {
  const zoom = useStore((s) => s.transform[2]);

  const regions = useMemo(() => {
    const groups = new Map<
      number,
      { minX: number; minY: number; maxX: number; maxY: number; count: number }
    >();

    for (const node of nodes) {
      const clusterId = clusterMap.get(node.id);
      if (clusterId === undefined) continue;
      const box = groups.get(clusterId) ?? {
        minX: Infinity,
        minY: Infinity,
        maxX: -Infinity,
        maxY: -Infinity,
        count: 0,
      };
      box.minX = Math.min(box.minX, node.position.x);
      box.minY = Math.min(box.minY, node.position.y);
      box.maxX = Math.max(box.maxX, node.position.x + nodeWidth);
      box.maxY = Math.max(box.maxY, node.position.y + nodeHeight);
      box.count += 1;
      groups.set(clusterId, box);
    }

    return [...groups.entries()]
      .filter(([, box]) => box.count > 1)
      .map(([clusterId, box]) => ({
        clusterId,
        left: box.minX - PADDING,
        top: box.minY - PADDING,
        width: box.maxX - box.minX + PADDING * 2,
        height: box.maxY - box.minY + PADDING * 2,
      }));
  }, [nodes, clusterMap, nodeWidth, nodeHeight]);

  const opacity = zoom < 0.55 ? 0 : 0.35;

  return (
    <ViewportPortal>
      {regions.map((r) => (
        <div
          key={r.clusterId}
          style={{
            position: "absolute",
            transform: `translate(${r.left}px, ${r.top}px)`,
            width: r.width,
            height: r.height,
            borderRadius: 36,
            background: clusterBackground(r.clusterId),
            border: `1px dashed ${clusterBorder(r.clusterId)}`,
            opacity,
            pointerEvents: "none",
            transition: "opacity 400ms ease",
            zIndex: 0,
          }}
        />
      ))}
    </ViewportPortal>
  );
}
