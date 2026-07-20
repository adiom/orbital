import { GitBranch } from "lucide-react";
import Link from "next/link";
import type { CellLifeState, ProfileCell } from "@/lib/db/profile";

const STATE_META: Record<CellLifeState, { label: string; rgb: string }> = {
	alive: { label: "живёт", rgb: "16,185,129" },
	settled: { label: "созревает", rgb: "168,85,247" },
	born: { label: "родилось", rgb: "96,165,250" },
	quiet: { label: "тихо", rgb: "148,163,184" },
};

function timeAgo(date: Date | string | null): string {
	if (!date) return "ждёт продолжения";
	const time = date instanceof Date ? date.getTime() : new Date(date).getTime();
	if (Number.isNaN(time)) return "ждёт продолжения";
	const minutes = Math.max(1, Math.floor((Date.now() - time) / 60_000));
	if (minutes < 60) return "ожило недавно";
	if (minutes < 60 * 24) return "сегодня";
	const days = Math.floor(minutes / (60 * 24));
	if (days < 7) return `${days} д назад`;
	if (days < 30) return `${Math.floor(days / 7)} нед назад`;
	return `${Math.floor(days / 30)} мес назад`;
}

function getDisplayDescription(description: string | null): string {
	if (!description) return "Смысл ещё формируется";
	return description
		.replace(/^Forked from:\s*/i, "Продолжение: ")
		.replace(/^Forked from Sfera\s*/i, "Продолжение: ");
}

/**
 * A knowledge cell as a lightweight floating card — same glass/soft-depth
 * language as the living map's OrbitNode, tuned for a static grid.
 */
export function ProfileCellCard({ cell }: { cell: ProfileCell }) {
	const meta = STATE_META[cell.lifeState];

	return (
		<Link
			className="group relative block rounded-[24px] bg-white/70 px-5 py-4 ring-1 ring-white/70 backdrop-blur-2xl transition-all duration-500 hover:-translate-y-1 hover:bg-white/85 hover:ring-neutral-200/80"
			href={`/${cell.id}`}
			style={{
				boxShadow: `0 20px 60px rgba(15,23,42,0.08), 0 0 34px rgba(${meta.rgb},0.10)`,
			}}
		>
			<div
				aria-hidden="true"
				className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-white to-transparent"
			/>

			<div className="flex items-center gap-2">
				<span
					className="h-2 w-2 shrink-0 rounded-full"
					style={{
						background: `rgb(${meta.rgb})`,
						boxShadow: `0 0 10px rgba(${meta.rgb},0.6)`,
					}}
				/>
				<span className="font-medium text-[10px] uppercase tracking-[0.2em] text-neutral-400">
					{meta.label}
				</span>
			</div>

			<h3 className="mt-3 truncate font-medium text-[15px] text-neutral-900 leading-snug">
				{cell.title}
			</h3>
			<p className="mt-1 line-clamp-2 text-[13px] text-neutral-500 leading-relaxed">
				{getDisplayDescription(cell.description)}
			</p>

			<div className="mt-4 flex items-center gap-3 text-[11px] text-neutral-400">
				<span>{timeAgo(cell.lastMessageAt)}</span>
				{cell.childCount > 0 ? (
					<span className="flex items-center gap-1">
						<GitBranch className="h-3 w-3" />
						{cell.childCount}
					</span>
				) : null}
				{cell.isOwner ? (
					<span className="ml-auto font-mono text-[10px] text-neutral-300">
						хранитель
					</span>
				) : null}
			</div>
		</Link>
	);
}

/**
 * The state vocabulary strip — knowledge health, not vanity metrics. Only
 * shows states that actually exist in this person's field.
 */
export function StateVocabulary({
	stateCounts,
}: {
	stateCounts: Record<CellLifeState, number>;
}) {
	const order: CellLifeState[] = ["alive", "settled", "born", "quiet"];
	const present = order.filter((s) => stateCounts[s] > 0);

	if (present.length === 0) return null;

	return (
		<div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-3">
			{present.map((state) => {
				const meta = STATE_META[state];
				return (
					<div className="flex items-baseline gap-2" key={state}>
						<span
							className="h-2 w-2 translate-y-[-1px] rounded-full"
							style={{
								background: `rgb(${meta.rgb})`,
								boxShadow: `0 0 10px rgba(${meta.rgb},0.6)`,
							}}
						/>
						<span className="font-light text-[22px] text-neutral-900 tabular-nums">
							{stateCounts[state]}
						</span>
						<span className="text-[12px] text-neutral-400">{meta.label}</span>
					</div>
				);
			})}
		</div>
	);
}
