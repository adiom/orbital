"use client";

import Link from "next/link";
import useSWR from "swr";
import { AgentsPanel } from "@/components/admin/agents-panel";
import { EventsStream } from "@/components/admin/events-stream";
import { formatTime } from "@/components/admin/format";
import { GaugeStrip } from "@/components/admin/gauge-strip";
import { RegisterTabs } from "@/components/admin/register-tabs";
import { SpendPanel } from "@/components/admin/spend-panel";
import type { AdminOverview } from "@/components/admin/types";

const REFRESH_MS = 30_000;

async function fetchOverview(url: string): Promise<AdminOverview> {
  const response = await fetch(url, { credentials: "include" });
  if (!response.ok) {
    throw new Error("Не удалось собрать данные");
  }
  return response.json();
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="relative min-h-screen bg-[#fbfaf8] text-neutral-950">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_18%_12%,rgba(168,85,247,0.05),transparent_30%),radial-gradient(circle_at_82%_6%,rgba(59,130,246,0.05),transparent_32%)]" />
      <div className="relative mx-auto max-w-[1360px] px-6 pt-8 pb-24 md:px-10">
        {children}
      </div>
    </main>
  );
}

function StationSkeleton() {
  return (
    <Shell>
      <div className="h-3 w-40 animate-pulse rounded-full bg-neutral-200/70" />
      <div className="mt-12 grid grid-cols-2 gap-y-8 lg:grid-cols-6">
        {["g1", "g2", "g3", "g4", "g5", "g6"].map((key) => (
          <div key={key}>
            <div className="h-2 w-20 animate-pulse rounded-full bg-neutral-200/70" />
            <div className="mt-4 h-8 w-24 animate-pulse rounded bg-neutral-200/70" />
            <div className="mt-3 h-4 w-16 animate-pulse rounded bg-neutral-100" />
          </div>
        ))}
      </div>
      <div className="mt-14 space-y-3">
        {["r1", "r2", "r3", "r4", "r5", "r6"].map((key) => (
          <div
            className="h-12 w-full animate-pulse rounded-lg bg-neutral-100"
            key={key}
          />
        ))}
      </div>
    </Shell>
  );
}

export default function AdminPage() {
  const { data, error, isLoading, mutate } = useSWR<AdminOverview>(
    "/api/admin/overview",
    fetchOverview,
    { refreshInterval: REFRESH_MS, revalidateOnFocus: false }
  );

  if (isLoading) {
    return <StationSkeleton />;
  }

  if (error || !data) {
    return (
      <Shell>
        <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
          <p className="text-[15px] text-neutral-700">
            Станция не отвечает — данные не собрались.
          </p>
          <button
            className="mt-5 rounded-full border border-neutral-200 bg-white px-5 py-2 text-[13px] text-neutral-800 transition-colors hover:bg-neutral-50 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
            onClick={() => mutate()}
            type="button"
          >
            Собрать заново
          </button>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <header className="flex items-baseline justify-between gap-4">
        <Link
          className="text-[11px] uppercase tracking-[0.34em] text-neutral-400 transition-colors hover:text-neutral-700"
          href="/"
        >
          Orbital / Станция
        </Link>
        <span className="font-mono text-[11px] text-neutral-400 tabular-nums">
          снято в {formatTime(data.generatedAt)}
        </span>
      </header>

      <div className="mt-12">
        <GaugeStrip gauges={data.gauges} />
      </div>

      {data.failures?.length ? (
        <p className="mt-8 font-mono text-[11px] text-red-500">
          не собралось: {data.failures.map((f) => f.source).join(", ")}
        </p>
      ) : null}

      <div className="mt-14 border-neutral-200/70 border-t pt-10 lg:grid lg:grid-cols-3 lg:gap-12">
        <div className="lg:col-span-2">
          <RegisterTabs
            cells={data.cells}
            keys={data.keys}
            onChanged={() => mutate()}
            people={data.people}
          />
        </div>

        <aside className="mt-14 space-y-12 lg:mt-0 lg:border-neutral-200/70 lg:border-l lg:pl-12">
          <SpendPanel spend={data.spend} />
          <AgentsPanel agents={data.agents} />
          <EventsStream events={data.events} />
        </aside>
      </div>
    </Shell>
  );
}
