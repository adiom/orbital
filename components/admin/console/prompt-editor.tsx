"use client";

import { useEffect, useState } from "react";
import { toast } from "@/components/toast";
import { formatRelative } from "@/components/admin/format";
import { cn } from "@/lib/utils";
import type { PromptHistory } from "./types";

/**
 * Splits two texts into aligned lines and marks what moved.
 *
 * A word-level diff would be prettier, but a prompt is read as instructions —
 * the operator needs to see which *line* changed, not which character.
 */
function lineDiff(before: string, after: string) {
  const a = before.split("\n");
  const b = after.split("\n");
  const removed = new Set(a.filter((line) => !b.includes(line)));
  const added = new Set(b.filter((line) => !a.includes(line)));
  return { removed, added };
}

export function PromptEditor({
  agentId,
  onSaved,
}: {
  agentId: string;
  onSaved?: () => void;
}) {
  const [history, setHistory] = useState<PromptHistory | null>(null);
  const [draft, setDraft] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [comparing, setComparing] = useState<number | null>(null);

  useEffect(() => {
    let alive = true;

    (async () => {
      setLoading(true);

      try {
        const response = await fetch(`/api/admin/agents/${agentId}/prompt`, {
          credentials: "include",
        });

        if (!(response.ok && alive)) {
          return;
        }

        const data: PromptHistory = await response.json();

        if (!alive) {
          return;
        }

        setHistory(data);
        // Edit what the agent is actually saying: the live version if one was
        // saved, otherwise the text from code.
        setDraft(data.versions[0]?.prompt ?? data.code ?? "");
      } finally {
        if (alive) {
          setLoading(false);
        }
      }
    })();

    return () => {
      alive = false;
    };
  }, [agentId]);

  const live = history?.versions[0] ?? null;
  const baseline = live?.prompt ?? history?.code ?? "";
  const dirty = draft !== baseline;

  async function save() {
    setSaving(true);

    try {
      const response = await fetch(`/api/admin/agents/${agentId}/prompt`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ prompt: draft, note: note.trim() || null }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result?.error ?? "Не удалось сохранить");
      }

      toast({
        type: "success",
        description: result.unchanged
          ? "Текст не изменился"
          : `Сохранено — версия ${result.version}`,
      });

      setNote("");

      // Refetch so the new version heads the history.
      const refreshed = await fetch(`/api/admin/agents/${agentId}/prompt`, {
        credentials: "include",
      });
      if (refreshed.ok) {
        setHistory(await refreshed.json());
      }

      onSaved?.();
    } catch (error) {
      toast({
        type: "error",
        description: error instanceof Error ? error.message : "Не удалось сохранить",
      });
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="mt-4 h-32 animate-pulse rounded-lg bg-neutral-100" />
    );
  }

  if (!history) {
    return (
      <p className="mt-4 text-[13px] text-neutral-400">
        Промпт не читается
      </p>
    );
  }

  // Agents whose prompt is assembled from live context (Avrora builds it from
  // the Sfera) have nothing meaningful to show as a starting text.
  if (!(history.code || history.versions.length)) {
    return (
      <p className="mt-4 text-[12.5px] text-neutral-400 leading-relaxed">
        Этот агент собирает промпт из контекста разговора — редактировать
        нечего, пока не сохранена своя версия.
      </p>
    );
  }

  const compared =
    comparing === null
      ? null
      : history.versions.find((v) => v.version === comparing) ?? null;
  const diff = compared ? lineDiff(compared.prompt, draft) : null;

  return (
    <div className="mt-4">
      <div className="mb-2 flex items-baseline justify-between gap-4">
        <span className="text-[10px] uppercase tracking-[0.2em] text-neutral-400">
          {live
            ? `Версия ${live.version} · ${formatRelative(live.createdAt)} · ${live.authorEmail ?? "—"}`
            : "Текст из кода"}
        </span>

        {history.versions.length > 0 ? (
          <button
            className="text-[11px] text-neutral-400 transition-colors hover:text-neutral-700 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
            onClick={() => setComparing(comparing === null ? live?.version ?? null : null)}
            type="button"
          >
            {comparing === null ? "сравнить" : "скрыть"}
          </button>
        ) : null}
      </div>

      <textarea
        className={cn(
          "w-full resize-y rounded-lg border bg-white p-3 font-mono text-[12px] leading-relaxed",
          "focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
          dirty ? "border-neutral-300" : "border-neutral-200"
        )}
        onChange={(event) => setDraft(event.target.value)}
        rows={14}
        spellCheck={false}
        value={draft}
      />

      {diff && compared ? (
        <div className="mt-3 max-h-52 overflow-y-auto rounded-lg border border-neutral-100 bg-neutral-50/60 p-3 font-mono text-[11px] leading-relaxed">
          <p className="mb-2 text-[10px] uppercase tracking-[0.2em] text-neutral-400">
            Против версии {compared.version}
          </p>
          {[...diff.removed].slice(0, 40).map((line) => (
            <div className="text-red-500" key={`r-${line}`}>
              − {line || "⏎"}
            </div>
          ))}
          {[...diff.added].slice(0, 40).map((line) => (
            <div className="text-emerald-600" key={`a-${line}`}>
              + {line || "⏎"}
            </div>
          ))}
          {diff.removed.size + diff.added.size === 0 ? (
            <span className="text-neutral-400">Ничего не изменилось</span>
          ) : null}
        </div>
      ) : null}

      <div className="mt-3 flex items-center gap-3">
        <input
          aria-label="Зачем меняли"
          className="h-9 min-w-0 flex-1 rounded-lg border border-neutral-200 bg-white px-3 text-[12.5px] outline-none placeholder:text-neutral-300 focus-visible:ring-[3px] focus-visible:ring-ring/50"
          onChange={(event) => setNote(event.target.value)}
          placeholder="Зачем меняли — увидят те, кто будет откатывать"
          value={note}
        />

        <button
          className={cn(
            "shrink-0 rounded-full px-4 py-2 text-[12.5px] transition-colors focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
            dirty
              ? "bg-neutral-900 text-white hover:bg-neutral-800"
              : "cursor-not-allowed bg-neutral-100 text-neutral-400"
          )}
          disabled={!dirty || saving}
          onClick={save}
          type="button"
        >
          {saving ? "сохраняю…" : "сохранить версию"}
        </button>
      </div>

      {history.versions.length > 1 ? (
        <ul className="mt-5 space-y-1.5">
          {history.versions.slice(1).map((version) => (
            <li
              className="flex items-baseline gap-3 text-[11.5px]"
              key={version.version}
            >
              <span className="w-8 shrink-0 font-mono text-neutral-400 tabular-nums">
                v{version.version}
              </span>
              <span className="w-[92px] shrink-0 text-neutral-400">
                {formatRelative(version.createdAt)}
              </span>
              <span className="min-w-0 flex-1 truncate text-neutral-500">
                {version.note ?? "—"}
              </span>
              <button
                className="shrink-0 text-neutral-400 transition-colors hover:text-neutral-800 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
                onClick={() => setDraft(version.prompt)}
                type="button"
              >
                вернуть
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
