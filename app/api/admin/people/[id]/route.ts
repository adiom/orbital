import { desc, eq, gte, sql } from "drizzle-orm";
import { requireAdmin } from "@/lib/admin/access";
import { createProbe, errorMessage } from "@/lib/admin/probe";
import { db } from "@/lib/db";
import {
  aiUsageLog,
  apiKey,
  sfera,
  sferaMember,
  sferaMessage,
  toolExecution,
  user,
} from "@/lib/db/schema";

export const dynamic = "force-dynamic";

/** Longer than the register's 14 days: a card is for reading a history. */
const PULSE_DAYS = 90;
const CELLS_LIMIT = 40;
const EVENTS_LIMIT = 20;

type RouteContext = {
  params: Promise<{ id: string }>;
};

function daysAgo(days: number): Date {
  const date = new Date();
  date.setUTCHours(0, 0, 0, 0);
  date.setUTCDate(date.getUTCDate() - days + 1);
  return date;
}

function toSeries(rows: Array<{ day: string; value: number }>): number[] {
  const byDay = new Map(
    rows.map((row) => [new Date(row.day).toISOString().slice(0, 10), row.value])
  );

  const start = daysAgo(PULSE_DAYS);

  return Array.from({ length: PULSE_DAYS }, (_, index) => {
    const date = new Date(start);
    date.setUTCDate(date.getUTCDate() + index);
    return byDay.get(date.toISOString().slice(0, 10)) ?? 0;
  });
}

/** GET /api/admin/people/[id] — everything the station knows about one person. */
export async function GET(_request: Request, context: RouteContext) {
  const admin = await requireAdmin();

  if (!admin) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  const { id } = await context.params;
  const { probe, failures } = createProbe("admin/people");
  const pulseSince = daysAgo(PULSE_DAYS);

  try {
    const [person] = await db
      .select({
        id: user.id,
        name: user.name,
        displayName: user.displayName,
        email: user.email,
        bio: user.bio,
        createdAt: user.createdAt,
        settings: user.settings,
        mcpEnabled: user.mcpEnabled,
      })
      .from(user)
      .where(eq(user.id, id))
      .limit(1);

    if (!person) {
      return Response.json({ error: "Такого человека нет" }, { status: 404 });
    }

    const [cells, pulse, spend, keys, events, counts] = await Promise.all([
      probe(
        "cells",
        () =>
          db
            .select({
              id: sfera.id,
              title: sfera.title,
              visibility: sfera.visibility,
              updatedAt: sfera.updatedAt,
              role: sferaMember.role,
              messageCount: sql<number>`(select count(*)::int from ${sferaMessage} where ${sferaMessage.sferaId} = ${sfera.id})`,
            })
            .from(sferaMember)
            .innerJoin(sfera, eq(sferaMember.sferaId, sfera.id))
            .where(eq(sferaMember.userId, id))
            .orderBy(desc(sfera.updatedAt))
            .limit(CELLS_LIMIT),
        []
      ),

      probe(
        "pulse",
        () =>
          db
            .select({
              day: sql<string>`date_trunc('day', ${sferaMessage.createdAt})::date::text`,
              value: sql<number>`count(*)::int`,
            })
            .from(sferaMessage)
            .where(
              sql`${sferaMessage.userId} = ${id} and ${sferaMessage.createdAt} >= ${pulseSince}`
            )
            .groupBy(sql`1`),
        []
      ),

      probe(
        "spend",
        () =>
          db
            .select({
              provider: aiUsageLog.provider,
              requests: sql<number>`count(*)::int`,
              tokens: sql<number>`coalesce(sum(${aiUsageLog.totalTokens}), 0)::int`,
              cents: sql<number>`coalesce(sum(${aiUsageLog.estimatedCost}), 0)::int`,
            })
            .from(aiUsageLog)
            .where(eq(aiUsageLog.userId, id))
            .groupBy(aiUsageLog.provider)
            .orderBy(sql`4 desc`),
        []
      ),

      // Prefix only — the hash never leaves the database.
      probe(
        "keys",
        () =>
          db
            .select({
              id: apiKey.id,
              name: apiKey.name,
              prefix: apiKey.prefix,
              usageCount: apiKey.usageCount,
              lastUsedAt: apiKey.lastUsedAt,
              revokedAt: apiKey.revokedAt,
            })
            .from(apiKey)
            .where(eq(apiKey.userId, id))
            .orderBy(desc(apiKey.createdAt)),
        []
      ),

      probe(
        "events",
        () =>
          db
            .select({
              at: toolExecution.executedAt,
              label: toolExecution.toolName,
              status: toolExecution.status,
              error: toolExecution.errorMessage,
            })
            .from(toolExecution)
            .where(eq(toolExecution.userId, id))
            .orderBy(desc(toolExecution.executedAt))
            .limit(EVENTS_LIMIT),
        []
      ),

      probe(
        "counts",
        () =>
          db
            .select({
              messages: sql<number>`(select count(*)::int from ${sferaMessage} where ${sferaMessage.userId} = ${id})`,
              owned: sql<number>`(select count(*)::int from ${sfera} where ${sfera.ownerId} = ${id})`,
              lastSeen: sql<string | null>`(select max(${sferaMessage.createdAt})::text from ${sferaMessage} where ${sferaMessage.userId} = ${id})`,
              firstSeen: sql<string | null>`(select min(${sferaMessage.createdAt})::text from ${sferaMessage} where ${sferaMessage.userId} = ${id})`,
            })
            .from(sql`(select 1) as t`),
        []
      ),
    ]);

    const onboarding = person.settings?.onboarding ?? null;
    const totals = counts[0];

    return Response.json({
      failures,
      person: {
        id: person.id,
        name: person.displayName || person.name,
        email: person.email,
        bio: person.bio,
        createdAt: person.createdAt,
        mcpEnabled: person.mcpEnabled,
        lastSeen: totals?.lastSeen ?? null,
        firstSeen: totals?.firstSeen ?? null,
        messageCount: totals?.messages ?? 0,
        ownedCount: totals?.owned ?? 0,
        cellCount: cells.length,
      },
      // What the person told the interview about themselves, in their words.
      onboarding: onboarding
        ? {
            completed: onboarding.completed ?? false,
            completedAt: onboarding.completedAt ?? null,
            sferaId: onboarding.sferaId ?? null,
            answers: [
              { question: "Как зовут", answer: onboarding.name ?? null },
              { question: "Чем занимается", answer: onboarding.role ?? null },
              { question: "Что увлекает", answer: onboarding.interests ?? null },
              { question: "Зачем Orbital", answer: onboarding.goals ?? null },
              { question: "Над чем работает", answer: onboarding.context ?? null },
            ].filter((entry) => entry.answer),
          }
        : null,
      series: toSeries(pulse),
      seriesDays: PULSE_DAYS,
      cells,
      spend,
      keys,
      events,
    });
  } catch (error) {
    console.error(`[admin/people] ${id} failed:`, error);
    return Response.json(
      { error: "Не удалось собрать карточку", detail: errorMessage(error) },
      { status: 500 }
    );
  }
}
