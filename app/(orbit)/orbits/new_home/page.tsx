"use client";

import { GitBranch, Loader2, Sparkles } from "lucide-react";
import { redirect, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useState } from "react";
import { toast } from "sonner";
import { OrbitCompactHeader } from "@/components/orbit/new-home/orbit-compact-header";
import { OrbitControlBar } from "@/components/orbit/new-home/orbit-control-bar";
import { OrbitNetworkTimeline } from "@/components/orbit/new-home/orbit-network-timeline";
import { OrbitStateCard } from "@/components/orbit/new-home/orbit-state-card";
import { OrbitErrorState } from "@/components/orbit/orbit-error-state";
import { OrbitListView } from "@/components/orbit/orbit-list-view";
import { OrbitSettings } from "@/components/orbit/orbit-settings";
import { OrbitSkeleton } from "@/components/orbit/orbit-skeleton";
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

export default function OrbitsNewHomePage() {
  const { status, data: session } = useSession();

  if (status === "unauthenticated") {
    redirect("/login");
  }

  const router = useRouter();

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

  const [selectedOrbitForSettings, setSelectedOrbitForSettings] =
    useState<Orbit | null>(null);
  const [orbitMembers, setOrbitMembers] = useState<
    { userId: string; email: string; role: string }[]
  >([]);
  const [_isLoadingMembers, setIsLoadingMembers] = useState(false);
  const [orbitToDelete, setOrbitToDelete] = useState<Orbit | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);

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

  const handleRetryFetch = async () => {
    setIsRetrying(true);
    try {
      await refetch();
    } finally {
      setIsRetrying(false);
    }
  };

  if (status === "loading" || isLoading) {
    return <OrbitSkeleton />;
  }

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

  const isEmpty = orbits.length === 0;
  const hasMatches = filteredOrbits.length > 0;

  // Для graph-режима дополнительно сортируем орбиты по времени создания
  const sortedGraphOrbits = hasMatches
    ? [...filteredOrbits].sort((a, b) => {
        const aTime = new Date(a.createdAt).getTime();
        const bTime = new Date(b.createdAt).getTime();
        return aTime - bTime; // от более старых к более новым
      })
    : filteredOrbits;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/40 to-purple-50/40 px-4 py-4">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4">
        <OrbitCompactHeader
          className="mt-4"
          forkCount={forkRelationships.length}
          onCreateOrbit={() => router.push("/orbits/new")}
          orbitCount={orbits.length}
        />

        {orbits.length > 0 && (
          <OrbitControlBar
            className="mt-2"
            hasActiveFilters={hasActiveFilters}
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

        <main className="relative flex-1 pb-4">
          {isEmpty ? (
            <OrbitStateCard
              actionLabel="Создать Orbit"
              description="Запустите первое обсуждение и подключите AI для ветвящихся веток."
              icon={<Sparkles className="h-12 w-12" />}
              onAction={() => router.push("/orbits/new")}
              title="Еще нет Orbit"
            />
          ) : hasMatches ? (
            <div className="space-y-4">
              {viewMode === "graph" && (
                <div className="rounded-3xl border border-gray-100 bg-white p-4 shadow-sm">
                  <OrbitNetworkTimeline
                    currentUserId={session?.user?.id}
                    forkRelationships={forkRelationships}
                    onUpdate={refetch}
                    orbits={sortedGraphOrbits}
                  />
                </div>
              )}

              {viewMode === "list" && (
                <div className="rounded-3xl border border-gray-100 bg-white p-4 shadow-sm">
                  <OrbitListView
                    currentUserId={session?.user?.id}
                    onDeleteClick={setOrbitToDelete}
                    onSettingsClick={handleOpenSettings}
                    orbits={filteredOrbits}
                  />
                </div>
              )}

              {viewMode === "grid" && (
                <OrbitStateCard
                  description="Скоро появится компактная плитка со статистикой и быстрыми действиями."
                  icon={<Sparkles className="h-10 w-10 text-purple-500" />}
                  title="Grid view в разработке"
                />
              )}
            </div>
          ) : (
            <OrbitStateCard
              actionLabel="Сбросить фильтры"
              description="Попробуйте изменить запрос или очистить фильтры, чтобы увидеть орбиты."
              icon={<GitBranch className="h-12 w-12 text-gray-400" />}
              onAction={resetFilters}
              onSecondaryAction={() => router.push("/orbits/new")}
              secondaryActionLabel="Создать Orbit"
              title="Ничего не найдено"
            />
          )}
        </main>
      </div>

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

      <AlertDialog
        onOpenChange={(open) => !open && setOrbitToDelete(null)}
        open={!!orbitToDelete}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить орбит?</AlertDialogTitle>
            <AlertDialogDescription>
              Действие необратимо. Все сообщения, участники и форки будут
              удалены.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Отмена</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 text-white hover:bg-red-700"
              disabled={isDeleting}
              onClick={handleDeleteOrbit}
            >
              {isDeleting ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Удаляем...
                </span>
              ) : (
                "Удалить"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
