"use client";

import { ChevronRight, FolderTree, GitBranch } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

interface AreaTreeNode {
  id: string;
  title: string;
  description: string | null;
  parentAreaId: string | null;
  forkedAt: Date | null;
  children: AreaTreeNode[];
  hasAccess: boolean;
}

interface AreaTreeResponse {
  tree: AreaTreeNode;
  currentAreaId: string;
  path: string[];
}

interface AreaTreeProps {
  areaId: string;
  className?: string;
}

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
      <div
        className={`
          flex items-center gap-2 px-3 py-2 rounded-md cursor-pointer
          hover:bg-accent transition-colors
          ${isCurrent ? "bg-accent font-medium" : ""}
          ${!node.hasAccess ? "opacity-50" : ""}
        `}
        style={{ paddingLeft: `${level * 16 + 12}px` }}
        onClick={() => {
          if (node.hasAccess) {
            router.push(`/area/${node.id}`);
          }
        }}
      >
        {hasChildren && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded(!isExpanded);
            }}
            className="p-0.5 hover:bg-muted rounded"
          >
            <ChevronRight
              className={`w-4 h-4 transition-transform ${
                isExpanded ? "rotate-90" : ""
              }`}
            />
          </button>
        )}

        {!hasChildren && <div className="w-5" />}

        {node.forkedAt ? (
          <GitBranch className="w-4 h-4 text-muted-foreground" />
        ) : (
          <FolderTree className="w-4 h-4 text-muted-foreground" />
        )}

        <span className="flex-1 truncate text-sm">{node.title}</span>
      </div>

      {isExpanded && hasChildren && (
        <div className="mt-1">
          {node.children.map((child) => (
            <TreeNode
              key={child.id}
              node={child}
              currentAreaId={currentAreaId}
              path={path}
              level={level + 1}
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
          <div className="h-8 bg-muted rounded" />
          <div className="h-8 bg-muted rounded ml-4" />
          <div className="h-8 bg-muted rounded ml-8" />
        </div>
      </div>
    );
  }

  if (error || !treeData) {
    return (
      <div className={`p-4 text-sm text-muted-foreground ${className}`}>
        {error || "No tree data available"}
      </div>
    );
  }

  return (
    <div className={`p-2 ${className}`}>
      <div className="mb-2 px-3 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
        Area Navigation
      </div>

      <TreeNode
        node={treeData.tree}
        currentAreaId={treeData.currentAreaId}
        path={treeData.path}
      />
    </div>
  );
}
