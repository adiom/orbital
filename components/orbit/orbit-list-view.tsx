"use client";

import { Lock, Settings, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Orbit } from "@/hooks/use-orbit-layout";
import { cn } from "@/lib/utils";

type OrbitListViewProps = {
  orbits: Orbit[];
  currentUserId?: string;
  onSettingsClick?: (orbit: Orbit) => void;
  onDeleteClick?: (orbit: Orbit) => void;
};

export function OrbitListView({
  orbits,
  currentUserId,
  onSettingsClick,
  onDeleteClick,
}: OrbitListViewProps) {
  const router = useRouter();

  if (orbits.length === 0) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">No orbits found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto bg-gradient-to-br from-gray-50 via-blue-50/50 to-purple-50/50 p-6">
      <div className="mx-auto max-w-5xl space-y-3">
        {orbits.map((orbit) => {
          const isOwner = orbit.ownerId === currentUserId;

          return (
            <div
              className={cn(
                "group cursor-pointer rounded-xl border-2 bg-white p-4 shadow-sm transition-all",
                "hover:border-blue-300 hover:shadow-md"
              )}
              key={orbit.id}
              onClick={() => router.push(`/${orbit.id}`)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  router.push(`/${orbit.id}`);
                }
              }}
              role="button"
              tabIndex={0}
            >
              <div className="flex items-center justify-between gap-4">
                {/* Left: Title and description */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-3">
                    <h3 className="truncate font-semibold text-gray-900 text-lg">
                      {orbit.title}
                    </h3>
                    {orbit.visibility === "private" && (
                      <Lock className="h-4 w-4 flex-shrink-0 text-gray-400" />
                    )}
                  </div>
                  {orbit.description && (
                    <p className="mt-1 line-clamp-2 text-gray-600 text-sm">
                      {orbit.description}
                    </p>
                  )}
                  <div className="mt-2 flex items-center gap-3 text-xs">
                    <Badge
                      className={cn(
                        orbit.role === "owner"
                          ? "bg-blue-100 text-blue-700"
                          : "bg-purple-100 text-purple-700"
                      )}
                      variant="secondary"
                    >
                      {orbit.role}
                    </Badge>
                    <Badge variant="outline">{orbit.visibility}</Badge>
                    <span className="text-gray-500">
                      Created {new Date(orbit.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                {/* Right: Actions */}
                <div className="flex items-center gap-2">
                  {isOwner && (
                    <>
                      <Button
                        className="opacity-0 transition-opacity group-hover:opacity-100"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSettingsClick?.(orbit);
                        }}
                        size="sm"
                        variant="ghost"
                      >
                        <Settings className="h-4 w-4" />
                      </Button>
                      <Button
                        className="text-red-500 opacity-0 transition-opacity hover:bg-red-50 hover:text-red-600 group-hover:opacity-100"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteClick?.(orbit);
                        }}
                        size="sm"
                        variant="ghost"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
