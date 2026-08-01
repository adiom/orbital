"use client";

import {
  formatNumber,
  formatRelative,
} from "@/components/admin/format";
import { cn } from "@/lib/utils";
import type { AgentReading, ToolReading } from "./types";

/**
 * Tools sorted by how much they are actually used.
 *
 * Sorting by real calls rather than by name means a tool nobody invokes rises
 * into view on its own — "never called" is a diagnosis, not an empty cell.
 */
export function ToolsGrid({
  tools,
  agent,
  onToggle,
  saving,
}: {
  tools: ToolReading[];
  /** The agent whose allow-list is being edited. */
  agent: AgentReading;
  onToggle: (toolName: string, next: boolean) => void;
  saving?: boolean;
}) {
  // Only tools this agent's code actually defines can be handed to it.
  const available = tools.filter((tool) =>
    agent.code.toolNames.includes(tool.name)
  );

  if (available.length === 0) {
    return (
      <p className="mt-4 text-[13px] text-neutral-400">
        У этого агента нет инструментов
      </p>
    );
  }

  return (
    <ul className="mt-4">
      {available.map((tool) => {
        const on = agent.effective.toolNames.includes(tool.name);
        const dead = tool.calls === 0;

        return (
          <li
            className="flex items-center gap-3 border-neutral-100 border-b py-2 last:border-b-0"
            key={tool.name}
          >
            <input
              aria-label={`${tool.name} для ${agent.name}`}
              checked={on}
              className="size-3.5 shrink-0 cursor-pointer accent-neutral-900 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
              disabled={saving}
              onChange={(event) => onToggle(tool.name, event.target.checked)}
              type="checkbox"
            />

            <span
              className={cn(
                "min-w-0 flex-1 truncate font-mono text-[12px]",
                on ? "text-neutral-800" : "text-neutral-400"
              )}
            >
              {tool.name}
            </span>

            <span className="w-[112px] shrink-0 text-right font-mono text-[11px] text-neutral-500 tabular-nums">
              {dead ? (
                <span className="text-neutral-300">ни разу не звали</span>
              ) : (
                `${formatNumber(tool.calls)} вызовов`
              )}
            </span>

            <span className="w-[76px] shrink-0 text-right font-mono text-[11px] tabular-nums">
              {tool.errors > 0 ? (
                <span className="text-red-500">
                  {formatNumber(tool.errors)} сбоев
                </span>
              ) : (
                <span className="text-neutral-300">—</span>
              )}
            </span>

            <span className="hidden w-[104px] shrink-0 text-right text-[11px] text-neutral-400 sm:block">
              {tool.lastCalledAt ? formatRelative(tool.lastCalledAt) : "—"}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
