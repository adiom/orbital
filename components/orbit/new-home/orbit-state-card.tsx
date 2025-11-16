"use client";

import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type OrbitStateCardProps = {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
  icon?: ReactNode;
  className?: string;
};

export function OrbitStateCard({
  title,
  description,
  actionLabel,
  onAction,
  secondaryActionLabel,
  onSecondaryAction,
  icon,
  className,
}: OrbitStateCardProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center gap-4 rounded-3xl border border-dashed border-gray-200 bg-white/80 px-10 py-12 text-center shadow-sm backdrop-blur",
        className,
      )}
    >
      {icon && <div className="text-gray-500">{icon}</div>}
      <div>
        <h2 className="text-2xl font-semibold text-gray-900">{title}</h2>
        <p className="mt-2 text-gray-500">{description}</p>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-3">
        {actionLabel && onAction && (
          <Button
            className="rounded-full bg-gradient-to-r from-blue-600 to-purple-600 px-6 text-white"
            onClick={onAction}
          >
            {actionLabel}
          </Button>
        )}
        {secondaryActionLabel && onSecondaryAction && (
          <Button
            className="rounded-full"
            onClick={onSecondaryAction}
            variant="outline"
          >
            {secondaryActionLabel}
          </Button>
        )}
      </div>
    </div>
  );
}
