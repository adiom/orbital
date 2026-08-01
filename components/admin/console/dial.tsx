"use client";

import { useId } from "react";
import { cn } from "@/lib/utils";

/**
 * A control with its consequence written next to it.
 *
 * The console's rule: no value floats in an empty form. Every dial says what
 * moving it does, in the operator's language, right where the hand is.
 */
export function Dial({
  label,
  consequence,
  value,
  fallback,
  min,
  max,
  step,
  format,
  disabled,
  onChange,
}: {
  label: string;
  /** What changes when this moves. Reads left-to-right: low ↔ high. */
  consequence: string;
  /** Null means "not overridden" — the code's value is used. */
  value: number | null;
  /** The code's value, shown when nothing overrides it. */
  fallback: number | null;
  min: number;
  max: number;
  step: number;
  format?: (value: number) => string;
  disabled?: boolean;
  onChange: (value: number) => void;
}) {
  const id = useId();
  const current = value ?? fallback ?? min;
  const overridden = value !== null;
  const show = format ? format(current) : String(current);

  return (
    <div className="flex items-center gap-4">
      <label
        className="w-[70px] shrink-0 text-[11px] text-neutral-500"
        htmlFor={id}
      >
        {label}
      </label>

      <input
        className={cn(
          "h-1 w-[132px] shrink-0 cursor-pointer appearance-none rounded-full bg-neutral-200 accent-neutral-900",
          "focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
          disabled && "cursor-not-allowed opacity-40"
        )}
        disabled={disabled}
        id={id}
        max={max}
        min={min}
        onChange={(event) => onChange(Number(event.target.value))}
        step={step}
        type="range"
        value={current}
      />

      <span
        className={cn(
          "w-9 shrink-0 font-mono text-[12px] tabular-nums",
          overridden ? "text-neutral-900" : "text-neutral-400"
        )}
      >
        {show}
      </span>

      <span className="min-w-0 truncate text-[11px] text-neutral-400">
        {consequence}
      </span>
    </div>
  );
}
