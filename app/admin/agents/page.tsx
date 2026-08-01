"use client";

import Link from "next/link";
import useSWR from "swr";
import { AgentRow } from "@/components/admin/console/agent-row";
import { BanitaCapability } from "@/components/admin/console/banita-capability";
import type { AgentsSnapshot } from "@/components/admin/console/types";
import { formatNumber, formatTime } from "@/components/admin/format";

const REFRESH_MS = 60_000;

async function fetchConsole(url: string): Promise<AgentsSnapshot> {
  const response = await fetch(url, { credentials: "include" });

  if (!response.ok) {
    throw new Error("Пульт не собрался");
  }

  return response.json();
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="relative min-h-screen bg-[#fbfaf8] text-neutral-950">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_18%_12%,rgba(168,85,247,0.05),transparent_30%),radial-gradient(circle_at_82%_6%,rgba(59,130,246,0.05),transparent_32%)]" />
      <div className="relative mx-auto max-w-[1000px] px-6 pt-8 pb-24 md:px-10">
        {children}
      </div>
    </main>
  );
}

export default function ConsolePage() {
  const { data, error, isLoading, mutate } = useSWR<AgentsSnapshot>(
    "/api/admin/agents",
    fetchConsole,
    // Slower than the station: nobody watches a control panel tick, and a
    // refresh mid-edit is a nuisance.
    { refreshInterval: REFRESH_MS, revalidateOnFocus: false }
  );

  if (isLoading) {
    return (
      <Shell>
        <div className="h-3 w-52 animate-pulse rounded-full bg-neutral-200/70" />
        <div className="mt-12 space-y-6">
          {["a1", "a2", "a3", "a4"].map((key) => (
            <div
              className="h-28 w-full animate-pulse rounded-lg bg-neutral-100"
              key={key}
            />
          ))}
        </div>
      </Shell>
    );
  }

  if (error || !data) {
    return (
      <Shell>
        <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
          <p className="text-[15px] text-neutral-700">
            Пульт не отвечает — агенты не собрались.
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

  const silenced = data.agents.filter((agent) => !agent.effective.enabled).length;

  return (
    <Shell>
      <header className="flex items-baseline justify-between gap-4">
        <Link
          className="text-[11px] uppercase tracking-[0.34em] text-neutral-400 transition-colors hover:text-neutral-700"
          href="/admin"
        >
          Orbital / Станция / Пульт
        </Link>
        <span className="font-mono text-[11px] text-neutral-400 tabular-nums">
          снято в {formatTime(data.generatedAt)}
        </span>
      </header>

      {data.failures?.length ? (
        <p className="mt-8 font-mono text-[11px] text-red-500">
          не собралось: {data.failures.map((f) => f.source).join(", ")}
        </p>
      ) : null}

      <div className="mt-10 flex items-baseline gap-6 border-neutral-200/70 border-b pb-3">
        <h1 className="text-[10px] uppercase tracking-[0.2em] text-neutral-400">
          Агенты
        </h1>
        <span className="font-mono text-[11px] text-neutral-400 tabular-nums">
          {formatNumber(data.agents.length)}
        </span>
        {silenced > 0 ? (
          <span className="ml-auto text-[11px] text-neutral-400">
            {formatNumber(silenced)} молчит
          </span>
        ) : null}
      </div>

      <ul>
        {data.agents.map((agent) => (
          <AgentRow
            agent={agent}
            key={agent.id}
            onSaved={() => mutate()}
            tools={data.tools}
          />
        ))}
      </ul>

      <BanitaCapability />

      <p className="mt-12 max-w-[560px] text-[11.5px] text-neutral-400 leading-relaxed">
        Личность, слова-обращения и сами инструменты живут в коде — их отсюда не
        переписать. Пульт меняет то, что можно повернуть без деплоя: модель,
        характер, шаги, промпт, набор инструментов и молчание.
      </p>
    </Shell>
  );
}
