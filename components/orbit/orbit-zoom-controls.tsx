"use client";

import { Maximize, Minus, Plus, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface OrbitZoomControlsProps {
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onReset: () => void;
  onFitToView: () => void;
}

export function OrbitZoomControls({
  zoom,
  onZoomIn,
  onZoomOut,
  onReset,
  onFitToView,
}: OrbitZoomControlsProps) {
  return (
    <div className="absolute bottom-6 right-6 z-10 flex flex-col gap-2 rounded-lg border bg-white/90 p-2 shadow-lg backdrop-blur-sm">
      <Button
        className="h-9 w-9 p-0"
        onClick={onZoomIn}
        size="sm"
        title="Zoom in"
        variant="ghost"
      >
        <Plus className="h-4 w-4" />
      </Button>

      <div className="border-gray-200 border-t px-2 py-1 text-center text-xs">
        {Math.round(zoom * 100)}%
      </div>

      <Button
        className="h-9 w-9 p-0"
        onClick={onZoomOut}
        size="sm"
        title="Zoom out"
        variant="ghost"
      >
        <Minus className="h-4 w-4" />
      </Button>

      <div className="border-gray-200 border-t pt-2">
        <Button
          className="h-9 w-9 p-0"
          onClick={onFitToView}
          size="sm"
          title="Fit to view"
          variant="ghost"
        >
          <Maximize className="h-4 w-4" />
        </Button>
      </div>

      <Button
        className="h-9 w-9 p-0"
        onClick={onReset}
        size="sm"
        title="Reset view"
        variant="ghost"
      >
        <RotateCcw className="h-4 w-4" />
      </Button>
    </div>
  );
}
