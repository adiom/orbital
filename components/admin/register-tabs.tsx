"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { CellsRegister } from "./cells-register";
import { formatNumber } from "./format";
import { KeysRegister } from "./keys-register";
import { PeopleRegister } from "./people-register";
import type { AdminOverview } from "./types";

type Tab = "people" | "cells" | "keys";

const TABS: Array<{ id: Tab; label: string }> = [
  { id: "people", label: "Люди" },
  { id: "cells", label: "Ячейки" },
  { id: "keys", label: "Ключи" },
];

export function RegisterTabs({
  people,
  cells,
  keys,
  onChanged,
}: {
  people: AdminOverview["people"];
  cells: AdminOverview["cells"];
  keys: AdminOverview["keys"];
  onChanged?: () => void;
}) {
  const [tab, setTab] = useState<Tab>("people");
  const counts: Record<Tab, number> = {
    people: people.length,
    cells: cells.length,
    keys: keys.length,
  };

  return (
    <section aria-label="Регистр">
      <div className="mb-5 flex items-center gap-6 border-neutral-200/70 border-b pb-3">
        {TABS.map((item) => (
          <button
            aria-selected={tab === item.id}
            className={cn(
              "-mb-[13px] flex items-baseline gap-2 border-b pb-3 text-[10px] uppercase tracking-[0.2em] transition-colors focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
              tab === item.id
                ? "border-neutral-900 text-neutral-900"
                : "border-transparent text-neutral-400 hover:text-neutral-600"
            )}
            key={item.id}
            onClick={() => setTab(item.id)}
            role="tab"
            type="button"
          >
            {item.label}
            <span className="font-mono text-[11px] tracking-normal tabular-nums">
              {formatNumber(counts[item.id])}
            </span>
          </button>
        ))}
      </div>

      {tab === "people" ? (
        <PeopleRegister onChanged={onChanged} people={people} />
      ) : null}
      {tab === "cells" ? <CellsRegister cells={cells} /> : null}
      {tab === "keys" ? <KeysRegister keys={keys} /> : null}
    </section>
  );
}
