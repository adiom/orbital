"use client";

import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { formatNumber } from "./format";
import type { DeleteImpact, DeletePreview } from "./types";

/** Only the lines that carry a number, in reading order. */
const LINES: Array<{ key: keyof DeleteImpact; label: string }> = [
  { key: "people", label: "человек" },
  { key: "cells", label: "ячеек" },
  { key: "messages", label: "сообщений" },
  { key: "chats", label: "чатов" },
  { key: "documents", label: "документов" },
  { key: "aiLogs", label: "записей об AI" },
  { key: "keys", label: "ключей" },
  { key: "agents", label: "агентов" },
];

export function DeletePeopleDialog({
  names,
  preview,
  isLoading,
  isDeleting,
  onCancel,
  onConfirm,
}: {
  names: string[];
  preview: DeletePreview | null;
  isLoading: boolean;
  isDeleting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const [typed, setTyped] = useState("");
  const many = names.length > 1;
  const confirmed = typed.trim().toLowerCase() === "удалить";
  const impact = preview?.impact;

  return (
    <AlertDialog onOpenChange={(open) => !open && onCancel()} open={true}>
      <AlertDialogContent className="border-neutral-200 bg-white sm:max-w-[460px]">
        <AlertDialogHeader>
          <AlertDialogTitle className="font-normal text-[17px] text-neutral-900">
            {many ? `Удалить ${formatNumber(names.length)} человек?` : "Удалить человека?"}
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="text-[13px] text-neutral-500">
              {many ? (
                <span className="font-mono text-[11px] text-neutral-400">
                  {names.slice(0, 3).join(", ")}
                  {names.length > 3 ? ` и ещё ${names.length - 3}` : ""}
                </span>
              ) : (
                <span className="font-mono text-[11px] text-neutral-400">
                  {names[0]}
                </span>
              )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="border-neutral-100 border-y py-4">
          {isLoading || !impact ? (
            <p className="text-[13px] text-neutral-400">Считаю последствия…</p>
          ) : (
            <>
              <p className="mb-3 text-[10px] uppercase tracking-[0.2em] text-neutral-400">
                Исчезнет навсегда
              </p>
              <ul className="space-y-1">
                {LINES.filter((line) => impact[line.key] > 0).map((line) => (
                  <li
                    className="flex items-baseline justify-between text-[13px]"
                    key={line.key}
                  >
                    <span className="text-neutral-500">{line.label}</span>
                    <span className="font-mono text-neutral-900 tabular-nums">
                      {formatNumber(impact[line.key])}
                    </span>
                  </li>
                ))}
              </ul>

              {impact.foreignMessages > 0 ? (
                <p className="mt-4 text-[12px] text-red-500 leading-relaxed">
                  Из них {formatNumber(impact.foreignMessages)} написали другие
                  люди — эти сообщения лежат внутри удаляемых ячеек и уйдут
                  вместе с ними.
                </p>
              ) : null}

              {preview?.skipped.length ? (
                <p className="mt-4 text-[12px] text-neutral-400">
                  Пропущу {formatNumber(preview.skipped.length)}:{" "}
                  {[...new Set(preview.skipped.map((s) => s.reason))].join(", ")}
                </p>
              ) : null}
            </>
          )}
        </div>

        <div>
          <label
            className="text-[12px] text-neutral-500"
            htmlFor="delete-confirm"
          >
            Наберите <span className="font-mono text-neutral-900">удалить</span>,
            чтобы подтвердить
          </label>
          <input
            autoComplete="off"
            className="mt-2 h-9 w-full rounded-lg border border-neutral-200 bg-white px-3 font-mono text-[13px] outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
            id="delete-confirm"
            onChange={(event) => setTyped(event.target.value)}
            value={typed}
          />
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel
            className="rounded-full border-neutral-200 text-[13px]"
            disabled={isDeleting}
          >
            Оставить
          </AlertDialogCancel>
          <AlertDialogAction
            className="rounded-full bg-red-500 text-[13px] text-white hover:bg-red-600 disabled:opacity-40"
            disabled={!confirmed || isDeleting || isLoading}
            onClick={(event) => {
              event.preventDefault();
              onConfirm();
            }}
          >
            {isDeleting ? "Удаляю…" : "Удалить навсегда"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
