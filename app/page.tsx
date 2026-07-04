"use client";

import { Plus } from "lucide-react";
import { redirect, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useState } from "react";
import { OrbitNetworkTimeline } from "@/components/orbit/new-home/orbit-network-timeline";
import { OrbitMobileCards } from "@/components/orbit/new-home/orbit-mobile-cards";
import { OrbitCreateSheet } from "@/components/orbit/new-home/orbit-create-sheet";
import { OrbitCreatePrompt } from "@/components/orbit/new-home/orbit-create-prompt";
import { OrbitErrorState } from "@/components/orbit/orbit-error-state";
import { OrbitSkeleton } from "@/components/orbit/orbit-skeleton";
import { Button } from "@/components/ui/button";
import { useOrbits } from "@/hooks/use-orbits";
import { useIsMobile } from "@/hooks/use-is-mobile";

export default function HomePage() {
  const { status, data: session } = useSession();

  if (status === "unauthenticated") {
    redirect("/login");
  }

  const router = useRouter();
  const { orbits, forkRelationships, isLoading, error, refetch } = useOrbits();
  const [isRetrying, setIsRetrying] = useState(false);
  const [selectedOrbitId, setSelectedOrbitId] = useState<string | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const isMobile = useIsMobile();

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
        ? "Не удалось подключиться к базе данных."
        : error.message || "Произошла ошибка.";

    return (
      <OrbitErrorState
        isRetrying={isRetrying}
        message={errorMessage}
        onRetry={handleRetryFetch}
      />
    );
  }

  const sortedGraphOrbits = [...orbits].sort((a, b) => {
    const aTime = new Date(a.createdAt).getTime();
    const bTime = new Date(b.createdAt).getTime();
    return aTime - bTime;
  });

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#fbfaf8] text-neutral-950 md:overflow-x-hidden">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_18%_12%,rgba(168,85,247,0.10),transparent_28%),radial-gradient(circle_at_80%_8%,rgba(59,130,246,0.09),transparent_30%),radial-gradient(circle_at_54%_72%,rgba(16,185,129,0.07),transparent_34%)]" />
      <div className="pointer-events-none fixed inset-0 opacity-[0.55] [background-image:linear-gradient(rgba(255,255,255,0.82),rgba(255,255,255,0.82))]" />

      {isMobile ? (
        <>
          <OrbitMobileCards
            orbits={sortedGraphOrbits}
            forkRelationships={forkRelationships}
            currentUserId={session?.user?.id}
            onCreateOpen={() => setIsCreateOpen(true)}
          />
          <OrbitCreateSheet
            isOpen={isCreateOpen}
            onClose={() => setIsCreateOpen(false)}
          />
        </>
      ) : (
        <>
          <div className="pointer-events-none fixed left-6 top-6 z-20 max-w-[240px] text-[11px] uppercase tracking-[0.34em] text-neutral-400">
            Orbital
          </div>

          <Button
            className="fixed right-5 top-5 z-30 rounded-full border border-white/70 bg-white/75 px-5 text-neutral-800 shadow-[0_18px_50px_rgba(15,23,42,0.10)] backdrop-blur-2xl transition-all hover:bg-white hover:shadow-[0_22px_70px_rgba(15,23,42,0.14)]"
            onClick={() => setIsCreateOpen(true)}
            variant="ghost"
          >
            <Plus className="mr-2 h-4 w-4" />
            Создать...
          </Button>

          <OrbitCreatePrompt
            isOpen={isCreateOpen}
            onClose={() => setIsCreateOpen(false)}
          />

          <OrbitNetworkTimeline
            currentUserId={session?.user?.id}
            forkRelationships={forkRelationships}
            onUpdate={refetch}
            orbits={sortedGraphOrbits}
            selectedOrbitId={selectedOrbitId}
            onSelectOrbit={setSelectedOrbitId}
          />
        </>
      )}
    </main>
  );
}
