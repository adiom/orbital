import { cn } from "@/lib/utils";
import { LIFE_STROKE, type LifeState } from "./life-dot";

type PulseLineProps = {
  values: number[];
  state?: LifeState;
  width?: number;
  height?: number;
  className?: string;
};

/**
 * The station's signature: a bare activity trace, no axes, no labels.
 * Small enough to sit inside a table row, so a register of a hundred people
 * can be scanned as a rack of monitors rather than read as numbers.
 */
export function PulseLine({
  values,
  state = "alive",
  width = 56,
  height = 16,
  className,
}: PulseLineProps) {
  if (values.length === 0) {
    return <span className={cn("inline-block", className)} style={{ width, height }} />;
  }

  const stroke = LIFE_STROKE[state];
  const peak = Math.max(...values);
  const padding = 1.5;
  const usable = height - padding * 2;
  const step = values.length > 1 ? width / (values.length - 1) : 0;

  const points = values
    .map((value, index) => {
      const x = index * step;
      const y = peak === 0 ? height - padding : height - padding - (value / peak) * usable;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  const lastValue = values.at(-1) ?? 0;
  const lastY =
    peak === 0 ? height - padding : height - padding - (lastValue / peak) * usable;

  return (
    <svg
      aria-hidden="true"
      className={cn("shrink-0 overflow-visible", className)}
      fill="none"
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      width={width}
    >
      <polyline
        points={points}
        stroke={stroke}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.25}
      />
      {peak > 0 && lastValue > 0 ? (
        <circle cx={width} cy={lastY} fill={stroke} r={1.4} />
      ) : null}
    </svg>
  );
}
