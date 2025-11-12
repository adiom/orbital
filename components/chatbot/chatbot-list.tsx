"use client";

import { Lock, MessageSquare, Settings, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Sfera = {
  id: string;
  title: string;
  description: string | null;
  visibility: string;
  role: string;
  createdAt: Date;
  updatedAt: Date;
  ownerId: string;
};

type ChatbotListProps = {
  sferas: Sfera[];
  currentUserId?: string;
  onSettingsClick?: (sfera: Sfera) => void;
  onDeleteClick?: (sfera: Sfera) => void;
};

export function ChatbotList({
  sferas,
  currentUserId,
  onSettingsClick,
  onDeleteClick,
}: ChatbotListProps) {
  const router = useRouter();

  if (sferas.length === 0) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <MessageSquare className="mx-auto h-16 w-16 text-muted-foreground" />
          <h2 className="mt-4 font-semibold text-xl">No chatbots found</h2>
          <p className="mt-2 text-muted-foreground">
            Create your first chatbot to get started
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="mx-auto max-w-5xl space-y-3">
        {sferas.map((sfera) => {
          const isOwner = sfera.ownerId === currentUserId;

          return (
            <button
              className={cn(
                "group cursor-pointer rounded-xl border-2 bg-card p-4 shadow-sm transition-all",
                "hover:border-primary hover:shadow-md"
              )}
              key={sfera.id}
              onClick={() => router.push(`/chatbot/${sfera.id}`)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  router.push(`/chatbot/${sfera.id}`);
                }
              }}
              type="button"
            >
              <div className="flex items-center justify-between gap-4">
                {/* Left: Title and description */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-3">
                    <MessageSquare className="h-5 w-5 flex-shrink-0 text-primary" />
                    <h3 className="truncate font-semibold text-lg">
                      {sfera.title}
                    </h3>
                    {sfera.visibility === "private" && (
                      <Lock className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                    )}
                  </div>
                  {sfera.description && (
                    <p className="mt-1 line-clamp-2 text-muted-foreground text-sm">
                      {sfera.description}
                    </p>
                  )}
                  <div className="mt-2 flex items-center gap-3 text-xs">
                    <Badge
                      className={cn(
                        sfera.role === "owner"
                          ? "bg-primary/10 text-primary"
                          : "bg-secondary text-secondary-foreground"
                      )}
                      variant="secondary"
                    >
                      {sfera.role}
                    </Badge>
                    <Badge variant="outline">{sfera.visibility}</Badge>
                    <span className="text-muted-foreground">
                      Updated {new Date(sfera.updatedAt).toLocaleDateString()}
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
                          onSettingsClick?.(sfera);
                        }}
                        size="sm"
                        variant="ghost"
                      >
                        <Settings className="h-4 w-4" />
                      </Button>
                      <Button
                        className="text-destructive opacity-0 transition-opacity hover:bg-destructive/10 group-hover:opacity-100"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteClick?.(sfera);
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
            </button>
          );
        })}
      </div>
    </div>
  );
}
