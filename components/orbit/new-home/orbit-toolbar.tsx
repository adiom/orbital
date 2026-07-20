"use client";

import { Maximize2, RotateCcw, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type OrbitToolbarProps = {
  onReshuffle: () => void;
  onReset: () => void;
  onFitView: () => void;
};

const BTN_CLASS =
  "h-9 w-9 rounded-full border border-white/70 bg-white/70 text-neutral-500 shadow-[0_10px_30px_rgba(15,23,42,0.08)] backdrop-blur-2xl transition-all hover:bg-white hover:text-neutral-800";

/**
 * Floating controls for the living map: auto-arrange (force layout), reset
 * saved positions, and fit-to-view. Sits in a top-right React Flow Panel.
 */
export function OrbitToolbar({
  onReshuffle,
  onReset,
  onFitView,
}: OrbitToolbarProps) {
  return (
    <TooltipProvider delayDuration={200}>
      <div className="flex flex-col gap-2">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              className={BTN_CLASS}
              onClick={onReshuffle}
              size="icon"
              variant="ghost"
            >
              <Wand2 className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="left">Собрать заново</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              className={BTN_CLASS}
              onClick={onReset}
              size="icon"
              variant="ghost"
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="left">Сбросить раскладку</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              className={BTN_CLASS}
              onClick={onFitView}
              size="icon"
              variant="ghost"
            >
              <Maximize2 className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="left">Показать всё</TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
}
