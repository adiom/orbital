"use client";

import Link from "next/link";
import useSWR from "swr";
import type { AgentsSnapshot } from "@/components/admin/console/types";
import { formatNumber, formatRelative } from "./format";
import { LifeDot, lifeState } from "./life-dot";

async function fetchAgents(url: string): Promise<AgentsSnapshot> {
  const response = await fetch(url, { credentials: "include" });

  if (!response.ok) {
    throw new Error("Агенты не собрались");
  }

  return response.json();
}

/**
 * Agents that actually exist.
 *
 * This panel used to read the AgentRegistry table, which only ever held
 * webhook agents — nobody registers there, so it always said "Агентов не
 * подключено" while Kristina was answering in production. The real agents live
 * in code and are read through the console endpoint.
 */
export function AgentsPanel() {
  const { data, error, isLoading } = useSWR<AgentsSnapshot>(
    "/api/admin/agents",
    fetchAgents,
    { revalidateOnFocus: false }
  );

  const agents = data?.agents ?? [];

  return (
    <section aria-label="Агенты">
      <header className="flex items-baseline justify-between">
        <h2 className="text-[10px] uppercase tracking-[0.2em] text-neutral-400">
          Агенты
        </h2>
        <Link
          className="font-mono text-[11px] text-neutral-400 tabular-nums transition-colors hover:text-neutral-700"
          href="/admin/agents"
        >
          {isLoading ? "…" : formatNumber(agents.length)} →
        </Link>
      </header>

      {error ? (
        <p className="mt-5 text-[13px] text-neutral-400">Агенты не отвечают</p>
      ) : null}

      {isLoading ? (
        <div className="mt-5 space-y-3">
          {["a1", "a2", "a3"].map((key) => (
            <div className="h-6 animate-pulse rounded bg-neutral-100" key={key} />
          ))}
        </div>
      ) : null}

      {!(isLoading || error) && agents.length === 0 ? (
        <p className="mt-5 text-[13px] text-neutral-400">Агентов нет в коде</p>
      ) : null}

      {agents.length > 0 ? (
        <ul className="mt-5 space-y-3">
          {agents.map((agent) => {
            // A silenced agent reads as quiet however recently it spoke.
            const state = agent.effective.enabled
              ? lifeState(agent.activity.lastReplyAt, null)
              : "quiet";

            const failed = agent.check.ok === false;
            let status: string;

            if (failed) {
              status = agent.check.error ?? "не отвечает";
            } else if (agent.activity.lastReplyAt) {
              status = `отвечал ${formatRelative(agent.activity.lastReplyAt)}`;
            } else {
              status = "ещё не отвечал";
            }

            return (
              <li className="flex items-start gap-2.5" key={agent.id}>
                <LifeDot className="mt-[6px]" state={state} />

                <div className="min-w-0 flex-1">
                  <div className="truncate text-[12.5px] text-neutral-800">
                    {agent.name}
                    {agent.effective.enabled ? null : (
                      <span className="ml-2 text-[10px] uppercase tracking-[0.2em] text-neutral-300">
                        молчит
                      </span>
                    )}
                  </div>
                  <div className="truncate font-mono text-[10.5px] text-neutral-400">
                    {status}
                  </div>
                </div>

                {agent.activity.errors > 0 ? (
                  <span className="shrink-0 font-mono text-[10.5px] text-red-500 tabular-nums">
                    {formatNumber(agent.activity.errors)} сбоев
                  </span>
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : null}
    </section>
  );
}
