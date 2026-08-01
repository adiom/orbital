"use client";

import { X } from "lucide-react";
import { useEffect } from "react";
import useSWR from "swr";
import { cn } from "@/lib/utils";
import {
  formatCents,
  formatNumber,
  formatRelative,
} from "./format";
import { daysSince, LifeDot, LifeLabel, lifeState } from "./life-dot";
import { PulseLine } from "./pulse-line";

type PersonCard = {
  failures: Array<{ source: string; message: string }>;
  person: {
    id: string;
    name: string | null;
    email: string;
    bio: string | null;
    createdAt: string;
    mcpEnabled: boolean;
    lastSeen: string | null;
    firstSeen: string | null;
    messageCount: number;
    ownedCount: number;
    cellCount: number;
  };
  onboarding: {
    completed: boolean;
    completedAt: string | null;
    sferaId: string | null;
    answers: Array<{ question: string; answer: string }>;
  } | null;
  series: number[];
  seriesDays: number;
  cells: Array<{
    id: string;
    title: string;
    visibility: "public" | "private" | "dao";
    updatedAt: string;
    role: string;
    messageCount: number;
  }>;
  spend: Array<{
    provider: string;
    requests: number;
    tokens: number;
    cents: number;
  }>;
  keys: Array<{
    id: string;
    name: string;
    prefix: string;
    usageCount: number;
    lastUsedAt: string | null;
    revokedAt: string | null;
  }>;
  events: Array<{
    at: string;
    label: string;
    status: string;
    error: string | null;
  }>;
};

async function fetchPerson(url: string): Promise<PersonCard> {
  const response = await fetch(url, { credentials: "include" });

  if (!response.ok) {
    throw new Error("Карточка не собралась");
  }

  return response.json();
}

function Section({
  title,
  count,
  children,
}: {
  title: string;
  count?: number;
  children: React.ReactNode;
}) {
  return (
    <section className="border-neutral-100 border-t pt-5">
      <header className="flex items-baseline justify-between">
        <h3 className="text-[10px] uppercase tracking-[0.2em] text-neutral-400">
          {title}
        </h3>
        {count === undefined ? null : (
          <span className="font-mono text-[11px] text-neutral-400 tabular-nums">
            {formatNumber(count)}
          </span>
        )}
      </header>
      {children}
    </section>
  );
}

/**
 * The drawer keeps the register visible on the left, so the operator can read
 * one person without losing their place in the list.
 */
