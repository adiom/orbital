"use client";

import { useIsMobile } from "@/hooks/use-is-mobile";
import { OrbitLoader } from "./orbit-loader";

function DesktopSkeleton() {
  return (
    <div className="flex h-screen flex-col overflow-hidden bg-[#fbfaf8]">
      {/* Header Skeleton */}
      <header className="border-white/70 border-b bg-white/60 px-8 py-6 backdrop-blur-xl">
        <div className="flex items-center justify-between">
          <div>
            <div className="mb-2 h-9 w-64 animate-pulse rounded-lg bg-neutral-100" />
            <div className="mt-2 flex items-center gap-4">
              <div className="h-8 w-24 animate-pulse rounded-full bg-neutral-100" />
              <div className="h-8 w-24 animate-pulse rounded-full bg-neutral-100" />
            </div>
          </div>
          <div className="h-12 w-36 animate-pulse rounded-full bg-neutral-100" />
        </div>
      </header>

      {/* Graph Skeleton */}
      <div className="relative flex-1 p-8">
        {/* Simulated orbit cards */}
        <div className="flex h-full items-center justify-center gap-8">
          {[
            "skeleton-1",
            "skeleton-2",
            "skeleton-3",
            "skeleton-4",
            "skeleton-5",
            "skeleton-6",
          ].map((key, i) => (
            <div
              className="h-32 w-44 animate-pulse rounded-[28px] bg-white/72 shadow-[0_24px_80px_rgba(15,23,42,0.10)] ring-1 ring-white/70"
              key={key}
              style={{
                animationDelay: `${i * 100}ms`,
              }}
            >
              <div className="p-4">
                <div className="mb-2 h-4 w-3/4 rounded bg-neutral-100" />
                <div className="h-3 w-1/2 rounded bg-neutral-100" />
              </div>
            </div>
          ))}
        </div>

        {/* Loading message */}
        <div className="absolute inset-0 flex items-center justify-center">
          <OrbitLoader label="орбита формируется" />
        </div>
      </div>
    </div>
  );
}

function MobileSkeleton() {
  return (
    <div className="fixed inset-0 flex flex-col bg-[#fbfaf8]">
      <header className="flex items-center justify-between px-5 pb-2 pt-[calc(1rem+env(safe-area-inset-top))]">
        <div className="h-2.5 w-16 animate-pulse rounded-full bg-neutral-200" />
        <div className="h-10 w-10 animate-pulse rounded-full bg-neutral-200" />
      </header>

      <div className="flex shrink-0 gap-3 overflow-hidden px-4 pb-2 pt-1">
        {["mob-story-1", "mob-story-2", "mob-story-3"].map((key, i) => (
          <div
            className="h-[92px] w-[100px] shrink-0 animate-pulse rounded-2xl bg-white/70"
            key={key}
            style={{ animationDelay: `${i * 100}ms` }}
          />
        ))}
      </div>

      <div className="flex-1 space-y-4 overflow-hidden px-4 pb-24 pt-3">
        {["mob-card-1", "mob-card-2"].map((key, i) => (
          <div
            className="h-40 w-full animate-pulse rounded-[28px] bg-white/70"
            key={key}
            style={{ animationDelay: `${i * 120}ms` }}
          />
        ))}
      </div>

      <div className="fixed bottom-[calc(1.5rem+env(safe-area-inset-bottom))] left-1/2 z-50 h-14 w-14 -translate-x-1/2 animate-pulse rounded-full bg-neutral-200" />
    </div>
  );
}

function NeutralSkeleton() {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-[#fbfaf8]">
      <OrbitLoader />
    </div>
  );
}

export function OrbitSkeleton() {
  const isMobile = useIsMobile();

  if (isMobile === undefined) {
    return <NeutralSkeleton />;
  }

  return isMobile ? <MobileSkeleton /> : <DesktopSkeleton />;
}
