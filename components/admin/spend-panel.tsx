import { formatCents, formatNumber } from "./format";
import type { AdminOverview } from "./types";

export function SpendPanel({ spend }: { spend: AdminOverview["spend"] }) {
  const total = spend.byProvider.reduce((sum, row) => sum + row.cents, 0);
  const peak = Math.max(1, ...spend.byProvider.map((row) => row.cents));

  return (
    <section aria-label="Расход AI">
      <header className="flex items-baseline justify-between">
        <h2 className="text-[10px] uppercase tracking-[0.2em] text-neutral-400">
          Расход AI · {spend.days} дней
        </h2>
        <span className="font-mono text-[13px] text-neutral-900 tabular-nums">
          {formatCents(total)}
        </span>
      </header>

      {spend.byProvider.length === 0 ? (
        <p className="mt-5 text-[13px] text-neutral-400">Запросов ещё не было</p>
      ) : (
        <ul className="mt-5 space-y-3.5">
          {spend.byProvider.map((row) => (
            <li key={row.provider}>
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-[12.5px] text-neutral-700">
                  {row.provider}
                </span>
                <span className="font-mono text-[11px] text-neutral-500 tabular-nums">
                  {formatCents(row.cents)}
                </span>
              </div>
              <div className="mt-1.5 h-[3px] w-full overflow-hidden rounded-full bg-neutral-100">
                <div
                  className="h-full rounded-full bg-violet-300 transition-all duration-700"
                  style={{ width: `${Math.max(3, (row.cents / peak) * 100)}%` }}
                />
              </div>
              <div className="mt-1.5 font-mono text-[10.5px] text-neutral-400 tabular-nums">
                {formatNumber(row.requests)} запросов ·{" "}
                {formatNumber(row.tokens)} токенов
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
