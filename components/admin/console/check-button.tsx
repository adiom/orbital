"use client";

import { useState } from "react";
import { formatRelative } from "@/components/admin/format";
import { cn } from "@/lib/utils";
import type { CheckResult } from "./types";

/**
 * Asks whether the agent is actually reachable, and says so in place.
 *
 * The station could only ever show a stale healthStatus from a table that no
 * MCP agent writes to. This is the operator pressing the button themselves,
 * with the answer landing on the same line as the question.
 */
export function CheckButton({
  agentId,
  last,
  onChecked,
}: {
  agentId: string;
  last: { at: string | null; ok: boolean | null; ms: number | null; error: string | null };
  onChecked?: () => void;
}) {
  const [checking, setChecking] = useState(false);
  const [fresh, setFresh] = useState<CheckResult | null>(null);

  async function check() {
    setChecking(true);

    try {
      const response = await fetch(`/api/admin/agents/${agentId}/check`, {
        method: "POST",
        credentials: "include",
      });

      const result = await response.json();

      if (response.ok) {
        setFresh(result);
      } else {
        setFresh({
          ok: false,
          ms: 0,
          error: result?.error ?? "Проверка не прошла",
          target: "",
        });
      }

      onChecked?.();
    } catch {
      setFresh({ ok: false, ms: 0, error: "Проверка не дошла", target: "" });
    } finally {
      setChecking(false);
    }
  }

  // A just-pressed check outranks whatever the last stored one said.
  const ok = fresh ? fresh.ok : last.ok;
  const ms = fresh ? fresh.ms : last.ms;
  const error = fresh ? fresh.error : last.error;
  const when = fresh ? "только что" : formatRelative(last.at);

  return (
    <div className="flex items-baseline gap-3">
      <button
        className={cn(
          "shrink-0 text-[11px] text-neutral-400 underline decoration-neutral-200 decoration-dotted underline-offset-[3px] transition-colors",
          "hover:text-neutral-700 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
          checking && "cursor-wait opacity-60"
        )}
        disabled={checking}
        onClick={check}
        type="button"
      >
        {checking ? "проверяю…" : "проверить"}
      </button>

      {ok === null && !checking ? (
        <span className="text-[11px] text-neutral-300">не проверялся</span>
      ) : null}

      {ok === true ? (
        <span className="font-mono text-[11px] text-emerald-600 tabular-nums">
          ответил за {ms}ms · {when}
        </span>
      ) : null}

      {ok === false ? (
        <span className="min-w-0 truncate font-mono text-[11px] text-red-500">
          {error ?? "не отвечает"} · {when}
        </span>
      ) : null}
    </div>
  );
}
