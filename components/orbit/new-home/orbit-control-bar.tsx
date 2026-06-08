"use client";

import {
  Filter,
  Grid3x3,
  LayoutList,
  Network,
  Search,
  SlidersHorizontal,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import type { ViewMode } from "@/hooks/use-orbit-view-mode";
import { cn } from "@/lib/utils";

const ROLE_OPTIONS = [
  { value: "owner", label: "Owner" },
  { value: "member", label: "Member" },
  { value: "viewer", label: "Viewer" },
];

const VISIBILITY_OPTIONS = [
  { value: "public", label: "Public" },
  { value: "private", label: "Private" },
  { value: "dao", label: "DAO" },
];

type OrbitControlBarProps = {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  roleFilter: string | null;
  onRoleFilterChange: (role: string | null) => void;
  visibilityFilter: string | null;
  onVisibilityFilterChange: (visibility: string | null) => void;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  hasActiveFilters: boolean;
  resultCount: number;
  totalCount: number;
  className?: string;
};

const VIEW_MODE_CONFIG: Array<{
  mode: ViewMode;
  label: string;
  icon: typeof Network;
}> = [
  { mode: "graph", label: "Graph", icon: Network },
  { mode: "list", label: "List", icon: LayoutList },
  { mode: "grid", label: "Grid", icon: Grid3x3 },
];

export function OrbitControlBar({
  searchQuery,
  onSearchChange,
  roleFilter,
  onRoleFilterChange,
  visibilityFilter,
  onVisibilityFilterChange,
  viewMode,
  onViewModeChange,
  hasActiveFilters,
  resultCount,
  totalCount,
  className,
}: OrbitControlBarProps) {
  const activeFilterCount = [roleFilter, visibilityFilter].filter(
    Boolean
  ).length;

  return (
    <div
      className={cn(
        "sticky top-2 z-10 flex flex-wrap items-center gap-3 rounded-xl border border-white/80 bg-white/90 px-4 py-2 backdrop-blur",
        className
      )}
    >
      <div className="relative flex min-w-[240px] flex-1 items-center">
        <Search className="pointer-events-none absolute left-3 h-4 w-4 text-gray-400" />
        <Input
          className="w-full rounded-xl bg-white py-2 pr-3 pl-10 text-sm"
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Поиск по названию орбита..."
          value={searchQuery}
        />
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            className="relative gap-2 rounded-xl border border-gray-200 bg-white font-medium text-gray-700 text-xs shadow-none"
            variant="ghost"
          >
            <SlidersHorizontal className="h-4 w-4" />
            Фильтры
            {hasActiveFilters && (
              <Badge className="-right-2 -top-2 absolute h-5 min-w-[20px] rounded-full bg-purple-600 px-1 text-[11px] text-white">
                {activeFilterCount}
              </Badge>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel className="text-gray-500 text-xs uppercase">
            Роль
          </DropdownMenuLabel>
          {ROLE_OPTIONS.map((role) => (
            <DropdownMenuCheckboxItem
              checked={roleFilter === role.value}
              key={role.value}
              onCheckedChange={(checked) =>
                onRoleFilterChange(checked ? role.value : null)
              }
            >
              {role.label}
            </DropdownMenuCheckboxItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuLabel className="text-gray-500 text-xs uppercase">
            Видимость
          </DropdownMenuLabel>
          {VISIBILITY_OPTIONS.map((option) => (
            <DropdownMenuCheckboxItem
              checked={visibilityFilter === option.value}
              key={option.value}
              onCheckedChange={(checked) =>
                onVisibilityFilterChange(checked ? option.value : null)
              }
            >
              {option.label}
            </DropdownMenuCheckboxItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <div className="flex items-center gap-1 text-gray-500 text-xs">
        <Filter className="h-4 w-4 text-gray-500" />
        {resultCount}/{totalCount} orbits
      </div>

      <div className="flex items-center gap-0.5 rounded-full border border-gray-200 bg-gray-50 p-0.5">
        {VIEW_MODE_CONFIG.map(({ mode, label, icon: Icon }) => {
          const isActive = viewMode === mode;
          return (
            <button
              className={cn(
                "flex items-center gap-1 rounded-full px-2.5 py-1 font-medium text-xs transition",
                isActive
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-800"
              )}
              key={mode}
              onClick={() => onViewModeChange(mode)}
              type="button"
            >
              <Icon className="h-4 w-4" />
              <span>{label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
