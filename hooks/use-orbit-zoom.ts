import { useCallback, useState } from "react";

export type ZoomState = {
  zoom: number;
  pan: { x: number; y: number };
};

/**
 * Hook for managing zoom and pan state
 * Provides controls for zoom in/out, reset, and pan
 */
export function useOrbitZoom(initialZoom = 1) {
  const [zoom, setZoom] = useState(initialZoom);
  const [pan, setPan] = useState({ x: 0, y: 0 });

  const zoomIn = useCallback(() => {
    setZoom((z) => Math.min(z * 1.2, 3)); // Max 3x zoom
  }, []);

  const zoomOut = useCallback(() => {
    setZoom((z) => Math.max(z / 1.2, 0.25)); // Min 0.25x zoom
  }, []);

  const resetZoom = useCallback(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, []);

  const fitToView = useCallback(() => {
    // Reset to default view
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, []);

  return {
    zoom,
    pan,
    setPan,
    zoomIn,
    zoomOut,
    resetZoom,
    fitToView,
  };
}
