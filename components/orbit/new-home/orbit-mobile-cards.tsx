"use client";

import { Plus, User } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import type { ForkRelationship, Orbit } from "@/hooks/use-orbit-layout";
import { OrbitMobileCard } from "./orbit-mobile-card";

type OrbitMobileCardsProps = {
  orbits: Orbit[];
  forkRelationships: ForkRelationship[];
  currentUserId?: string;
  onCreateOpen?: () => void;
  onSettingsClick?: (orbitId: string) => void;
  onDeleteClick?: (orbitId: string) => void;
};

function getChildCount(orbitId: string, forkRelationships: ForkRelationship[]) {
  return forkRelationships.filter((r) => r.parentSferaId === orbitId).length;
}

function getForks(orbitId: string, forkRelationships: ForkRelationship[]) {
  return forkRelationships
    .filter((r) => r.parentSferaId === orbitId)
    .map((r) => r.forkedSferaId);
}

function getDensity(orbit: Orbit, childCount: number) {
  const msgCount = orbit.messageCount || 0;
  const memberCount = orbit.memberCount || 0;
  const hasDescription = orbit.description ? 0.12 : 0;
  const forkDensity = Math.min(childCount * 0.14, 0.42);
  const messageDensity = Math.min(msgCount * 0.01, 0.3);
  const memberDensity = Math.min(memberCount * 0.06, 0.16);

  return Math.min(
    1,
    0.1 + hasDescription + forkDensity + messageDensity + memberDensity
  );
}

function getDataScore(
  childCount: number,
  messageCount: number,
  density: number
): number {
  return messageCount * 2 + childCount * 5 + density * 10;
}

function isDeadCard(orbit: Orbit, childCount: number): boolean {
  const msgCount = orbit.messageCount || 0;
  return msgCount === 0 && !orbit.description && childCount === 0;
}

function getLifeState(
  orbit: Orbit,
  childCount: number
): "born" | "alive" | "settled" | "quiet" {
  const updatedAt = new Date(orbit.updatedAt).getTime();
  const ageInHours = (Date.now() - updatedAt) / (1000 * 60 * 60);

  if (ageInHours < 12) return "alive";
  if (ageInHours < 72 || childCount > 0) return "settled";
  if (ageInHours < 168) return "born";
  return "quiet";
}

function getActivityLabel(orbit: Orbit, childCount: number) {
  const msgCount = orbit.messageCount || 0;
  const memberCount = orbit.memberCount || 0;
  const lastMsg = orbit.lastMessageAt
    ? new Date(orbit.lastMessageAt).getTime()
    : null;
  const ageInMinutes = lastMsg
    ? Math.max(1, Math.floor((Date.now() - lastMsg) / 60_000))
    : Infinity;

  if (ageInMinutes < 60) return "ожило недавно";
  if (ageInMinutes < 60 * 24) return "обсуждалось сегодня";
  if (msgCount > 50) return `${msgCount} сообщений`;
  if (memberCount > 1) return `${memberCount} участников`;
  if (childCount > 0) return "есть новые ветви";
  return "ждет продолжения";
}