export function PersonDrawer({
  personId,
  onClose,
  onDelete,
}: {
  personId: string;
  onClose: () => void;
  onDelete: () => void;
}) {
  const { data, error, isLoading } = useSWR<PersonCard>(
    `/api/admin/people/${personId}`,
    fetchPerson,
    { revalidateOnFocus: false }
  );

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const state = data
    ? lifeState(data.person.lastSeen, data.person.createdAt)
    : "quiet";

  return (
    <>
      {/* Dimming the map, not hiding it — the register stays legible behind. */}
      <button
        aria-label="Закрыть"
        className="fixed inset-0 z-40 cursor-default bg-neutral-900/5 backdrop-blur-[1px]"
        onClick={onClose}
        type="button"
      />

      <aside className="fixed top-0 right-0 z-50 flex h-full w-full max-w-[440px] flex-col border-neutral-200/70 border-l bg-[#fbfaf8] shadow-[0_0_80px_rgba(15,23,42,0.10)]">
        <header className="flex items-start justify-between gap-4 px-7 pt-7 pb-5">
          <div className="min-w-0">
            {isLoading ? (
              <div className="h-4 w-40 animate-pulse rounded bg-neutral-200/70" />
            ) : (
              <>
                <div className="flex items-baseline gap-2.5">
                  <LifeDot state={state} />
                  <h2 className="truncate text-[16px] text-neutral-900">
                    {data?.person.name || data?.person.email.split("@")[0]}
                  </h2>
                </div>
                <p className="mt-1 truncate font-mono text-[11px] text-neutral-400">
                  {data?.person.email}
                </p>
              </>
            )}
          </div>

          <button
            aria-label="Закрыть"
            className="shrink-0 rounded-full p-1.5 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-700 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
            onClick={onClose}
            type="button"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-7 pb-8">
          {error ? (
            <p className="text-[13px] text-neutral-400">Карточка не собралась</p>
          ) : null}

          {isLoading ? (
            <div className="space-y-3">
              {["s1", "s2", "s3", "s4"].map((key) => (
                <div
                  className="h-16 animate-pulse rounded-lg bg-neutral-100"
                  key={key}
                />
              ))}
            </div>
          ) : null}

          {data ? (
            <>
              {/* The long pulse: three months instead of the register's two weeks */}
              <div>
                <div className="flex items-baseline justify-between">
                  <LifeLabel state={state} />
                  <span className="text-[11px] text-neutral-400">
                    {data.person.lastSeen
                      ? `писал ${formatRelative(data.person.lastSeen)}`
                      : "ни разу не писал"}
                  </span>
                </div>
                <PulseLine
                  className="mt-2.5"
                  height={32}
                  state={state}
                  values={data.series}
                  width={376}
                />
                <div className="mt-2 flex items-baseline justify-between font-mono text-[10.5px] text-neutral-400 tabular-nums">
                  <span>{data.seriesDays} дней</span>
                  <span>
                    {formatNumber(data.person.messageCount)} сообщений ·{" "}
                    {formatNumber(data.person.cellCount)} ячеек ·{" "}
                    {formatNumber(data.person.ownedCount)} своих
                  </span>
                </div>
                <p className="mt-2 text-[11px] text-neutral-400">
                  пришёл {formatRelative(data.person.createdAt)}
                </p>
              </div>

              {/* What they said about themselves — collected, never shown until now */}
              {data.onboarding?.answers.length ? (
                <Section title="О себе">
                  <dl className="mt-3 space-y-2.5">
                    {data.onboarding.answers.map((entry) => (
                      <div key={entry.question}>
                        <dt className="text-[10.5px] text-neutral-400">
                          {entry.question}
                        </dt>
                        <dd className="mt-0.5 text-[13px] text-neutral-800 leading-relaxed">
                          {entry.answer}
                        </dd>
                      </div>
                    ))}
                  </dl>
                  {data.onboarding.completed ? null : (
                    <p className="mt-3 text-[11px] text-neutral-400">
                      интервью не закончено
                    </p>
                  )}
                </Section>
              ) : (
                <Section title="О себе">
                  <p className="mt-3 text-[12.5px] text-neutral-400">
                    {data.onboarding
                      ? "Интервью начато, но ответов ещё нет"
                      : "Интервью не начиналось"}
                  </p>
                </Section>
              )}

              <Section count={data.cells.length} title="Ячейки">
                {data.cells.length === 0 ? (
                  <p className="mt-3 text-[12.5px] text-neutral-400">
                    Пока ни одной
                  </p>
                ) : (
                  <ul className="mt-3">
                    {data.cells.map((cell) => (
                      <li
                        className="flex items-baseline gap-3 border-neutral-100 border-b py-2 last:border-b-0"
                        key={cell.id}
                      >
                        <span className="min-w-0 flex-1 truncate text-[12.5px] text-neutral-800">
                          {cell.title}
                        </span>
                        {cell.role === "owner" ? (
                          <span className="shrink-0 text-[10px] uppercase tracking-[0.2em] text-neutral-300">
                            своя
                          </span>
                        ) : null}
                        <span className="shrink-0 font-mono text-[11px] text-neutral-400 tabular-nums">
                          {formatNumber(cell.messageCount)}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </Section>

              {data.spend.length > 0 ? (
                <Section title="Расход">
                  <ul className="mt-3 space-y-1.5">
                    {data.spend.map((row) => (
                      <li
                        className="flex items-baseline justify-between text-[12.5px]"
                        key={row.provider}
                      >
                        <span className="text-neutral-600">{row.provider}</span>
                        <span className="font-mono text-neutral-800 tabular-nums">
                          {formatCents(row.cents)}
                          <span className="ml-2 text-neutral-400">
                            {formatNumber(row.requests)} запр
                          </span>
                        </span>
                      </li>
                    ))}
                  </ul>
                </Section>
              ) : null}

              {data.keys.length > 0 ? (
                <Section count={data.keys.length} title="Ключи">
                  <ul className="mt-3 space-y-2">
                    {data.keys.map((key) => (
                      <li className="flex items-baseline gap-3" key={key.id}>
                        <span className="font-mono text-[11.5px] text-neutral-600">
                          {key.prefix}···
                        </span>
                        <span className="min-w-0 flex-1 truncate text-[11.5px] text-neutral-400">
                          {key.name}
                        </span>
                        {key.revokedAt ? (
                          <span className="shrink-0 text-[10px] uppercase tracking-[0.2em] text-neutral-300">
                            отозван
                          </span>
                        ) : (
                          <span className="shrink-0 font-mono text-[11px] text-neutral-400 tabular-nums">
                            {formatNumber(key.usageCount)}
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                </Section>
              ) : null}

              {data.events.length > 0 ? (
                <Section title="Последнее">
                  <ul className="mt-3 space-y-1">
                    {data.events.map((event) => (
                      <li
                        className="flex items-baseline gap-3 font-mono text-[11px]"
                        key={`${event.at}-${event.label}`}
                      >
                        <span className="w-[86px] shrink-0 text-neutral-400">
                          {formatRelative(event.at)}
                        </span>
                        <span
                          className={cn(
                            "min-w-0 flex-1 truncate",
                            event.status === "error"
                              ? "text-red-500"
                              : "text-neutral-600"
                          )}
                        >
                          {event.label}
                        </span>
                      </li>
                    ))}
                  </ul>
                </Section>
              ) : null}

              <Section title="Опасное">
                <button
                  className="mt-3 rounded-full border border-red-200 bg-white px-4 py-2 text-[12.5px] text-red-500 transition-colors hover:bg-red-50 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
                  onClick={onDelete}
                  type="button"
                >
                  Удалить человека
                </button>
                <p className="mt-2 text-[11px] text-neutral-400">
                  Вместе с ним уйдут его ячейки и всё, что в них написано.
                </p>
              </Section>
            </>
          ) : null}
        </div>
      </aside>
    </>
  );
}
