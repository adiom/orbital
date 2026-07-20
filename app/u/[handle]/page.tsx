import { Settings } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/app/(auth)/auth";
import {
	type FieldCell,
	GravitationalField,
} from "@/components/profile/gravitational-field";
import {
	ProfileCellCard,
	StateVocabulary,
} from "@/components/profile/profile-cells";
import { ProfileEditor } from "@/components/profile/profile-editor";
import { getProfileByHandle, type ProfileCell } from "@/lib/db/profile";

export const dynamic = "force-dynamic";

// Density signal for a dot's size in the field — cheap, derived from real data.
function cellWeight(messageCount: number, childCount: number): number {
	const score = messageCount + childCount * 8;
	return Math.min(1, 0.15 + score / 60);
}

function joinedLabel(date: Date): string {
	const months = [
		"января",
		"февраля",
		"марта",
		"апреля",
		"мая",
		"июня",
		"июля",
		"августа",
		"сентября",
		"октября",
		"ноября",
		"декабря",
	];
	return `в орбите с ${months[date.getMonth()]} ${date.getFullYear()}`;
}

export default async function ProfilePage({
	params,
}: {
	params: Promise<{ handle: string }>;
}) {
	const { handle } = await params;
	const session = await auth();
	const profile = await getProfileByHandle(handle, session?.user?.id);

	if (!profile) {
		notFound();
	}

	const { user, cells, stateCounts, totals, isSelf } = profile;
	const displayName = user.name || user.displayName || "Безымянный";
	const handleText = user.displayName
		? user.displayName.startsWith("@")
			? user.displayName
			: `@${user.displayName}`
		: null;

	const fieldCells: FieldCell[] = cells.map((c) => ({
		id: c.id,
		lifeState: c.lifeState,
		weight: cellWeight(c.messageCount, c.childCount),
	}));

	const alive = cells.filter((c) => c.lifeState === "alive");
	const maturing = cells.filter((c) => c.lifeState === "settled");
	const rest = cells.filter(
		(c) => c.lifeState === "born" || c.lifeState === "quiet",
	);

	return (
		<main className="relative min-h-screen overflow-hidden bg-[#fbfaf8] text-neutral-950">
			{/* Ambient color wash — same palette as the living map */}
			<div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_18%_12%,rgba(168,85,247,0.10),transparent_28%),radial-gradient(circle_at_80%_8%,rgba(59,130,246,0.09),transparent_30%),radial-gradient(circle_at_54%_72%,rgba(16,185,129,0.07),transparent_34%)]" />

			<Link
				className="fixed left-6 top-6 z-20 text-[11px] uppercase tracking-[0.34em] text-neutral-400 transition-colors hover:text-neutral-600"
				href="/"
			>
				Orbital
			</Link>

			{isSelf ? (
				<div className="fixed right-5 top-5 z-30 flex items-center gap-2">
					<Link
						aria-label="Настройки"
						className="flex h-[38px] w-[38px] items-center justify-center rounded-full border border-white/70 bg-white/75 text-neutral-500 shadow-[0_18px_50px_rgba(15,23,42,0.10)] backdrop-blur-2xl transition-all hover:bg-white hover:text-neutral-800"
						href="/settings/api-keys"
					>
						<Settings className="h-4 w-4" />
					</Link>
					<ProfileEditor
						profile={{
							name: user.name,
							displayName: user.displayName,
							avatarUrl: user.avatarUrl,
							bio: user.bio,
						}}
					/>
				</div>
			) : null}

			<div className="relative mx-auto w-full max-w-3xl px-6 pb-32">
				{/* Hero — the gravitational field */}
				<section className="profile-enter flex flex-col items-center pt-24 md:pt-28">
					<GravitationalField
						avatarUrl={user.avatarUrl}
						cells={fieldCells}
						name={displayName}
					/>

					<h1 className="mt-6 text-center font-light text-[34px] text-neutral-900 leading-tight tracking-tight md:text-[40px]">
						{displayName}
					</h1>

					<div className="mt-2 flex items-center gap-3 text-[13px]">
						{handleText ? (
							<span className="font-mono text-neutral-500">{handleText}</span>
						) : null}
						<span className="text-neutral-300">·</span>
						<span className="text-neutral-400">
							{joinedLabel(user.createdAt)}
						</span>
					</div>

					{user.bio ? (
						<p className="mt-4 max-w-md text-center text-[15px] text-neutral-500 leading-relaxed">
							{user.bio}
						</p>
					) : null}

					<div className="mt-8">
						<StateVocabulary stateCounts={stateCounts} />
					</div>
				</section>

				{/* Cells grouped by life state — no numbering, order is by liveliness */}
				{cells.length === 0 ? (
					<section className="profile-enter-late mt-24 text-center">
						<p className="text-[15px] text-neutral-400">
							{isSelf
								? "Здесь пока тихо. Создайте первое — оно начнёт жить."
								: "Пока ничего не выросло."}
						</p>
					</section>
				) : (
					<div className="profile-enter-late mt-20 space-y-16">
						{alive.length > 0 ? (
							<CellSection cells={alive} title="Что живёт сейчас" />
						) : null}
						{maturing.length > 0 ? (
							<CellSection cells={maturing} title="Тихо созревает" />
						) : null}
						{rest.length > 0 ? (
							<CellSection cells={rest} title="Остальное поле" />
						) : null}
					</div>
				)}

				{totals.authored > 0 ? (
					<p className="mt-20 text-center font-mono text-[11px] text-neutral-300">
						{totals.authored} реплик · {totals.forks} продолжений ·{" "}
						{totals.owned} под опекой
					</p>
				) : null}
			</div>
		</main>
	);
}

function CellSection({
	title,
	cells,
}: {
	title: string;
	cells: ProfileCell[];
}) {
	return (
		<section>
			<h2 className="mb-5 text-[12px] uppercase tracking-[0.28em] text-neutral-400">
				{title}
			</h2>
			<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
				{cells.map((cell) => (
					<ProfileCellCard cell={cell} key={cell.id} />
				))}
			</div>
		</section>
	);
}
