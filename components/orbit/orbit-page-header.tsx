"use client";

import { ArrowLeft, Settings, Users } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
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

  const visibilityColors = {
    public: "bg-green-100 text-green-700",
    private: "bg-gray-100 text-gray-700",
    dao: "bg-purple-100 text-purple-700",
  };

  const visibilityLabels = {
    public: "Public",
    private: "Private",
    dao: "DAO",
  };

  return (
    <>
      <div className="fixed top-0 right-0 left-0 z-10 border-gray-200/50 border-b bg-white/80 backdrop-blur-xl">
        <div className="mx-auto max-w-4xl px-3 py-2.5 md:px-8 md:py-4">
          {/* Breadcrumbs */}
          {parentSfera && (
            <div className="mb-1 hidden items-center gap-2 text-sm md:flex">
              <Link
                className="text-gray-500 transition-colors hover:text-gray-700"
                href={`/orbit/${parentSfera.id}`}
              >
                {parentSfera.title}
              </Link>
              <span className="text-gray-400">/</span>
              <span className="text-gray-700">{sfera.title}</span>
            </div>
          )}

          {/* Header Content */}
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              {/* Title */}
              <h1 className="mb-0.5 font-semibold text-base text-gray-900 md:mb-2 md:text-2xl">
                {sfera.title}
              </h1>

              {/* Description — hidden on mobile */}
              {sfera.description && (
                <p className="mb-2 hidden text-gray-600 text-sm md:mb-3 md:block md:text-base">
                  {sfera.description}
                </p>
              )}

              {/* Metadata Badges — hidden on mobile */}
              <div className="hidden flex-wrap items-center gap-2 md:flex">
                <Badge
                  className="gap-1.5 bg-blue-100 text-blue-700"
                  variant="secondary"
                >
                  <Users className="h-3.5 w-3.5" />
                  {memberCount} {memberCount === 1 ? "member" : "members"}
                </Badge>
                <Badge
                  className={visibilityColors[sfera.visibility]}
                  variant="secondary"
                >
                  {visibilityLabels[sfera.visibility]}
                </Badge>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2">
              {/* Back Button */}
              <Button
                asChild
                className="hidden md:flex"
                size="sm"
                variant="outline"
              >
                <Link href="/orbits">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back
                </Link>
              </Button>

              {/* Mobile Back Button */}
              <Button asChild className="md:hidden" size="sm" variant="outline">
                <Link href="/orbits">
                  <ArrowLeft className="h-4 w-4" />
                </Link>
              </Button>

              {/* Settings Button (Owner/Admin only) */}
              {isOwnerOrAdmin && (
                <Button
                  onClick={() => setIsSettingsOpen(true)}
                  size="sm"
                  variant="outline"
                >
                  <Settings className="h-4 w-4 md:mr-2" />
                  <span className="hidden md:inline">Settings</span>
                </Button>
              )}
            </div>
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
