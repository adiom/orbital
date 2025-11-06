"use client";

import { ChevronRight, FolderTree, GitBranch } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type AreaTreeNode = {
  id: string;
  title: string;
  description: string | null;
  parentAreaId: string | null;
  forkedAt: Date | null;
  children: AreaTreeNode[];
  hasAccess: boolean;
};

type AreaTreeResponse = {
  tree: AreaTreeNode;
  currentAreaId: string;
  path: string[];
};

type AreaTreeProps = {
  areaId: string;
  className?: string;
};

function TreeNode({
  node,
  currentAreaId,
  path,
  level = 0,
}: {
  node: AreaTreeNode;
  currentAreaId: string;
  path: string[];
  level?: number;
}) {
  const router = useRouter();
  const [isExpanded, setIsExpanded] = useState(path.includes(node.id));
  const isCurrent = node.id === currentAreaId;
  const hasChildren = node.children.length > 0;

  return (
    <div className="select-none">
      <button
        className={`flex w-full cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-left transition-colors hover:bg-accent ${isCurrent ? "bg-accent font-medium" : ""}
          ${node.hasAccess ? "" : "opacity-50"}
        `}
        onClick={() => {
          if (node.hasAccess) {
            router.push(`/area/${node.id}`);
          }
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            if (node.hasAccess) {
              router.push(`/area/${node.id}`);
            }
          }
        }}
        style={{ paddingLeft: `${level * 16 + 12}px` }}
        type="button"
      >
        {hasChildren && (
          <button
            className="rounded p-0.5 hover:bg-muted"
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded(!isExpanded);
            }}
            type="button"
          >
            <ChevronRight
              className={`h-4 w-4 transition-transform ${
                isExpanded ? "rotate-90" : ""
              }`}
            />
          </button>
        )}

        {!hasChildren && <div className="w-5" />}

        {node.forkedAt ? (
          <GitBranch className="h-4 w-4 text-muted-foreground" />
        ) : (
          <FolderTree className="h-4 w-4 text-muted-foreground" />
        )}

        <span className="flex-1 truncate text-sm">{node.title}</span>
      </button>

      {isExpanded && hasChildren && (
        <div className="mt-1">
          {node.children.map((child) => (
            <TreeNode
              currentAreaId={currentAreaId}
              key={child.id}
              level={level + 1}
              node={child}
              path={path}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function AreaTree({ areaId, className }: AreaTreeProps) {
  const [treeData, setTreeData] = useState<AreaTreeResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchTree() {
      try {
        setIsLoading(true);
        setError(null);

        const response = await fetch(`/api/areas/${areaId}/tree`);

        if (!response.ok) {
          throw new Error("Failed to fetch area tree");
        }

        const data = await response.json();
        setTreeData(data);
      } catch (err) {
        console.error("Error fetching area tree:", err);
        setError("Failed to load area tree");
      } finally {
        setIsLoading(false);
      }
    }

    fetchTree();
  }, [areaId]);

  if (isLoading) {
    return (
      <div className={`p-4 ${className}`}>
        <div className="animate-pulse space-y-2">
          <div className="h-8 rounded bg-muted" />
          <div className="ml-4 h-8 rounded bg-muted" />
          <div className="ml-8 h-8 rounded bg-muted" />
        </div>
      </div>
    );
  }

  if (error || !treeData) {
    return (
      <div className={`p-4 text-muted-foreground text-sm ${className}`}>
        {error || "No tree data available"}
      </div>
    );
  }

  return (
    <div className={`p-2 ${className}`}>
      <div className="mb-2 px-3 py-2 font-medium text-muted-foreground text-xs uppercase tracking-wide">
        Area Navigation
      </div>

      <TreeNode
        currentAreaId={treeData.currentAreaId}
        node={treeData.tree}
        path={treeData.path}
      />
    </div>
  );
}
