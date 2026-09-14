"use client";

import { useMemo, useState } from "react";
import { toast } from "@/components/toast";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { DeletePeopleDialog } from "./delete-people-dialog";
import { formatAbsence, formatCents, formatNumber } from "./format";
import { daysSince, LifeDot, LifeLabel, lifeState } from "./life-dot";
import { PersonDrawer } from "./person-drawer";
import { PulseLine } from "./pulse-line";
import type { AdminOverview, DeletePreview } from "./types";

type Person = AdminOverview["people"][number];
type PersonFilter = "all" | "active" | "notOnboarded" | "mcp";
type PersonSort = "new" | "activity" | "messages" | "spend";

const FILTERS: Array<{ id: PersonFilter; label: string }> = [
  { id: "all", label: "Все" },
  { id: "active", label: "Активные" },
  { id: "notOnboarded", label: "Без onboarding" },
  { id: "mcp", label: "MCP" },
];

const SORTS: Array<{ id: PersonSort; label: string }> = [
  { id: "new", label: "Новые" },
  { id: "activity", label: "Активность" },
  { id: "messages", label: "Сообщения" },
  { id: "spend", label: "Расход" },
];

function label(person: Person): string {
  return person.name || person.email;
}

function isActive(person: Person): boolean {
  return lifeState(person.lastSeen, person.createdAt) !== "quiet";
}

export function PeopleRegister({
  people,
  onChanged,
}: {
  people: Person[];
  onChanged?: () => void;
}) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<PersonFilter>("all");
  const [sort, setSort] = useState<PersonSort>("new");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [openId, setOpenId] = useState<string | null>(null);
  /** Who the confirm dialog is about — one row from the card, or the selection. */
  const [targets, setTargets] = useState<string[]>([]);
  const [confirming, setConfirming] = useState(false);
  const [preview, setPreview] = useState<DeletePreview | null>(null);
  const [isLoadingPreview, setLoadingPreview] = useState(false);
  const [isDeleting, setDeleting] = useState(false);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const matching = people.filter(
      (person) =>
        (!needle ||
          person.email.toLowerCase().includes(needle) ||
          (person.name ?? "").toLowerCase().includes(needle)) &&
        (filter === "all" ||
          (filter === "active" && isActive(person)) ||
          (filter === "notOnboarded" && !person.onboarded) ||
          (filter === "mcp" && person.mcpEnabled))
    );

    return matching.sort((left, right) => {
      if (sort === "messages") {
        return right.messageCount - left.messageCount;
      }
      if (sort === "spend") {
        return right.spendCents - left.spendCents;
      }
      if (sort === "activity") {
        const leftAt = new Date(left.lastSeen ?? left.createdAt).getTime();
        const rightAt = new Date(right.lastSeen ?? right.createdAt).getTime();
        return rightAt - leftAt;
      }
      return (
        new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
      );
    });
  }, [filter, people, query, sort]);

  const chosen = useMemo(
    () => people.filter((person) => selected.has(person.id)),
    [people, selected]
  );

  const allVisibleChosen =
    visible.length > 0 && visible.every((person) => selected.has(person.id));

  /** Names for the confirm dialog, in the order the ids were handed over. */
  const targetNames = useMemo(
    () =>
      targets
        .map((id) => people.find((person) => person.id === id))
        .filter((person): person is Person => Boolean(person))
        .map(label),
    [people, targets]
  );

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

  /**
   * Both entry points funnel through `targets`: the checkbox selection and the
   * single "delete" inside a person's card. One confirm path, one delete call.
   */
  async function openConfirm(ids: string[]) {
    if (ids.length === 0) {
      return;
    }

    setTargets(ids);
    setConfirming(true);
    setPreview(null);
    setLoadingPreview(true);

    try {
      const response = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ ids }),
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
        body: JSON.stringify({ ids: targets }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result?.error ?? "delete failed");
      }

      toast({
        type: "success",
        description: `Удалено: ${formatNumber(result.deleted)}`,
      });

      // The card would otherwise stay open on someone who no longer exists.
      setSelected((current) => {
        const next = new Set(current);
        for (const id of targets) {
          next.delete(id);
        }
        return next;
      });

      if (openId && targets.includes(openId)) {
        setOpenId(null);
      }

      setConfirming(false);
      setTargets([]);
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
      <div className="mb-5 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
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
                  onClick={() => openConfirm(chosen.map((person) => person.id))}
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

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            {FILTERS.map((item) => (
              <button
                aria-pressed={filter === item.id}
                className={cn(
                  "rounded-full border px-3 py-1 text-[11px] transition-colors focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
                  filter === item.id
                    ? "border-neutral-900 bg-neutral-900 text-white"
                    : "border-neutral-200 bg-white/70 text-neutral-500 hover:text-neutral-800"
                )}
                key={item.id}
                onClick={() => setFilter(item.id)}
                type="button"
              >
                {item.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <label
              className="text-[10px] uppercase tracking-[0.2em] text-neutral-400"
              htmlFor="people-sort"
            >
              Сортировка
            </label>
            <select
              aria-label="Сортировка людей"
              className="h-8 rounded-full border border-neutral-200 bg-white/70 px-3 text-[12px] text-neutral-700 shadow-none focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
              id="people-sort"
              onChange={(event) => setSort(event.target.value as PersonSort)}
              value={sort}
            >
              {SORTS.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>
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

                {/*
                  The row opens the card; the checkbox stays a separate target
                  so selecting several people never opens anything.
                */}
                <button
                  className="min-w-0 flex-1 cursor-pointer text-left focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
                  onClick={() => setOpenId(person.id)}
                  type="button"
                >
                  <div className="truncate text-[13.5px] text-neutral-900">
                    {person.name || person.email.split("@")[0]}
                    {person.admin ? (
                      <span className="ml-2 text-[10px] uppercase tracking-[0.2em] text-violet-500">
                        админ
                      </span>
                    ) : null}
                    {person.mcpEnabled ? (
                      <span className="ml-2 text-[10px] uppercase tracking-[0.2em] text-sky-500">
                        MCP
                      </span>
                    ) : null}
                    {person.onboarded ? null : (
                      <span className="ml-2 text-[10px] uppercase tracking-[0.2em] text-neutral-300">
                        не дошёл
                      </span>
                    )}
                  </div>
                  <div className="truncate font-mono text-[11px] text-neutral-400">
                    {person.email}
                  </div>
                </button>

                <div className="hidden w-[190px] shrink-0 text-right font-mono text-[11px] text-neutral-500 tabular-nums lg:block">
                  <div>
                    {formatNumber(person.cellCount)} яч ·{" "}
                    {formatNumber(person.messageCount)} сооб
                  </div>
                  <div className="mt-0.5 text-neutral-400">
                    {formatNumber(person.aiRequestCount)} запр ·{" "}
                    {formatCents(person.spendCents)}
                  </div>
                  <div className="mt-0.5 text-neutral-400">
                    {formatNumber(person.activeKeyCount)} актив. ключ
                  </div>
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

      {openId ? (
        <PersonDrawer
          onClose={() => setOpenId(null)}
          onDelete={() => openConfirm([openId])}
          personId={openId}
        />
      ) : null}

      {confirming ? (
        <DeletePeopleDialog
          isDeleting={isDeleting}
          isLoading={isLoadingPreview}
          names={targetNames}
          onCancel={() => {
            setConfirming(false);
            setTargets([]);
          }}
          onConfirm={confirmDelete}
          preview={preview}
        />
      ) : null}
    </div>
  );
}
