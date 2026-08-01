"use client";

import { useMemo, useState } from "react";
import { toast } from "@/components/toast";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { DeletePeopleDialog } from "./delete-people-dialog";
import { formatAbsence, formatNumber } from "./format";
import { daysSince, LifeDot, LifeLabel, lifeState } from "./life-dot";
import { PulseLine } from "./pulse-line";
import type { AdminOverview, DeletePreview } from "./types";

type Person = AdminOverview["people"][number];

function label(person: Person): string {
  return person.name || person.email;
}

export function PeopleRegister({
  people,
  onChanged,
}: {
  people: Person[];
  onChanged?: () => void;
}) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirming, setConfirming] = useState(false);
  const [preview, setPreview] = useState<DeletePreview | null>(null);
  const [isLoadingPreview, setLoadingPreview] = useState(false);
  const [isDeleting, setDeleting] = useState(false);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) {
      return people;
    }
    return people.filter(
      (person) =>
        person.email.toLowerCase().includes(needle) ||
        (person.name ?? "").toLowerCase().includes(needle)
    );
  }, [people, query]);

  const chosen = useMemo(
    () => people.filter((person) => selected.has(person.id)),
    [people, selected]
  );

  const allVisibleChosen =
    visible.length > 0 && visible.every((person) => selected.has(person.id));

  function toggle(id: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function toggleAllVisible() {
    setSelected((current) => {
      const next = new Set(current);
      if (allVisibleChosen) {
        for (const person of visible) {
          next.delete(person.id);
        }
      } else {
        for (const person of visible) {
          next.add(person.id);
        }
      }
      return next;
    });
  }

  /** Asks the server what the delete would cost before showing the button. */
  async function openConfirm() {
    setConfirming(true);
    setPreview(null);
    setLoadingPreview(true);

    try {
      const response = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ ids: chosen.map((person) => person.id) }),
      });

      if (!response.ok) {
        throw new Error("preview failed");
      }

      setPreview(await response.json());
    } catch {
      toast({ type: "error", description: "Не удалось посчитать последствия" });
      setConfirming(false);
    } finally {
      setLoadingPreview(false);
    }
  }

  async function confirmDelete() {
    setDeleting(true);

    try {
      const response = await fetch("/api/admin/users", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ ids: chosen.map((person) => person.id) }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result?.error ?? "delete failed");
      }

      toast({
        type: "success",
        description: `Удалено: ${formatNumber(result.deleted)}`,
      });
      setSelected(new Set());
      setConfirming(false);
      onChanged?.();
    } catch (error) {
      toast({
        type: "error",
        description: error instanceof Error ? error.message : "Не удалось удалить",
      });
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-4">
        <Input
          aria-label="Найти человека"
          className="h-9 max-w-[260px] rounded-full border-neutral-200 bg-white/70 px-4 text-[13px] shadow-none placeholder:text-neutral-400"
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Имя или почта"
          type="search"
          value={query}
        />

        <div className="flex items-center gap-4">
          {chosen.length > 0 ? (
            <>
              <button
                className="text-[11px] text-neutral-400 transition-colors hover:text-neutral-700 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
                onClick={() => setSelected(new Set())}
                type="button"
              >
                снять
              </button>
              <button
                className="rounded-full border border-red-200 bg-white px-3.5 py-1.5 text-[12px] text-red-500 transition-colors hover:bg-red-50 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
                onClick={openConfirm}
                type="button"
              >
                Удалить {formatNumber(chosen.length)}
              </button>
            </>
          ) : null}

          {visible.length > 0 ? (
            <button
              className="text-[11px] text-neutral-400 transition-colors hover:text-neutral-700 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
              onClick={toggleAllVisible}
              type="button"
            >
              {allVisibleChosen ? "ничего" : "все"}
            </button>
          ) : null}

          <span className="font-mono text-[11px] text-neutral-400 tabular-nums">
            {formatNumber(visible.length)}
          </span>
        </div>
      </div>

      {visible.length === 0 ? (
        <p className="py-10 text-center text-[13px] text-neutral-400">
          {people.length === 0 ? "Здесь пока никого" : "Никто не подошёл"}
        </p>
      ) : (
        <ul>
          {visible.map((person) => {
            const state = lifeState(person.lastSeen, person.createdAt);
            const isChosen = selected.has(person.id);

            return (
              <li
                className={cn(
                  "group flex items-center gap-4 border-neutral-100 border-b py-3 last:border-b-0",
                  isChosen && "bg-red-50/40"
                )}
                key={person.id}
              >
                <input
                  aria-label={`Выбрать ${label(person)}`}
                  checked={isChosen}
                  className="size-3.5 shrink-0 cursor-pointer accent-red-500 opacity-0 transition-opacity focus-visible:opacity-100 group-hover:opacity-100 data-[chosen=true]:opacity-100"
                  data-chosen={isChosen}
                  onChange={() => toggle(person.id)}
                  type="checkbox"
                />

                <LifeDot state={state} />

                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13.5px] text-neutral-900">
                    {person.name || person.email.split("@")[0]}
                    {person.onboarded ? null : (
                      <span className="ml-2 text-[10px] uppercase tracking-[0.2em] text-neutral-300">
                        не дошёл
                      </span>
                    )}
                  </div>
                  <div className="truncate font-mono text-[11px] text-neutral-400">
                    {person.email}
                  </div>
                </div>

                <div className="hidden w-[124px] shrink-0 text-right font-mono text-[11px] text-neutral-500 tabular-nums sm:block">
                  {formatNumber(person.cellCount)} яч ·{" "}
                  {formatNumber(person.messageCount)} сооб
                </div>

                <PulseLine state={state} values={person.series} />

                <div className="hidden w-[120px] shrink-0 text-right md:block">
                  <LifeLabel state={state} />
                  <div className="mt-0.5 text-[10.5px] leading-none text-neutral-400">
                    {formatAbsence(daysSince(person.lastSeen))}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {confirming ? (
        <DeletePeopleDialog
          isDeleting={isDeleting}
          isLoading={isLoadingPreview}
          names={chosen.map(label)}
          onCancel={() => setConfirming(false)}
          onConfirm={confirmDelete}
          preview={preview}
        />
      ) : null}
    </div>
  );
}
