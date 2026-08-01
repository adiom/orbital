import { formatNumber, formatRelative } from "./format";
import { LifeDot, lifeState } from "./life-dot";
import type { AdminOverview } from "./types";

export function KeysRegister({ keys }: { keys: AdminOverview["keys"] }) {
  if (keys.length === 0) {
    return (
      <p className="py-10 text-center text-[13px] text-neutral-400">
        Ключей пока нет
      </p>
    );
  }

  return (
    <ul>
      {keys.map((key) => {
        const revoked = Boolean(key.revokedAt);
        const state = revoked ? "quiet" : lifeState(key.lastUsedAt, key.createdAt);

        return (
          <li
            className="flex items-center gap-4 border-neutral-100 border-b py-3 last:border-b-0"
            key={key.id}
          >
            <LifeDot state={state} />

            <div className="min-w-0 flex-1">
              <div className="truncate text-[13.5px] text-neutral-900">
                {key.name}
                {revoked ? (
                  <span className="ml-2 text-[10px] uppercase tracking-[0.2em] text-neutral-300">
                    отозван
                  </span>
                ) : null}
              </div>
              <div className="truncate font-mono text-[11px] text-neutral-400">
                {key.prefix}··· · {key.ownerEmail}
              </div>
            </div>

            <div className="w-[96px] shrink-0 text-right font-mono text-[11px] text-neutral-500 tabular-nums">
              {formatNumber(key.usageCount)} вызовов
            </div>

            <div className="hidden w-[120px] shrink-0 text-right text-[10.5px] text-neutral-400 md:block">
              {key.lastUsedAt ? formatRelative(key.lastUsedAt) : "не использован"}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