export function OrbitMobileCards({
  orbits,
  forkRelationships,
  currentUserId,
  onCreateOpen,
  onSettingsClick,
  onDeleteClick,
}: OrbitMobileCardsProps) {
  const router = useRouter();
  const storiesRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  // Split: new (no forks) vs has forks
  const { newOrbits, parentWithForks } = useMemo(() => {
    const forkIds = new Set(forkRelationships.map((r) => r.forkedSferaId));

    const newOnes: Orbit[] = [];
    const parentWithForksOnes: Orbit[] = [];

    for (const orbit of orbits) {
      const childCount = getChildCount(orbit.id, forkRelationships);
      if (isDeadCard(orbit, childCount)) continue;

      if (forkIds.has(orbit.id)) continue; // this is a fork itself

      if (childCount > 0) {
        parentWithForksOnes.push(orbit);
      } else {
        newOnes.push(orbit);
      }
    }

    return { newOrbits: newOnes, parentWithForks: parentWithForksOnes };
  }, [orbits, forkRelationships]);

  // Sort new orbits by score
  const sortedNew = useMemo(() => [...newOrbits].sort((a, b) => {
    const dA = getDensity(a, 0);
    const dB = getDensity(b, 0);
    return getDataScore(0, b.messageCount || 0, dB) - getDataScore(0, a.messageCount || 0, dA);
  }), [newOrbits]);

  // Sort parents with forks by child count
  const sortedParents = useMemo(() => [...parentWithForks].sort((a, b) => {
    return getChildCount(b.id, forkRelationships) - getChildCount(a.id, forkRelationships);
  }), [parentWithForks, forkRelationships]);

  const handleScroll = useCallback(() => {
    const container = storiesRef.current;
    if (!container) return;

    const scrollLeft = container.scrollLeft;
    const cardWidth = container.firstChild
      ? (container.firstChild as HTMLElement).offsetWidth + 12
      : 1;
    const newIndex = Math.round(scrollLeft / cardWidth);
    setActiveIndex(Math.min(newIndex, sortedNew.length - 1));
  }, [sortedNew.length]);

  useEffect(() => {
    const container = storiesRef.current;
    if (!container) return;

    container.addEventListener("scroll", handleScroll, { passive: true });
    return () => container.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  const handleOpen = useCallback(
    (id: string) => {
      router.push(`/${id}`);
    },
    [router]
  );

  if (sortedNew.length === 0 && sortedParents.length === 0) {
    return (
      <div className="fixed inset-0 flex items-center justify-center px-6 bg-[#fbfaf8]">
        <div className="text-center">
          <div className="mx-auto mb-8 h-3 w-3 rounded-full bg-violet-300 shadow-[0_0_40px_rgba(168,85,247,0.45)]" />
          <p className="mb-3 text-[11px] uppercase tracking-[0.34em] text-neutral-400">
            Пустая вселенная
          </p>
          <h1 className="font-medium text-2xl text-neutral-900 tracking-[-0.04em]">
            Создайте то, что еще не имеет формы.
          </h1>
        </div>

        {/* Bottom create button */}
        <div className="fixed bottom-[calc(1.5rem+env(safe-area-inset-bottom))] left-1/2 z-50 -translate-x-1/2">
          <button
            className="flex h-14 w-14 items-center justify-center rounded-full bg-neutral-950 text-white shadow-[0_8px_32px_rgba(15,23,42,0.25)] transition-all active:scale-95"
            onClick={onCreateOpen}
            type="button"
          >
            <Plus className="h-6 w-6" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 flex flex-col bg-[#fbfaf8]">
      {/* Logo header */}
      <header className="flex items-center justify-between px-5 pb-2 pt-[calc(1rem+env(safe-area-inset-top))]">
        <span className="text-[11px] uppercase tracking-[0.34em] text-neutral-400">
          Orbital
        </span>
        {currentUserId ? (
          <Link
            aria-label="Мой профиль"
            className="flex h-10 w-10 items-center justify-center rounded-full border border-white/70 bg-white/75 text-neutral-500 shadow-[0_8px_24px_rgba(15,23,42,0.08)] backdrop-blur-xl transition-all active:scale-95"
            href={`/u/${currentUserId}`}
          >
            <User className="h-4 w-4" />
          </Link>
        ) : null}
      </header>

      {/* Stories row — NEW orbits (no forks) */}
      {sortedNew.length > 0 && (
        <div
          ref={storiesRef}
          className="flex shrink-0 snap-x snap-mandatory overflow-x-auto px-4 pb-2 pt-1"
          style={{
            WebkitOverflowScrolling: "touch",
            overscrollBehaviorX: "contain",
            scrollbarWidth: "none",
          }}
        >
          {sortedNew.map((orbit) => {
            const lifeState = getLifeState(orbit, 0);

            return (
              <button
                key={orbit.id}
                className="mr-3 flex w-[100px] shrink-0 snap-center flex-col items-center rounded-2xl bg-white/65 p-2.5 backdrop-blur-xl transition-all active:scale-95"
                onClick={() => handleOpen(orbit.id)}
                type="button"
                style={{
                  boxShadow: "0 4px 16px rgba(15,23,42,0.08)",
                }}
              >
                <div className="mb-1.5 flex items-center gap-1">
                  <span className="text-[8px] uppercase tracking-[0.15em] text-neutral-400">
                    {lifeState === "alive" && "живет"}
                    {lifeState === "born" && "родилось"}
                    {lifeState === "settled" && "созревает"}
                    {lifeState === "quiet" && "тихо"}
                  </span>
                </div>
                <p className="w-full truncate text-center text-[11px] font-medium text-neutral-900 leading-tight">
                  {orbit.title}
                </p>
              </button>
            );
          })}
        </div>
      )}

      {/* Dots indicator — only if > 1 new orbit */}
      {sortedNew.length > 1 && (
        <div className="flex justify-center gap-1.5 py-1.5">
          {sortedNew.map((_, i) => (
            <div
              key={i}
              className={cn(
                "h-1 rounded-full transition-all duration-300",
                i === activeIndex
                  ? "w-3 bg-neutral-400"
                  : "w-1 bg-neutral-200"
              )}
            />
          ))}
        </div>
      )}

      {/* Forks zone — parents WITH forks */}
      {sortedParents.length > 0 && (
        <div className="flex-1 overflow-y-auto px-4 pb-24">
          <p className="mb-3 text-[10px] uppercase tracking-[0.2em] text-neutral-400">
            Продолжения
          </p>
          <div className="flex flex-col gap-4">
            {sortedParents.map((orbit) => {
              const childCount = getChildCount(orbit.id, forkRelationships);
              const forks = getForks(orbit.id, forkRelationships);
              const density = getDensity(orbit, childCount);
              const lifeState = getLifeState(orbit, childCount);
              const activityLabel = getActivityLabel(orbit, childCount);
              const isOwner = currentUserId === orbit.ownerId;

              return (
                <div key={orbit.id} className="flex flex-col gap-2">
                  <OrbitMobileCard
                    orbit={orbit}
                    childCount={childCount}
                    density={density}
                    lifeState={lifeState}
                    activityLabel={activityLabel}
                    isOwner={isOwner}
                    onOpen={() => handleOpen(orbit.id)}
                    onSettingsClick={() => onSettingsClick?.(orbit.id)}
                    onDeleteClick={() => onDeleteClick?.(orbit.id)}
                  />
                  {forks.length > 0 && (
                    <div className="ml-4 flex flex-col gap-1.5">
                      {forks.map((forkId) => {
                        const forkOrbit = orbits.find((o) => o.id === forkId);
                        if (!forkOrbit) return null;
                        const forkDensity = getDensity(forkOrbit, 0);
                        const forkLifeState = getLifeState(forkOrbit, 0);
                        const forkActivityLabel = getActivityLabel(forkOrbit, 0);
                        return (
                          <OrbitMobileCard
                            key={forkId}
                            orbit={forkOrbit}
                            childCount={0}
                            density={forkDensity}
                            lifeState={forkLifeState}
                            activityLabel={forkActivityLabel}
                            isFork
                            onOpen={() => handleOpen(forkId)}
                          />
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Bottom create button - Instagram style */}
      <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2">
        <button
          className="flex h-14 w-14 items-center justify-center rounded-full bg-neutral-950 text-white shadow-[0_8px_32px_rgba(15,23,42,0.25)] transition-all active:scale-95"
          onClick={onCreateOpen}
          type="button"
        >
          <Plus className="h-6 w-6" />
        </button>
      </div>
    </div>
  );
}
