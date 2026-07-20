import { and, eq, ne } from "drizzle-orm";
import { z } from "zod";
import { auth } from "@/app/(auth)/auth";
import { db } from "@/lib/db";
import { user } from "@/lib/db/schema";

// Public, editable profile fields. Mirrors the varchar/text lengths in schema.
const profileSchema = z.object({
	name: z.string().trim().max(255).nullish(),
	displayName: z
		.string()
		.trim()
		.max(100)
		.regex(/^@?[a-z0-9_.-]+$/i, "Только латиница, цифры, _ . -")
		.nullish(),
	avatarUrl: z.string().trim().url().max(2048).or(z.literal("")).nullish(),
	bio: z.string().trim().max(2000).nullish(),
});

// Normalize "" → null so empty fields clear rather than store blanks.
function orNull(value: string | null | undefined): string | null {
	if (value === undefined || value === null) return null;
	const trimmed = value.trim();
	return trimmed.length > 0 ? trimmed : null;
}

// PATCH /api/user/profile — update the current user's public profile.
export async function PATCH(request: Request) {
	const session = await auth();

	if (!session?.user?.id) {
		return Response.json({ error: "Unauthorized" }, { status: 401 });
	}

	let body: unknown;
	try {
		body = await request.json();
	} catch {
		return Response.json({ error: "Invalid JSON" }, { status: 400 });
	}

	const parsed = profileSchema.safeParse(body);
	if (!parsed.success) {
		return Response.json(
			{ error: parsed.error.issues[0]?.message ?? "Invalid input" },
			{ status: 400 },
		);
	}

	const { name, displayName, avatarUrl, bio } = parsed.data;

	// Store the handle with a single leading @ for consistency with lookups.
	const normalizedHandle = (() => {
		const clean = orNull(displayName);
		if (!clean) return null;
		return clean.startsWith("@") ? clean : `@${clean}`;
	})();

	try {
		// Handles resolve profiles, so they must stay unique. Reject if taken.
		if (normalizedHandle) {
			const [taken] = await db
				.select({ id: user.id })
				.from(user)
				.where(
					and(
						eq(user.displayName, normalizedHandle),
						ne(user.id, session.user.id),
					),
				)
				.limit(1);

			if (taken) {
				return Response.json(
					{ error: "Этот адрес уже занят" },
					{ status: 409 },
				);
			}
		}

		const [updated] = await db
			.update(user)
			.set({
				name: orNull(name),
				displayName: normalizedHandle,
				avatarUrl: orNull(avatarUrl),
				bio: orNull(bio),
				updatedAt: new Date(),
			})
			.where(eq(user.id, session.user.id))
			.returning({
				id: user.id,
				name: user.name,
				displayName: user.displayName,
				avatarUrl: user.avatarUrl,
				bio: user.bio,
			});

		return Response.json({ user: updated });
	} catch (error) {
		console.error("Failed to update profile:", error);
		return Response.json(
			{ error: "Failed to update profile" },
			{ status: 500 },
		);
	}
}
