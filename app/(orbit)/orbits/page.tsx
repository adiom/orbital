"use client";

import { GitBranch, Loader2, Plus, Sparkles } from "lucide-react";
import { redirect, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useState } from "react";
import { toast } from "sonner";
import { OrbitErrorState } from "@/components/orbit/orbit-error-state";
import { OrbitListView } from "@/components/orbit/orbit-list-view";
import { OrbitNetwork } from "@/components/orbit/orbit-network";
import { OrbitSettings } from "@/components/orbit/orbit-settings";
import { OrbitSkeleton } from "@/components/orbit/orbit-skeleton";
import { OrbitToolbar } from "@/components/orbit/orbit-toolbar";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { useOrbitFilters } from "@/hooks/use-orbit-filters";
import type { Orbit } from "@/hooks/use-orbit-layout";
import { useOrbitViewMode } from "@/hooks/use-orbit-view-mode";
import { useOrbits } from "@/hooks/use-orbits";

type Member = {
  userId: string;
  email: string;
  role: string;
};

export default function OrbitsPage() {
  const { status, data: session } = useSession();

  if (status === "unauthenticated") {
    redirect("/login");
  }

  const router = useRouter();

  // Custom hooks
  const { orbits, forkRelationships, isLoading, error, refetch } = useOrbits();
  const {
    searchQuery,
    setSearchQuery,
    roleFilter,
    setRoleFilter,
    visibilityFilter,
    setVisibilityFilter,
    filteredOrbits,
    resetFilters,
    hasActiveFilters,
  } = useOrbitFilters(orbits);
  const { viewMode, setViewMode } = useOrbitViewMode();

  // Local state for dialogs
  const [selectedOrbitForSettings, setSelectedOrbitForSettings] =
    useState<Orbit | null>(null);
  const [orbitMembers, setOrbitMembers] = useState<Member[]>([]);
  const [_isLoadingMembers, setIsLoadingMembers] = useState(false);
  const [orbitToDelete, setOrbitToDelete] = useState<Orbit | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);

  // Handlers
  const handleOpenSettings = async (orbit: Orbit) => {
    setSelectedOrbitForSettings(orbit);
    setIsLoadingMembers(true);
    try {
      const response = await fetch(`/api/sfera/${orbit.id}`);
      if (response.ok) {
        const data = await response.json();
        setOrbitMembers(data.members || []);
      }
    } catch (fetchError) {
      console.error("Error fetching orbit members:", fetchError);
      toast.error("Failed to load orbit members");
    } finally {
      setIsLoadingMembers(false);
    }
  };

  const handleRetryFetch = async () => {
    setIsRetrying(true);
    try {
      await refetch();
    } finally {
      setIsRetrying(false);
    }
  };

  if (error) {
    const errorMessage =
      error.message === "Failed to fetch orbits"
        ? "Не удалось подключиться к базе данных. Попробуйте обновить страницу или повторите попытку позже."
        : error.message ||
          "Произошла непредвиденная ошибка при загрузке орбит.";

    return (
      <OrbitErrorState
        isRetrying={isRetrying}
        message={errorMessage}
        onRetry={handleRetryFetch}
      />
    );
  }

  const handleCloseSettings = () => {
    setSelectedOrbitForSettings(null);
    setOrbitMembers([]);
  };

  const handleDeleteOrbit = async () => {
    if (!orbitToDelete) {
      return;
    }

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/sfera/${orbitToDelete.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error || "Failed to delete Orbit");
      }

      toast.success("Orbit deleted successfully");
      setOrbitToDelete(null);
      refetch();
    } catch (deleteError) {
      console.error("Error deleting Orbit:", deleteError);
      toast.error(
        deleteError instanceof Error
          ? deleteError.message
          : "Failed to delete Orbit"
      );
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return <OrbitSkeleton />;
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-gradient-to-br from-gray-50 via-blue-50/50 to-purple-50/50">
      {/* Header */}
      <header className="border-gray-200/50 border-b bg-white/80 px-8 py-6 shadow-sm backdrop-blur-xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text font-bold text-3xl text-transparent">
              Orbit Network
            </h1>
            <div className="mt-2 flex items-center gap-4 text-sm">
              <div className="flex items-center gap-2 rounded-full bg-blue-100 px-3 py-1 text-blue-700">
                <Sparkles className="h-4 w-4" />
                <span className="font-medium">
                  {orbits.length} {orbits.length === 1 ? "orbit" : "orbits"}
                </span>
              </div>
              <div className="flex items-center gap-2 rounded-full bg-purple-100 px-3 py-1 text-purple-700">
                <GitBranch className="h-4 w-4" />
                <span className="font-medium">
                  {forkRelationships.length}{" "}
                  {forkRelationships.length === 1 ? "fork" : "forks"}
                </span>
              </div>
            </div>
          </div>
          <Button
            className="gap-2 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-6 text-white shadow-lg transition-all hover:shadow-xl"
            onClick={() => router.push("/orbits/new")}
          >
            <Plus className="h-5 w-5" />
            <span className="font-semibold">New Orbit</span>
          </Button>
        </div>
      </header>

      {/* Toolbar with search and filters */}
      {orbits.length > 0 && (
        <OrbitToolbar
          hasActiveFilters={hasActiveFilters}
          onResetFilters={resetFilters}
          onRoleFilterChange={setRoleFilter}
          onSearchChange={setSearchQuery}
          onViewModeChange={setViewMode}
          onVisibilityFilterChange={setVisibilityFilter}
          resultCount={filteredOrbits.length}
          roleFilter={roleFilter}
          searchQuery={searchQuery}
          totalCount={orbits.length}
          viewMode={viewMode}
          visibilityFilter={visibilityFilter}
        />
      )}

      {/* Content */}
      {orbits.length === 0 ? (
        <div className="flex flex-1 items-center justify-center">
          <div className="text-center">
            <div className="mx-auto mb-6 flex h-32 w-32 items-center justify-center rounded-full bg-gradient-to-br from-blue-100 to-purple-100">
              <Sparkles className="h-16 w-16 text-blue-500" />
            </div>
            <h2 className="mb-3 font-semibold text-2xl text-gray-800">
              No Orbits Yet
            </h2>
            <p className="mb-8 max-w-md text-gray-600">
              Create your first Orbit to start collaborative discussions with
              branching conversations and AI assistance
            </p>
            <Button
              className="gap-2 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 px-8 py-6 text-white shadow-lg transition-all hover:shadow-xl"
              onClick={() => router.push("/orbits/new")}
            >
              <Plus className="h-5 w-5" />
              <span className="font-semibold">Create Your First Orbit</span>
            </Button>
          </div>
        </div>
      ) : filteredOrbits.length === 0 ? (
        <div className="flex flex-1 items-center justify-center">
          <div className="text-center">
            <p className="mb-4 text-gray-600 text-lg">
              No orbits match your filters
            </p>
            <Button onClick={resetFilters} variant="outline">
              Clear filters
            </Button>
          </div>
        </div>
      ) : (
        <div className="relative flex-1">
          {viewMode === "graph" && (
            <OrbitNetwork
              currentUserId={session?.user?.id}
              forkRelationships={forkRelationships}
              onUpdate={refetch}
              orbits={filteredOrbits}
            />
          )}

          {viewMode === "list" && (
            <OrbitListView
              currentUserId={session?.user?.id}
              onDeleteClick={setOrbitToDelete}
              onSettingsClick={handleOpenSettings}
              orbits={filteredOrbits}
            />
          )}

          {viewMode === "grid" && (
            <div className="flex h-full items-center justify-center">
              <p className="text-gray-500">Grid view coming soon...</p>
            </div>
          )}
        </div>
      )}

      {/* Settings Dialog */}
      {selectedOrbitForSettings && (
        <OrbitSettings
          currentDescription={selectedOrbitForSettings.description}
          currentMembers={orbitMembers}
          currentTitle={selectedOrbitForSettings.title}
          isOpen={!!selectedOrbitForSettings}
          isOwner={selectedOrbitForSettings.ownerId === session?.user?.id}
          onClose={handleCloseSettings}
          onUpdate={refetch}
          orbitId={selectedOrbitForSettings.id}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        onOpenChange={(open) => !open && setOrbitToDelete(null)}
        open={!!orbitToDelete}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Orbit</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &ldquo;{orbitToDelete?.title}&rdquo;? This
              action cannot be undone. All messages, members, and forks will be
              removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 text-white hover:bg-red-700"
              disabled={isDeleting}
              onClick={handleDeleteOrbit}
            >
              {isDeleting ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Deleting...
                </span>
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
