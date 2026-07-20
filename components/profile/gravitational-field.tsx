"use client";

import { useMemo } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { CellLifeState } from "@/lib/db/profile";
import { cn } from "@/lib/utils";

// Life-state colors mirror the living map (orbit-network-timeline LIFE_STATE_COLORS).
const LIFE_RGB: Record<CellLifeState, string> = {
	born: "96,165,250", // sky — родилось
	alive: "16,185,129", // emerald — живёт
	settled: "168,85,247", // violet — созревает
	quiet: "148,163,184", // stone — тихо
};

export type FieldCell = {
	id: string;
	lifeState: CellLifeState;
	weight: number; // 0..1, drives dot size (density/activity)
};

type GravitationalFieldProps = {
	name: string;
	avatarUrl: string | null;
	cells: FieldCell[];
};

// Ring radii in % of half-size; also the source for the faint orbit circles.
const RING_RADII = [30, 43, 56];
const RING_COUNT = RING_RADII.length;
// Golden-angle spread keeps dots from clumping without needing randomness.
const GOLDEN_ANGLE = 2.399_963_23;

function getInitials(name: string) {
	return name
		.split(" ")
		.filter(Boolean)
		.slice(0, 2)
		.map((part) => part[0]?.toUpperCase())
		.join("");
}

/**
 * Signature element: a person rendered as the gravitational center of their
 * own constellation. The avatar is a quietly glowing star; each knowledge cell
 * drifts on an orbit around it, colored by life-state. Not an interactive graph
 * — a living portrait of a mind. Positions are deterministic (golden-angle) so
 * the field is stable across renders and SSR-safe.
 */
export function GravitationalField({
	name,
	avatarUrl,
	cells,
}: GravitationalFieldProps) {
	const dots = useMemo(() => {
		return cells.map((cell, i) => {
			// Distribute across rings, denser cells pulled inward.
			const ring = i % RING_COUNT;
			const radius = RING_RADII[ring] + (1 - cell.weight) * 6; // % of half-size
			const angle = i * GOLDEN_ANGLE;
			const x = 50 + Math.cos(angle) * radius;
			const y = 50 + Math.sin(angle) * radius;
			const size = 5 + cell.weight * 9;
			// Stagger the drift so the field breathes rather than pulses in unison.
			const duration = 14 + (i % 5) * 3;
			const delay = -(i % 7) * 1.6;

			return {
				id: cell.id,
				rgb: LIFE_RGB[cell.lifeState],
				left: `${x}%`,
				top: `${y}%`,
				size,
				duration: `${duration}s`,
				delay: `${delay}s`,
			};
		});
	}, [cells]);

	return (
		<div className="relative mx-auto flex aspect-square w-full max-w-[440px] items-center justify-center">
			{/* Orbital rings — faint, hand-drawn feel, not diagram grid */}
			<svg
				aria-hidden="true"
				className="pointer-events-none absolute inset-0 h-full w-full"
				viewBox="0 0 100 100"
				preserveAspectRatio="xMidYMid meet"
			>
				<title>Орбитальное поле</title>
				{RING_RADII.map((r) => (
					<circle
						key={r}
						cx="50"
						cy="50"
						r={r}
						fill="none"
						stroke="rgba(120,120,130,0.10)"
						strokeWidth="0.15"
					/>
				))}
			</svg>

			{/* Drifting cells */}
			{dots.map((dot) => (
				<span
					className="profile-orbit-dot absolute rounded-full"
					key={dot.id}
					style={{
						left: dot.left,
						top: dot.top,
						width: dot.size,
						height: dot.size,
						marginLeft: -dot.size / 2,
						marginTop: -dot.size / 2,
						background: `rgb(${dot.rgb})`,
						boxShadow: `0 0 ${dot.size * 1.6}px rgba(${dot.rgb},0.55)`,
						animationDuration: dot.duration,
						animationDelay: dot.delay,
					}}
				/>
			))}

			{/* Central star — the person */}
			<div className="profile-star relative z-10 flex items-center justify-center">
				<div
					aria-hidden="true"
					className="absolute inset-0 rounded-full blur-2xl"
					style={{
						background:
							"radial-gradient(circle, rgba(255,255,255,0.9) 0%, rgba(196,181,253,0.35) 55%, transparent 72%)",
						transform: "scale(2.1)",
					}}
				/>
				<Avatar className="h-[104px] w-[104px] shadow-[0_18px_60px_rgba(15,23,42,0.18)] ring-1 ring-white/80">
					{avatarUrl ? <AvatarImage alt={name} src={avatarUrl} /> : null}
					<AvatarFallback
						className={cn(
							"bg-gradient-to-br from-white to-neutral-100 font-light text-2xl text-neutral-700",
						)}
					>
						{getInitials(name) || "·"}
					</AvatarFallback>
				</Avatar>
			</div>
		</div>
	);
}
