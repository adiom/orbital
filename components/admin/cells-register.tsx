import { formatNumber, formatRelative } from "./format";
import { LifeDot, LifeLabel, lifeState } from "./life-dot";
import type { AdminOverview } from "./types";

const VISIBILITY_LABEL: Record<string, string> = {
  public: "открыта",
  private: "закрыта",
  dao: "dao",
};

export function CellsRegister({ cells }: { cells: AdminOverview["cells"] }) {
  if (cells.length === 0) {
    return (
      <p className="py-10 text-center text-[13px] text-neutral-400">
        Ячеек пока нет
      </p>
    );
  }

  return (
    <ul>
      {cells.map((cell) => {
        const state = lifeState(cell.updatedAt, cell.createdAt);
        return (
          <li
            className="flex items-center gap-4 border-neutral-100 border-b py-3 last:border-b-0"
            key={cell.id}
          >
            <LifeDot state={state} />

            <div className="min-w-0 flex-1">
              <div className="truncate text-[13.5px] text-neutral-900">
                {cell.title || "Без названия"}
              </div>
              <div className="truncate font-mono text-[11px] text-neutral-400">
                {cell.ownerName || cell.ownerEmail}
              </div>
            </div>

            <span className="hidden shrink-0 rounded-full bg-neutral-50 px-2 py-1 text-[10px] text-neutral-400 sm:block">
              {VISIBILITY_LABEL[cell.visibility] ?? cell.visibility}
            </span>

            <div className="w-[128px] shrink-0 text-right font-mono text-[11px] text-neutral-500 tabular-nums">
              {formatNumber(cell.memberCount)} уч ·{" "}
              {formatNumber(cell.messageCount)} сооб
            </div>

            <div className="hidden w-[120px] shrink-0 text-right md:block">
              <LifeLabel state={state} />
              <div className="mt-0.5 text-[10.5px] leading-none text-neutral-400">
                {formatRelative(cell.updatedAt)}
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
