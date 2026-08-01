"use client";

import { useState } from "react";

type Check = {
  ok: boolean;
  enabled: boolean;
  configured: boolean;
  hasApiKey: boolean;
  ms: number;
  error: string | null;
  apiUrl: string;
  model: string;
  checkedAt: string;
};

export function BanitaCapability() {
  const [check, setCheck] = useState<Check | null>(null);
  const [checking, setChecking] = useState(false);

  const runCheck = async () => {
    setChecking(true);
    try {
      const response = await fetch("/api/admin/capabilities/banita/check", { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Проверка не удалась");
      setCheck(payload as Check);
    } catch (error) {
      setCheck({
        ok: false,
        enabled: true,
        configured: false,
        hasApiKey: false,
        ms: 0,
        error: error instanceof Error ? error.message : "Проверка не удалась",
        apiUrl: "—",
        model: "banita-sketch",
        checkedAt: new Date().toISOString(),
      });
    } finally {
      setChecking(false);
    }
  };

  return (
    <section className="mt-14 border-neutral-200/70 border-t pt-8">
      <div className="flex items-baseline justify-between gap-4">
        <div>
          <p className="text-[10px] uppercase tracking-[0.2em] text-neutral-400">Capabilities</p>
          <h2 className="mt-3 text-lg font-medium">BANITA / image.generate</h2>
        </div>
        <span className={`size-2.5 rounded-full ${check?.ok ? "bg-emerald-500" : check ? "bg-red-500" : "bg-neutral-300"}`} />
      </div>

      <div className="mt-5 grid gap-2 font-mono text-[11px] text-neutral-500 sm:grid-cols-2">
        <span>status: {check ? (check.enabled ? "enabled" : "disabled") : "не проверено"}</span>
        <span>API key: {check ? (check.hasApiKey ? "configured" : "missing") : "скрыт"}</span>
        <span>model: {check?.model || "banita-sketch"}</span>
        <span>latency: {check ? `${check.ms} ms` : "—"}</span>
        <span className="truncate sm:col-span-2">API: {check?.apiUrl || "из окружения"}</span>
      </div>

      {check?.error ? <p className="mt-3 text-[12px] text-red-600">{check.error}</p> : null}
      <button
        className="mt-5 rounded-full border border-neutral-200 bg-white px-4 py-2 text-[12px] transition-colors hover:bg-neutral-50 disabled:opacity-50"
        disabled={checking}
        onClick={() => void runCheck()}
        type="button"
      >
        {checking ? "Проверяем…" : "Проверить /health"}
      </button>
    </section>
  );
}
