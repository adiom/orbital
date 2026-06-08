"use client";

import { GitBranch, Plus, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type OrbitCompactHeaderProps = {
  orbitCount: number;
  forkCount: number;
  onCreateOrbit: () => void;
  className?: string;
};

const StatPill = ({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: typeof Sparkles;
  label: string;
  value: number;
  accent: "blue" | "purple";
}) => {
  const accentClasses =
    accent === "blue"
      ? "bg-blue-50 text-blue-700"
      : "bg-purple-50 text-purple-700";

  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-full px-3 py-1 font-medium text-sm",
        accentClasses
      )}
    >
      <Icon className="h-4 w-4" />
      <span>
        {value} {value === 1 ? label.slice(0, -1) : label}
      </span>
    </div>
  );
};

export function OrbitCompactHeader({
  orbitCount,
  forkCount,
  onCreateOrbit,
  className,
}: OrbitCompactHeaderProps) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/60 bg-white/80 px-5 py-3 shadow-sm backdrop-blur",
        className
      )}
    >
      <div className="min-w-[220px] flex-1">
        <p className="font-medium text-gray-400 text-xs uppercase tracking-wide">
          Orbit Network
        </p>
        <h1 className="mt-1 font-semibold text-gray-900 text-xl">All Orbits</h1>
        <p className="mt-1 text-gray-500 text-xs">
          Быстрый обзор ваших Orbit и связанных веток
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <StatPill
          accent="blue"
          icon={Sparkles}
          label="orbits"
          value={orbitCount}
        />
        <StatPill
          accent="purple"
          icon={GitBranch}
          label="forks"
          value={forkCount}
        />
        <Button
          className="flex h-9 items-center gap-1.5 rounded-full bg-blue-600 px-4 font-medium text-white text-xs shadow-none hover:bg-blue-700"
          onClick={onCreateOrbit}
        >
          <Plus className="h-3.5 w-3.5" />
          New Orbit
        </Button>
      </div>
    </div>
  );
}
