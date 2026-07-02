import { type RefObject, useCallback, useState } from "react";
import type { NodePosition } from "./use-orbit-layout";

/**
 * Hook for handling mouse/touch interactions with orbit canvas
 * Returns hovered node and event handlers
 */
export function useOrbitInteractions(
  canvasRef: RefObject<HTMLCanvasElement | null>,
  nodePositions: Map<string, NodePosition>,
  onNodeClick?: (nodeId: string) => void
) {
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);

  const handleCanvasClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) {
        return;
      }

      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      // Check if click is near any node (within 50px radius)
      for (const [id, pos] of nodePositions) {
        const distance = Math.sqrt((x - pos.x) ** 2 + (y - pos.y) ** 2);
        if (distance < 50) {
          onNodeClick?.(id);
          return;
        }
      }
    },
    [canvasRef, nodePositions, onNodeClick]
  );

  const handleCanvasMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) {
        return;
      }

      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      let foundHover: string | null = null;

      // Find if mouse is hovering over any node
      for (const [id, pos] of nodePositions) {
        const distance = Math.sqrt((x - pos.x) ** 2 + (y - pos.y) ** 2);
        if (distance < 50) {
          foundHover = id;
          break;
        }
      }

      setHoveredNode(foundHover);

      // Update cursor style
      canvas.style.cursor = foundHover ? "pointer" : "default";
    },
    [canvasRef, nodePositions]
  );

  return {
    hoveredNode,
    handleCanvasClick,
    handleCanvasMove,
  };
}
