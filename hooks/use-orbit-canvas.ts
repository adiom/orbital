import { type RefObject, useEffect } from "react";
import type { ForkRelationship, NodePosition } from "./use-orbit-layout";

/**
 * Hook for rendering orbit connections on canvas
 * Handles HiDPI displays and draws gradient connections with arrows
 */
export function useOrbitCanvas(
  canvasRef: RefObject<HTMLCanvasElement>,
  nodePositions: Map<string, NodePosition>,
  forkRelationships: ForkRelationship[]
) {
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || nodePositions.size === 0) {
      return;
    }

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return;
    }

    // Handle HiDPI displays
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
        // Create gradient from blue to purple
        const gradient = ctx.createLinearGradient(
          parent.x,
          parent.y,
          child.x,
          child.y
        );
        gradient.addColorStop(0, "#3b82f6"); // blue-500
        gradient.addColorStop(1, "#a855f7"); // purple-500

        ctx.strokeStyle = gradient;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(parent.x, parent.y);

        // Draw curved line using quadratic curve
        const midX = (parent.x + child.x) / 2;
        const midY = (parent.y + child.y) / 2;
        const offset = 40;
        ctx.quadraticCurveTo(midX + offset, midY, child.x, child.y);

        ctx.stroke();

        // Draw arrow at end point
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
        ctx.fillStyle = "#a855f7"; // purple-500
        ctx.fill();
      }
    }
  }, [canvasRef, nodePositions, forkRelationships]);
}
