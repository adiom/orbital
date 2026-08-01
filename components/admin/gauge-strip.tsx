import { formatCents, formatNumber } from "./format";
import type { LifeState } from "./life-dot";
import { PulseLine } from "./pulse-line";
import type { AdminOverview } from "./types";

type Reading = {
  label: string;
  value: string;
  hint?: string;
  series: number[];
  state: LifeState;
};

function readings(gauges: AdminOverview["gauges"]): Reading[] {
  return [
    {
      label: "Люди",
      value: formatNumber(gauges.people.value),
      series: gauges.people.series,
      state: "born",
    },
    {
      label: "Живых ячеек",
      value: formatNumber(gauges.livingCells.value),
      hint: `из ${formatNumber(gauges.livingCells.total ?? 0)}`,
      series: gauges.livingCells.series,
      state: "alive",
    },
    {
      label: "Сообщений / 24ч",
      value: formatNumber(gauges.messages24h.value),
      series: gauges.messages24h.series,
      state: "alive",
    },
    {
      label: "AI-запросов / 24ч",
      value: formatNumber(gauges.aiRequests24h.value),
      series: gauges.aiRequests24h.series,
      state: "settled",
    },
    {
      label: "Расход / 24ч",
      value: formatCents(gauges.spend24hCents.value),
      series: gauges.spend24hCents.series,
      state: "settled",
    },
    {
      label: "Ошибок / 24ч",
      value: formatNumber(gauges.errors24h.value),
      series: gauges.errors24h.series,
      state: gauges.errors24h.value > 0 ? "born" : "quiet",
    },
  ];
}

/**
 * One horizontal ridge of readings separated by hairlines — no cards,
 * no growth arrows. The numbers are instrument readouts, not achievements.
 */
export function GaugeStrip({ gauges }: { gauges: AdminOverview["gauges"] }) {
  return (
    <section
      aria-label="Показания"
      className="grid grid-cols-2 gap-y-8 sm:grid-cols-3 lg:grid-cols-6"
    >
      {readings(gauges).map((reading) => (
        <div
          className={[
            "border-neutral-200/70 border-l pl-5",
            // Hide the rule at the start of each row, per breakpoint.
            "[&:nth-child(odd)]:border-l-0 [&:nth-child(odd)]:pl-0",
            "sm:[&:nth-child(odd)]:border-l sm:[&:nth-child(odd)]:pl-5",
            "sm:[&:nth-child(3n+1)]:border-l-0 sm:[&:nth-child(3n+1)]:pl-0",
            "lg:[&:nth-child(3n+1)]:border-l lg:[&:nth-child(3n+1)]:pl-5",
            "lg:first:border-l-0 lg:first:pl-0",
          ].join(" ")}
          key={reading.label}
        >
          <div className="text-[10px] uppercase tracking-[0.2em] text-neutral-400">
            {reading.label}
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="font-light font-mono text-[34px] leading-none tracking-[-0.03em] text-neutral-950 tabular-nums">
              {reading.value}
            </span>
            {reading.hint ? (
              <span className="font-mono text-[11px] text-neutral-400 tabular-nums">
                {reading.hint}
              </span>
            ) : null}
          </div>
          <PulseLine
            className="mt-3"
            state={reading.state}
            values={reading.series}
            width={72}
          />
        </div>
      ))}
    </section>
  );
}
