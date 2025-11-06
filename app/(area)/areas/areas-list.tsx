"use client";

import { FolderTree, GitBranch, Users } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { CreateAreaDialog } from "@/components/create-area-dialog";

type Area = {
  id: string;
  title: string;
  description: string | null;
  createdAt: Date;
  parentAreaId: string | null;
  forkedAt: Date | null;
  role: string;
};

type AreasListProps = {
  initialAreas: Area[];
};

export function AreasList({ initialAreas }: AreasListProps) {
  const [areas] = useState<Area[]>(initialAreas);
  const [filter, setFilter] = useState<"all" | "root" | "forked">("all");

  const filteredAreas = areas.filter((area) => {
    if (filter === "root") {
      return !area.parentAreaId;
    }
    if (filter === "forked") {
      return !!area.parentAreaId;
    }
    return true;
  });

  return (
    <div className="container mx-auto max-w-6xl p-6">
      {/* Filters */}
      <div className="mb-6 flex items-center gap-2">
        <button
          className={`rounded-md px-4 py-2 font-medium text-sm transition-colors ${
            filter === "all"
              ? "bg-primary text-primary-foreground"
              : "bg-muted hover:bg-muted/80"
          }
          `}
          onClick={() => setFilter("all")}
          type="button"
        >
          All Areas
        </button>
        <button
          className={`rounded-md px-4 py-2 font-medium text-sm transition-colors ${
            filter === "root"
              ? "bg-primary text-primary-foreground"
              : "bg-muted hover:bg-muted/80"
          }
          `}
          onClick={() => setFilter("root")}
          type="button"
        >
          Root Areas
        </button>
        <button
          className={`rounded-md px-4 py-2 font-medium text-sm transition-colors ${
            filter === "forked"
              ? "bg-primary text-primary-foreground"
              : "bg-muted hover:bg-muted/80"
          }
          `}
          onClick={() => setFilter("forked")}
          type="button"
        >
          Forked Areas
        </button>

        <div className="flex-1" />

        <CreateAreaDialog />
      </div>

      {/* Areas Grid */}
      {filteredAreas.length === 0 ? (
        <div className="py-12 text-center">
          <FolderTree className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
          <h3 className="mb-2 font-medium text-lg">No areas found</h3>
          <p className="mb-4 text-muted-foreground text-sm">
            Create your first area to get started
          </p>
          <CreateAreaDialog />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredAreas.map((area) => (
            <Link
              className="block rounded-lg border bg-card p-6 transition-colors hover:border-primary"
              href={`/area/${area.id}`}
              key={area.id}
            >
              <div className="mb-3 flex items-start justify-between">
                <div className="flex items-center gap-2">
                  {area.forkedAt ? (
                    <GitBranch className="h-5 w-5 text-muted-foreground" />
                  ) : (
                    <FolderTree className="h-5 w-5 text-muted-foreground" />
                  )}
                  <span className="font-medium text-muted-foreground text-xs uppercase">
                    {area.role}
                  </span>
                </div>
              </div>

              <h3 className="mb-2 font-semibold text-lg">{area.title}</h3>

              {area.description && (
                <p className="mb-3 line-clamp-2 text-muted-foreground text-sm">
                  {area.description}
                </p>
              )}

              <div className="flex items-center gap-4 text-muted-foreground text-xs">
                <div className="flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  <span>Members</span>
                </div>
                {area.forkedAt && (
                  <div className="flex items-center gap-1">
                    <GitBranch className="h-3 w-3" />
                    <span>Forked</span>
                  </div>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
