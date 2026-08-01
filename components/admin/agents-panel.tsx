import { formatNumber, formatRelative } from "./format";
import type { AdminOverview } from "./types";

const HEALTH: Record<string, { color: string; label: string }> = {
  healthy: { color: "#34D399", label: "отвечает" },
  unhealthy: { color: "#EF4444", label: "не отвечает" },
  unknown: { color: "#D6D3D1", label: "не проверялся" },
};

export function AgentsPanel({ agents }: { agents: AdminOverview["agents"] }) {
  return (
    <section aria-label="Агенты">
      <header className="flex items-baseline justify-between">
        <h2 className="text-[10px] uppercase tracking-[0.2em] text-neutral-400">
          Агенты
        </h2>
        <span className="font-mono text-[11px] text-neutral-400 tabular-nums">
          {formatNumber(agents.length)}
        </span>
      </header>

      {agents.length === 0 ? (
        <p className="mt-5 text-[13px] text-neutral-400">Агентов не подключено</p>
      ) : (
        <ul className="mt-5 space-y-3">
          {agents.map((agent) => {
            const health = HEALTH[agent.healthStatus] ?? HEALTH.unknown;
            return (
              <li className="flex items-start gap-2.5" key={agent.id}>
                <span
                  aria-hidden="true"
                  className="mt-[6px] inline-block h-1.5 w-1.5 shrink-0 rounded-full"
                  style={{ backgroundColor: health.color }}
                />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[12.5px] text-neutral-800">
                    {agent.name}
                  </div>
                  <div className="font-mono text-[10.5px] text-neutral-400">
                    {health.label} · {formatRelative(agent.lastHealthCheck)}
                  </div>
                </div>
                {agent.failedWebhookCount > 0 ? (
                  <span className="shrink-0 font-mono text-[10.5px] text-red-500 tabular-nums">
                    {formatNumber(agent.failedWebhookCount)} сбоев
                  </span>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
