"use client";

import { Filter, Grid3x3, LayoutList, Network, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export type ViewMode = "graph" | "list" | "grid";

interface OrbitToolbarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  roleFilter: string | null;
  onRoleFilterChange: (role: string | null) => void;
  visibilityFilter: string | null;
  onVisibilityFilterChange: (visibility: string | null) => void;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  resultCount: number;
  totalCount: number;
  hasActiveFilters: boolean;
  onResetFilters: () => void;
}

export function OrbitToolbar({
  searchQuery,
  onSearchChange,
  roleFilter,
  onRoleFilterChange,
  visibilityFilter,
  onVisibilityFilterChange,
  viewMode,
  onViewModeChange,
  resultCount,
  totalCount,
  hasActiveFilters,
  onResetFilters,
}: OrbitToolbarProps) {
  return (
    <div className="border-gray-200/50 border-b bg-white/60 px-6 py-3 backdrop-blur-sm">
      <div className="flex items-center justify-between gap-4">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            className="bg-white pl-10 pr-8"
            placeholder="Search orbits..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
          />
          {searchQuery && (
            <Button
              className="absolute top-1/2 right-1 h-6 w-6 -translate-y-1/2 rounded-full p-0 hover:bg-gray-100"
              onClick={() => onSearchChange("")}
              size="sm"
              variant="ghost"
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                className={cn(
                  "gap-2",
                  (roleFilter || visibilityFilter) && "border-blue-500 bg-blue-50"
                )}
                size="sm"
                variant="outline"
              >
                <Filter className="h-4 w-4" />
                Filters
                {(roleFilter || visibilityFilter) && (
                  <span className="ml-1 rounded-full bg-blue-500 px-1.5 py-0.5 font-medium text-white text-xs">
                    {(roleFilter ? 1 : 0) + (visibilityFilter ? 1 : 0)}
                  </span>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Role</DropdownMenuLabel>
              <DropdownMenuCheckboxItem
                checked={roleFilter === "owner"}
                onCheckedChange={(checked) =>
                  onRoleFilterChange(checked ? "owner" : null)
                }
              >
                Owner
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={roleFilter === "member"}
                onCheckedChange={(checked) =>
                  onRoleFilterChange(checked ? "member" : null)
                }
              >
                Member
              </DropdownMenuCheckboxItem>

              <DropdownMenuSeparator />

              <DropdownMenuLabel>Visibility</DropdownMenuLabel>
              <DropdownMenuCheckboxItem
                checked={visibilityFilter === "public"}
                onCheckedChange={(checked) =>
                  onVisibilityFilterChange(checked ? "public" : null)
                }
              >
                Public
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={visibilityFilter === "private"}
                onCheckedChange={(checked) =>
                  onVisibilityFilterChange(checked ? "private" : null)
                }
              >
                Private
              </DropdownMenuCheckboxItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* View Mode Toggle */}
          <div className="flex rounded-lg border bg-white p-1">
            <Button
              className={cn(
                "h-7 w-7 p-0",
                viewMode === "graph" && "bg-blue-100 text-blue-600"
              )}
              onClick={() => onViewModeChange("graph")}
              size="sm"
              variant="ghost"
            >
              <Network className="h-4 w-4" />
            </Button>
            <Button
              className={cn(
                "h-7 w-7 p-0",
                viewMode === "list" && "bg-blue-100 text-blue-600"
              )}
              onClick={() => onViewModeChange("list")}
              size="sm"
              variant="ghost"
            >
              <LayoutList className="h-4 w-4" />
            </Button>
            <Button
              className={cn(
                "h-7 w-7 p-0",
                viewMode === "grid" && "bg-blue-100 text-blue-600"
              )}
              onClick={() => onViewModeChange("grid")}
              size="sm"
              variant="ghost"
            >
              <Grid3x3 className="h-4 w-4" />
            </Button>
          </div>

          {/* Results count */}
          <div className="text-gray-600 text-sm">
            {resultCount === totalCount ? (
              <span>{totalCount} orbits</span>
            ) : (
              <span>
                {resultCount} of {totalCount} orbits
              </span>
            )}
          </div>

          {/* Reset filters */}
          {hasActiveFilters && (
            <Button onClick={onResetFilters} size="sm" variant="ghost">
              Reset
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
