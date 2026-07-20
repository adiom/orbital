import "server-only";

import { and, count, desc, eq, inArray, or, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
	sfera,
	sferaForkedSfera,
	sferaMember,
	sferaMessage,
	user,
} from "@/lib/db/schema";

/**
 * Life state of a single knowledge cell, mirroring the living map logic in
 * components/orbit/new-home/orbit-network-timeline.tsx so a profile and the
 * map always agree on what is alive.
 */
export type CellLifeState = "born" | "alive" | "settled" | "quiet";

export type ProfileCell = {
	id: string;
	title: string;
	description: string | null;
	role: string;
	isOwner: boolean;
	messageCount: number;
	memberCount: number;
	childCount: number;
	lastMessageAt: Date | null;
	updatedAt: Date;
	lifeState: CellLifeState;
};

export type ProfileData = {
	user: {
		id: string;
		name: string | null;
		displayName: string | null;
		avatarUrl: string | null;
		bio: string | null;
		createdAt: Date;
	};
	isSelf: boolean;
	cells: ProfileCell[];
	stateCounts: Record<CellLifeState, number>;
	totals: {
		cells: number;
		owned: number;
		authored: number; // messages written by this user across all cells
		forks: number; // continuations this user created
	};
};

// Same thresholds as the living map (orbit-network-timeline.tsx getLifeState).
function getLifeState(updatedAt: Date, childCount: number): CellLifeState {
	const ageInHours = (Date.now() - updatedAt.getTime()) / (1000 * 60 * 60);

	if (ageInHours < 12) return "alive";
	if (ageInHours < 72 || childCount > 0) return "settled";
	if (ageInHours < 168) return "born";
	return "quiet";
}

const EMPTY_STATE_COUNTS: Record<CellLifeState, number> = {
	born: 0,
	alive: 0,
	settled: 0,
	quiet: 0,
};

/**
 * Resolve a profile by handle. `handle` may be a displayName (with or without
 * a leading @) or a raw user id. Returns null when no user matches.
 */
export async function getProfileByHandle(
	handle: string,
	viewerId?: string,
): Promise<ProfileData | null> {
	const raw = decodeURIComponent(handle).trim();
	const withAt = raw.startsWith("@") ? raw : `@${raw}`;
	const withoutAt = raw.startsWith("@") ? raw.slice(1) : raw;
	// Only match by id when the handle actually looks like a uuid — otherwise
	// Postgres rejects the string cast before the OR is evaluated.
	const isUuid =
		/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(raw);

	const matchers = [
		eq(user.displayName, withAt),
		eq(user.displayName, withoutAt),
	];
	if (isUuid) {
		matchers.push(eq(user.id, raw));
	}

	const [profileUser] = await db
		.select({
			id: user.id,
			name: user.name,
			displayName: user.displayName,
			avatarUrl: user.avatarUrl,
			bio: user.bio,
			createdAt: user.createdAt,
		})
		.from(user)
		.where(or(...matchers))
		.limit(1);

	if (!profileUser) return null;

	const userId = profileUser.id;

	// Cells this user belongs to (membership drives what they've grown).
	const memberships = await db
		.select({
			id: sfera.id,
			title: sfera.title,
			description: sfera.description,
			ownerId: sfera.ownerId,
			updatedAt: sfera.updatedAt,
			role: sferaMember.role,
		})
		.from(sfera)
		.innerJoin(sferaMember, eq(sfera.id, sferaMember.sferaId))
		.where(eq(sferaMember.userId, userId))
		.orderBy(desc(sfera.updatedAt));

	const cellIds = memberships.map((m) => m.id);

	const messageCounts = new Map<string, number>();
	const lastMessageAt = new Map<string, Date | null>();
	const memberCounts = new Map<string, number>();
	const childCounts = new Map<string, number>();

	if (cellIds.length > 0) {
		const messageStats = await db
			.select({
				sferaId: sferaMessage.sferaId,
				messageCount: count(),
				lastMessageAt: sql<Date>`max(${sferaMessage.createdAt})`,
			})
			.from(sferaMessage)
			.where(inArray(sferaMessage.sferaId, cellIds))
			.groupBy(sferaMessage.sferaId);

		for (const row of messageStats) {
			messageCounts.set(row.sferaId, row.messageCount);
			// max() comes back as a string from the driver — normalize to Date.
			lastMessageAt.set(
				row.sferaId,
				row.lastMessageAt ? new Date(row.lastMessageAt) : null,
			);
		}

		const memberStats = await db
			.select({
				sferaId: sferaMember.sferaId,
				memberCount: count(),
			})
			.from(sferaMember)
			.where(inArray(sferaMember.sferaId, cellIds))
			.groupBy(sferaMember.sferaId);

		for (const row of memberStats) {
			memberCounts.set(row.sferaId, row.memberCount);
		}

		const forkStats = await db
			.select({
				parentSferaId: sferaForkedSfera.parentSferaId,
				forkCount: count(),
			})
			.from(sferaForkedSfera)
			.where(inArray(sferaForkedSfera.parentSferaId, cellIds))
			.groupBy(sferaForkedSfera.parentSferaId);

		for (const row of forkStats) {
			childCounts.set(row.parentSferaId, row.forkCount);
		}
	}

	const stateCounts: Record<CellLifeState, number> = { ...EMPTY_STATE_COUNTS };
	let owned = 0;

	const cells: ProfileCell[] = memberships.map((m) => {
		const childCount = childCounts.get(m.id) || 0;
		const lifeState = getLifeState(m.updatedAt, childCount);
		const isOwner = m.ownerId === userId;
		if (isOwner) owned += 1;
		stateCounts[lifeState] += 1;

		return {
			id: m.id,
			title: m.title,
			description: m.description,
			role: m.role,
			isOwner,
			messageCount: messageCounts.get(m.id) || 0,
			memberCount: memberCounts.get(m.id) || 0,
			childCount,
			lastMessageAt: lastMessageAt.get(m.id) || null,
			updatedAt: m.updatedAt,
			lifeState,
		};
	});

	// Messages authored by this user, across every cell (not just membership).
	const [authoredRow] = await db
		.select({ value: count() })
		.from(sferaMessage)
		.where(
			and(
				eq(sferaMessage.userId, userId),
				eq(sferaMessage.messageType, "user"),
			),
		);

	const [forkRow] = await db
		.select({ value: count() })
		.from(sferaForkedSfera)
		.where(eq(sferaForkedSfera.createdById, userId));

	return {
		user: profileUser,
		isSelf: viewerId === userId,
		cells,
		stateCounts,
		totals: {
			cells: cells.length,
			owned,
			authored: authoredRow?.value ?? 0,
			forks: forkRow?.value ?? 0,
		},
	};
}
