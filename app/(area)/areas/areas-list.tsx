"use client";

import { CreateAreaDialog } from "@/components/create-area-dialog";
import { FolderTree, GitBranch, Users } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

interface Area {
  id: string;
  title: string;
  description: string | null;
  createdAt: Date;
  parentAreaId: string | null;
  forkedAt: Date | null;
  role: string;
}

interface AreasListProps {
  initialAreas: Area[];
}

export function AreasList({ initialAreas }: AreasListProps) {
  const [areas] = useState<Area[]>(initialAreas);
  const [filter, setFilter] = useState<"all" | "root" | "forked">("all");

  const filteredAreas = areas.filter((area) => {
    if (filter === "root") return !area.parentAreaId;
    if (filter === "forked") return !!area.parentAreaId;
    return true;
  });

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      {/* Filters */}
      <div className="flex items-center gap-2 mb-6">
        <button
          type="button"
          onClick={() => setFilter("all")}
          className={`
            px-4 py-2 rounded-md text-sm font-medium transition-colors
            ${
              filter === "all"
                ? "bg-primary text-primary-foreground"
                : "bg-muted hover:bg-muted/80"
            }
          `}
        >
          All Areas
        </button>
        <button
          type="button"
          onClick={() => setFilter("root")}
          className={`
            px-4 py-2 rounded-md text-sm font-medium transition-colors
            ${
              filter === "root"
                ? "bg-primary text-primary-foreground"
                : "bg-muted hover:bg-muted/80"
            }
          `}
        >
          Root Areas
        </button>
        <button
          type="button"
          onClick={() => setFilter("forked")}
          className={`
            px-4 py-2 rounded-md text-sm font-medium transition-colors
            ${
              filter === "forked"
                ? "bg-primary text-primary-foreground"
                : "bg-muted hover:bg-muted/80"
            }
          `}
        >
          Forked Areas
        </button>

        <div className="flex-1" />

        <CreateAreaDialog />
      </div>

      {/* Areas Grid */}
      {filteredAreas.length === 0 ? (
        <div className="text-center py-12">
          <FolderTree className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">No areas found</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Create your first area to get started
          </p>
          <CreateAreaDialog />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredAreas.map((area) => (
            <Link
              key={area.id}
              href={`/area/${area.id}`}
              className="block p-6 border rounded-lg hover:border-primary transition-colors bg-card"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  {area.forkedAt ? (
                    <GitBranch className="w-5 h-5 text-muted-foreground" />
                  ) : (
                    <FolderTree className="w-5 h-5 text-muted-foreground" />
                  )}
                  <span className="text-xs font-medium text-muted-foreground uppercase">
                    {area.role}
                  </span>
                </div>
              </div>

              <h3 className="text-lg font-semibold mb-2">{area.title}</h3>

              {area.description && (
                <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                  {area.description}
                </p>
              )}

              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Users className="w-3 h-3" />
                  <span>Members</span>
                </div>
                {area.forkedAt && (
                  <div className="flex items-center gap-1">
                    <GitBranch className="w-3 h-3" />
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
