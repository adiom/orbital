"use client";

import { useState } from "react";
import {
  formatCents,
  formatNumber,
  formatRelative,
} from "@/components/admin/format";
import { LifeDot, lifeState } from "@/components/admin/life-dot";
import { PulseLine } from "@/components/admin/pulse-line";
import { toast } from "@/components/toast";
import { cn } from "@/lib/utils";
import { CheckButton } from "./check-button";
import { Dial } from "./dial";
import { PromptEditor } from "./prompt-editor";
import { ToolsGrid } from "./tools-grid";
import type { AgentReading, OverridePatch, ToolReading } from "./types";

const RUNTIME_LABEL: Record<AgentReading["runtime"], string> = {
  internal: "внутренний",
  "external-mcp": "внешний · MCP",
};

type Panel = "none" | "tools" | "prompt";

export function AgentRow({
  agent,
  tools,
  onSaved,
}: {
  agent: AgentReading;
  tools: ToolReading[];
  onSaved: () => void;
}) {
  const [panel, setPanel] = useState<Panel>("none");
  const [draft, setDraft] = useState<OverridePatch>({});
  const [saving, setSaving] = useState(false);

  const dirty = Object.keys(draft).length > 0;

  // The row always shows what would be running if saved, so a dial moves the
  // number next to it before anything is written.
  const shown = {
    enabled: draft.enabled ?? agent.effective.enabled,
    temperature:
      draft.temperature === undefined
        ? agent.overrides?.temperature ?? null
        : draft.temperature,
    maxSteps:
      draft.maxSteps === undefined
        ? agent.overrides?.maxSteps ?? null
        : draft.maxSteps,
    tools: draft.tools ?? agent.effective.toolNames,
  };

  // A silenced agent reads as quiet no matter when it last spoke.
  const state = shown.enabled
    ? lifeState(agent.activity.lastReplyAt, null)
    : "quiet";

  async function persist(patch: OverridePatch) {
    setSaving(true);

    try {
      const response = await fetch("/api/admin/agents", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ agentId: agent.id, ...patch }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result?.error ?? "Не удалось сохранить");
      }

      setDraft({});
      onSaved();
      toast({ type: "success", description: "Сохранено" });
    } catch (error) {
      toast({
        type: "error",
        description:
          error instanceof Error ? error.message : "Не удалось сохранить",
      });
    } finally {
      setSaving(false);
    }
  }

  async function resetToCode() {
    setSaving(true);

    try {
      const response = await fetch(
        `/api/admin/agents?agentId=${encodeURIComponent(agent.id)}`,
        { method: "DELETE", credentials: "include" }
      );

      if (!response.ok) {
        throw new Error("Не удалось вернуть к коду");
      }

      setDraft({});
      onSaved();
      toast({ type: "success", description: "Вернул к коду" });
    } catch (error) {
      toast({
        type: "error",
        description:
          error instanceof Error ? error.message : "Не удалось вернуть",
      });
    } finally {
      setSaving(false);
    }
  }

  function toggleTool(name: string, next: boolean) {
    const current = new Set(shown.tools);

    if (next) {
      current.add(name);
    } else {
      current.delete(name);
    }

    setDraft((previous) => ({ ...previous, tools: [...current] }));
  }

  const internal = agent.runtime === "internal";

  return (
    <li
      className={cn(
        "border-neutral-100 border-b py-6 last:border-b-0",
        !shown.enabled && "opacity-55"
      )}
    >
      {/* Identity and what it has been doing */}
      <div className="flex items-baseline gap-3">
        <LifeDot className="mt-[7px]" state={state} />

        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2.5">
            <span className="truncate text-[14px] text-neutral-900">
              {agent.name}
            </span>
            {shown.enabled ? null : (
              <span className="shrink-0 text-[10px] uppercase tracking-[0.2em] text-neutral-400">
                молчит
              </span>
            )}
          </div>

          <div className="mt-1 flex items-baseline gap-3 font-mono text-[11px] text-neutral-400">
            <span className="truncate">
              {agent.code.mentionPatterns.map((p) => `@${p.replace(/^@/, "")}`).join(" ")}
            </span>
          </div>
        </div>

        <div className="hidden shrink-0 text-right text-[11px] text-neutral-400 sm:block">
          {RUNTIME_LABEL[agent.runtime]}
          {internal ? ` · ${agent.effective.model}` : ""}
        </div>
      </div>

      {/* Consequence line: what this agent cost and how often it broke */}
      <div className="mt-3 flex items-center gap-4 pl-[18px]">
        <PulseLine state={state} values={agent.activity.series} />

        <span className="font-mono text-[11px] text-neutral-500 tabular-nums">
          {formatNumber(agent.activity.requests)} обращений
          {agent.activity.spendCents > 0
            ? ` · ${formatCents(agent.activity.spendCents)}`
            : ""}
        </span>

        {agent.activity.errors > 0 ? (
          <span className="font-mono text-[11px] text-red-500 tabular-nums">
            {formatNumber(agent.activity.errors)} сбоев
          </span>
        ) : null}

        <span className="ml-auto shrink-0 text-[11px] text-neutral-400">
          {agent.activity.lastReplyAt
            ? `отвечал ${formatRelative(agent.activity.lastReplyAt)}`
            : "ещё не отвечал"}
        </span>
      </div>

      {/* Dials — only meaningful for agents we run ourselves */}
      {internal ? (
        <div className="mt-5 space-y-2.5 pl-[18px]">
          <Dial
            consequence="строже ↔ свободнее"
            disabled={saving}
            fallback={agent.code.temperature}
            format={(v) => v.toFixed(2)}
            label="характер"
            max={1}
            min={0}
            onChange={(value) =>
              setDraft((previous) => ({ ...previous, temperature: value }))
            }
            step={0.05}
            value={shown.temperature}
          />

          <Dial
            consequence="каждый шаг — отдельный вызов модели"
            disabled={saving}
            fallback={agent.code.maxSteps}
            label="шагов"
            max={12}
            min={1}
            onChange={(value) =>
              setDraft((previous) => ({ ...previous, maxSteps: value }))
            }
            step={1}
            value={shown.maxSteps}
          />
        </div>
      ) : null}

      {/* MCP endpoint and the only liveness signal these agents have */}
      {agent.runtime === "external-mcp" ? (
        <div className="mt-4 pl-[18px]">
          <div className="font-mono text-[11px] text-neutral-500">
            {agent.effective.mcpEndpoint?.replace(/^https?:\/\//, "") ?? "адрес не задан"}
          </div>
          <div className="mt-1.5">
            <CheckButton
              agentId={agent.id}
              last={agent.check}
              onChecked={onSaved}
            />
          </div>
        </div>
      ) : (
        <div className="mt-3 pl-[18px]">
          <CheckButton agentId={agent.id} last={agent.check} onChecked={onSaved} />
        </div>
      )}

      {/* Prompt and tools, opened on demand */}
      <div className="mt-4 flex items-baseline gap-5 pl-[18px]">
        {agent.code.hasPrompt ? (
          <button
            className={cn(
              "text-[11.5px] transition-colors focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
              panel === "prompt"
                ? "text-neutral-900"
                : "text-neutral-400 hover:text-neutral-700"
            )}
            onClick={() => setPanel(panel === "prompt" ? "none" : "prompt")}
            type="button"
          >
            промпт
            <span className="ml-1.5 font-mono text-[11px] text-neutral-400">
              {agent.prompt.overridden ? `v${agent.prompt.version}` : "из кода"}
            </span>
          </button>
        ) : null}

        {agent.code.toolNames.length > 0 ? (
          <button
            className={cn(
              "text-[11.5px] transition-colors focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
              panel === "tools"
                ? "text-neutral-900"
                : "text-neutral-400 hover:text-neutral-700"
            )}
            onClick={() => setPanel(panel === "tools" ? "none" : "tools")}
            type="button"
          >
            инструменты
            <span className="ml-1.5 font-mono text-[11px] text-neutral-400 tabular-nums">
              {shown.tools.length} из {agent.code.toolNames.length}
            </span>
          </button>
        ) : null}

        <button
          className="text-[11.5px] text-neutral-400 transition-colors hover:text-neutral-700 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
          disabled={saving}
          onClick={() =>
            setDraft((previous) => ({ ...previous, enabled: !shown.enabled }))
          }
          type="button"
        >
          {shown.enabled ? "выключить" : "включить"}
        </button>

        {agent.overrides || agent.prompt.overridden ? (
          <button
            className="ml-auto text-[11px] text-neutral-300 transition-colors hover:text-neutral-600 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
            disabled={saving}
            onClick={resetToCode}
            type="button"
          >
            вернуть к коду
          </button>
        ) : null}
      </div>

      {/* Explicit save: a prompt or a silenced agent is too costly to autosave */}
      {dirty ? (
        <div className="mt-4 flex items-center gap-3 pl-[18px]">
          <button
            className="rounded-full bg-neutral-900 px-4 py-1.5 text-[12.5px] text-white transition-colors hover:bg-neutral-800 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
            disabled={saving}
            onClick={() => persist(draft)}
            type="button"
          >
            {saving ? "сохраняю…" : "сохранить"}
          </button>
          <button
            className="text-[11.5px] text-neutral-400 transition-colors hover:text-neutral-700 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
            disabled={saving}
            onClick={() => setDraft({})}
            type="button"
          >
            отменить
          </button>
        </div>
      ) : null}

      {panel === "tools" ? (
        <div className="pl-[18px]">
          <ToolsGrid
            agent={{
              ...agent,
              effective: { ...agent.effective, toolNames: shown.tools },
            }}
            onToggle={toggleTool}
            saving={saving}
            tools={tools}
          />
        </div>
      ) : null}

      {panel === "prompt" ? (
        <div className="pl-[18px]">
          <PromptEditor agentId={agent.id} onSaved={onSaved} />
        </div>
      ) : null}
    </li>
  );
}
