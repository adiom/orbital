"use client";

import { ArrowLeft, Settings } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { OrbitSettings } from "./orbit-settings";

type Member = {
  userId: string;
  email: string;
  role: string;
};

type OrbitPageHeaderProps = {
  sfera: {
    id: string;
    title: string;
    description: string | null;
    visibility: "public" | "private" | "dao";
    ownerId: string;
  };
  parentSfera: {
    id: string;
    title: string;
  } | null;
  memberCount: number;
  currentUserId: string | undefined;
  isOwnerOrAdmin: boolean;
  members: Member[];
  onUpdate?: () => void;
};

export function OrbitPageHeader({
  sfera,
  parentSfera,
  memberCount,
  currentUserId,
  isOwnerOrAdmin,
  members,
  onUpdate,
}: OrbitPageHeaderProps) {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  return (
    <>
      <div className="fixed top-0 right-0 left-0 z-10 border-gray-200/50 border-b bg-white/80 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-4xl items-center justify-between px-4 md:h-16 md:px-8">
          <div className="min-w-0 flex-1">
            {/* Breadcrumbs */}
            {parentSfera && (
              <div className="mb-0.5 hidden items-center gap-1.5 text-gray-500 text-xs md:flex">
                <Link
                  className="transition-colors hover:text-gray-700"
                  href={`/${parentSfera.id}`}
                >
                  {parentSfera.title}
                </Link>
                <span>/</span>
              </div>
            )}
            <h1 className="truncate font-semibold text-gray-900 text-sm md:text-base">
              {sfera.title}
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <Button
              asChild
              className="hidden md:flex"
              size="sm"
              variant="ghost"
            >
              <Link href="/">
                <ArrowLeft className="mr-1.5 h-4 w-4" />
                Back
              </Link>
            </Button>

            <Button asChild className="md:hidden" size="icon" variant="ghost">
              <Link href="/">
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>

            {isOwnerOrAdmin && (
              <Button
                onClick={() => setIsSettingsOpen(true)}
                size="sm"
                variant="ghost"
              >
                <Settings className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Settings Dialog */}
      {isOwnerOrAdmin && (
        <OrbitSettings
          currentDescription={sfera.description}
          currentMembers={members}
          currentTitle={sfera.title}
          isOpen={isSettingsOpen}
          isOwner={sfera.ownerId === currentUserId}
          onClose={() => setIsSettingsOpen(false)}
          onUpdate={() => {
            setIsSettingsOpen(false);
            onUpdate?.();
          }}
          orbitId={sfera.id}
        />
      )}
    </>
  );
}
