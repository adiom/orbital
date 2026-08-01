import { cn } from "@/lib/utils";
import { formatTime } from "./format";
import type { AdminOverview } from "./types";

export function EventsStream({ events }: { events: AdminOverview["events"] }) {
  return (
    <section aria-label="События">
      <h2 className="text-[10px] uppercase tracking-[0.2em] text-neutral-400">
        События
      </h2>

      {events.length === 0 ? (
        <p className="mt-5 text-[13px] text-neutral-400">Пока тихо</p>
      ) : (
        <ul className="mt-4 space-y-1.5 font-mono text-[11px] tabular-nums">
          {events.map((event, index) => {
            const failed = event.status !== "ok" && event.status !== "success";
            return (
              <li
                className="flex items-baseline gap-2"
                key={`${event.at}-${index}`}
              >
                <span className="shrink-0 text-neutral-300">
                  {formatTime(event.at)}
                </span>
                <span className="w-8 shrink-0 text-neutral-400">
                  {event.source}
                </span>
                <span
                  className={cn(
                    "min-w-0 flex-1 truncate",
                    failed ? "text-red-500" : "text-neutral-600"
                  )}
                >
                  {event.detail || event.label || "—"}
                </span>
                {event.durationMs !== null ? (
                  <span className="shrink-0 text-neutral-300">
                    {event.durationMs}ms
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
