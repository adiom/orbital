"use client";

import { GitBranch, Settings, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type OrbitContainerProps = {
  orbit: {
    id: string;
    title: string;
    description: string | null;
    visibility: string;
    role: string;
    ownerId: string;
  };
  position: {
    x: number;
    y: number;
  };
  childCount: number;
  isHovered: boolean;
  currentUserId?: string;
  onSettingsClick?: () => void;
  onDeleteClick?: () => void;
};

export function OrbitContainer({
  orbit,
  position,
  childCount,
  isHovered,
  currentUserId,
  onSettingsClick,
  onDeleteClick,
}: OrbitContainerProps) {
  const router = useRouter();

  const handleOrbitClick = () => {
    router.push(`/${orbit.id}`);
  };

  const handleSettingsClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSettingsClick?.();
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDeleteClick?.();
  };

  const isOwner = currentUserId === orbit.ownerId;

  return (
    <div
      className="pointer-events-none absolute"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        transform: "translate(-50%, -50%)",
      }}
    >
      <div
        className={cn(
          "pointer-events-auto relative overflow-hidden rounded-3xl border-2 bg-white shadow-lg transition-all duration-300",
          isHovered
            ? "scale-110 border-blue-400 shadow-2xl shadow-blue-200"
            : "border-gray-200 hover:border-blue-300"
        )}
        style={{
          width: "180px",
          padding: "16px",
        }}
      >
        {/* Gradient background effect */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 via-purple-50/30 to-pink-50/20" />

        {/* Role badge */}
        <div className="-top-2 -right-2 absolute z-10 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 px-3 py-1 font-semibold text-[11px] text-white shadow-md">
          {orbit.role}
        </div>

        {/* Content */}
        <div className="relative z-10">
          <button
            className="w-full cursor-pointer text-left"
            onClick={handleOrbitClick}
            type="button"
          >
            <h3 className="mb-2 line-clamp-2 font-semibold text-gray-900 text-sm">
              {orbit.title}
            </h3>

            {orbit.description && (
              <p className="mb-2 line-clamp-1 text-[11px] text-gray-500">
                {orbit.description}
              </p>
            )}
          </button>

          <div className="flex items-center justify-between text-[11px] text-gray-500">
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-gray-100 px-2 py-0.5 font-medium">
                {orbit.visibility}
              </span>
              {childCount > 0 && (
                <div className="flex items-center gap-1 rounded-full bg-purple-100 px-2 py-0.5 text-purple-600">
                  <GitBranch className="h-3 w-3" />
                  <span className="font-medium">{childCount}</span>
                </div>
              )}
            </div>
            {/* Кнопки управления орбитом для владельца */}
            {isOwner && (
              <div className="flex items-center gap-1">
                <Button
                  className="h-6 w-6 rounded-full transition-all hover:bg-gray-100"
                  onClick={handleSettingsClick}
                  size="icon"
                  variant="ghost"
                >
                  <Settings className="h-3 w-3 text-gray-700" />
                  <span className="sr-only">Settings</span>
                </Button>
                <Button
                  className="h-6 w-6 rounded-full text-red-500 transition-all hover:bg-red-50 hover:text-red-600"
                  onClick={handleDeleteClick}
                  size="icon"
                  variant="ghost"
                >
                  <Trash2 className="h-3 w-3" />
                  <span className="sr-only">Delete Orbit</span>
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
