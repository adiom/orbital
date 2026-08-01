import { and, count, desc, eq, gte, isNull, sql } from "drizzle-orm";
import { requireAdmin } from "@/lib/admin/access";
import { db } from "@/lib/db";
import {
  agentRegistry,
  aiUsageLog,
  apiKey,
  mcpAuditLog,
  sfera,
  sferaMember,
  sferaMessage,
  toolExecution,
  user,
} from "@/lib/db/schema";

export const dynamic = "force-dynamic";

const PULSE_DAYS = 14;
const SPEND_DAYS = 7;
const REGISTER_LIMIT = 100;
const EVENTS_LIMIT = 30;

function daysAgo(days: number): Date {
  const date = new Date();
  date.setUTCHours(0, 0, 0, 0);
  date.setUTCDate(date.getUTCDate() - days + 1);
  return date;
}

function dayKey(value: Date | string): string {
  return new Date(value).toISOString().slice(0, 10);
}

/** Builds the last PULSE_DAYS day keys, oldest first. */
function pulseDayKeys(): string[] {
  const start = daysAgo(PULSE_DAYS);
  return Array.from({ length: PULSE_DAYS }, (_, index) => {
    const date = new Date(start);
    date.setUTCDate(date.getUTCDate() + index);
    return date.toISOString().slice(0, 10);
  });
}

/** Turns [{day, value}] rows into a dense PULSE_DAYS-long series. */
function toSeries(rows: Array<{ day: string; value: number }>): number[] {
  const byDay = new Map(rows.map((row) => [dayKey(row.day), row.value]));
  return pulseDayKeys().map((key) => byDay.get(key) ?? 0);
}

/** Groups [{key, day, value}] rows into a series per key. */
function toSeriesByKey(
  rows: Array<{ key: string; day: string; value: number }>
): Map<string, number[]> {
  const grouped = new Map<string, Array<{ day: string; value: number }>>();
  for (const row of rows) {
    const bucket = grouped.get(row.key) ?? [];
    bucket.push({ day: row.day, value: row.value });
    grouped.set(row.key, bucket);
  }

  const result = new Map<string, number[]>();
  for (const [key, bucket] of grouped) {
    result.set(key, toSeries(bucket));
  }
  return result;
}

export async function GET() {
  const admin = await requireAdmin();

  if (!admin) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  const pulseSince = daysAgo(PULSE_DAYS);
  const spendSince = daysAgo(SPEND_DAYS);
  const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

  try {
    const [
      totals,
      messages24h,
      ai24h,
      errors24h,
      spend24h,
      userPulse,
      cellPulse,
      messagePulse,
      aiPulse,
      spendPulse,
      errorPulse,
      people,
      peoplePulse,
      cells,
      spendByProvider,
      agents,
      keys,
      mcpEvents,
      toolEvents,
    ] = await Promise.all([
      // Totals: people, living cells (touched in the last 14 days), all cells.
      db
        .select({
          people: sql<number>`(select count(*)::int from ${user})`,
          cells: sql<number>`(select count(*)::int from ${sfera})`,
          livingCells: sql<number>`(select count(*)::int from ${sfera} where ${sfera.updatedAt} >= ${pulseSince})`,
        })
        .from(sql`(select 1) as t`),

      db
        .select({ value: count() })
        .from(sferaMessage)
        .where(gte(sferaMessage.createdAt, dayAgo)),

      db
        .select({ value: count() })
        .from(aiUsageLog)
        .where(gte(aiUsageLog.createdAt, dayAgo)),

      db
        .select({ value: count() })
        .from(aiUsageLog)
        .where(
          and(
            gte(aiUsageLog.createdAt, dayAgo),
            sql`${aiUsageLog.status} <> 'success'`
          )
        ),

      db
        .select({ cents: sql<number>`coalesce(sum(${aiUsageLog.estimatedCost}), 0)::int` })
        .from(aiUsageLog)
        .where(gte(aiUsageLog.createdAt, dayAgo)),

      // Daily pulses for the top gauges.
      db
        .select({
          day: sql<string>`date_trunc('day', ${user.createdAt})::date::text`,
          value: sql<number>`count(*)::int`,
        })
        .from(user)
        .where(gte(user.createdAt, pulseSince))
        .groupBy(sql`1`),

      db
        .select({
          day: sql<string>`date_trunc('day', ${sfera.createdAt})::date::text`,
          value: sql<number>`count(*)::int`,
        })
        .from(sfera)
        .where(gte(sfera.createdAt, pulseSince))
        .groupBy(sql`1`),

      db
        .select({
          day: sql<string>`date_trunc('day', ${sferaMessage.createdAt})::date::text`,
          value: sql<number>`count(*)::int`,
        })
        .from(sferaMessage)
        .where(gte(sferaMessage.createdAt, pulseSince))
        .groupBy(sql`1`),

      db
        .select({
          day: sql<string>`date_trunc('day', ${aiUsageLog.createdAt})::date::text`,
          value: sql<number>`count(*)::int`,
        })
        .from(aiUsageLog)
        .where(gte(aiUsageLog.createdAt, pulseSince))
        .groupBy(sql`1`),

      db
        .select({
          day: sql<string>`date_trunc('day', ${aiUsageLog.createdAt})::date::text`,
          value: sql<number>`coalesce(sum(${aiUsageLog.estimatedCost}), 0)::int`,
        })
        .from(aiUsageLog)
        .where(gte(aiUsageLog.createdAt, pulseSince))
        .groupBy(sql`1`),

      db
        .select({
          day: sql<string>`date_trunc('day', ${aiUsageLog.createdAt})::date::text`,
          value: sql<number>`count(*)::int`,
        })
        .from(aiUsageLog)
        .where(
          and(
            gte(aiUsageLog.createdAt, pulseSince),
            sql`${aiUsageLog.status} <> 'success'`
          )
        )
        .groupBy(sql`1`),

      // People register.
      db
        .select({
          id: user.id,
          name: user.name,
          displayName: user.displayName,
          email: user.email,
          createdAt: user.createdAt,
          settings: user.settings,
          cellCount: sql<number>`(select count(*)::int from ${sferaMember} where ${sferaMember.userId} = ${user.id})`,
          messageCount: sql<number>`(select count(*)::int from ${sferaMessage} where ${sferaMessage.userId} = ${user.id})`,
          lastSeen: sql<string | null>`(select max(${sferaMessage.createdAt})::text from ${sferaMessage} where ${sferaMessage.userId} = ${user.id})`,
        })
        .from(user)
        .orderBy(desc(user.createdAt))
        .limit(REGISTER_LIMIT),

      db
        .select({
          key: sferaMessage.userId,
          day: sql<string>`date_trunc('day', ${sferaMessage.createdAt})::date::text`,
          value: sql<number>`count(*)::int`,
        })
        .from(sferaMessage)
        .where(gte(sferaMessage.createdAt, pulseSince))
        .groupBy(sferaMessage.userId, sql`2`),

      // Cells register, most recently active first.
      db
        .select({
          id: sfera.id,
          title: sfera.title,
          visibility: sfera.visibility,
          createdAt: sfera.createdAt,
          updatedAt: sfera.updatedAt,
          ownerName: user.name,
          ownerEmail: user.email,
          memberCount: sql<number>`(select count(*)::int from ${sferaMember} where ${sferaMember.sferaId} = ${sfera.id})`,
          messageCount: sql<number>`(select count(*)::int from ${sferaMessage} where ${sferaMessage.sferaId} = ${sfera.id})`,
        })
        .from(sfera)
        .innerJoin(user, eq(sfera.ownerId, user.id))
        .orderBy(desc(sfera.updatedAt))
        .limit(REGISTER_LIMIT),

      db
        .select({
          provider: aiUsageLog.provider,
          requests: sql<number>`count(*)::int`,
          tokens: sql<number>`coalesce(sum(${aiUsageLog.totalTokens}), 0)::int`,
          cents: sql<number>`coalesce(sum(${aiUsageLog.estimatedCost}), 0)::int`,
        })
        .from(aiUsageLog)
        .where(gte(aiUsageLog.createdAt, spendSince))
        .groupBy(aiUsageLog.provider)
        .orderBy(sql`4 desc`),

      db
        .select({
          id: agentRegistry.id,
          name: agentRegistry.name,
          healthStatus: agentRegistry.healthStatus,
          lastHealthCheck: agentRegistry.lastHealthCheck,
          failedWebhookCount: agentRegistry.failedWebhookCount,
        })
        .from(agentRegistry)
        .orderBy(desc(agentRegistry.failedWebhookCount)),

      // Keys: prefix only, never the hash.
      db
        .select({
          id: apiKey.id,
          name: apiKey.name,
          prefix: apiKey.prefix,
          usageCount: apiKey.usageCount,
          lastUsedAt: apiKey.lastUsedAt,
          revokedAt: apiKey.revokedAt,
          expiresAt: apiKey.expiresAt,
          createdAt: apiKey.createdAt,
          ownerEmail: user.email,
        })
        .from(apiKey)
        .innerJoin(user, eq(apiKey.userId, user.id))
        .orderBy(desc(apiKey.createdAt))
        .limit(REGISTER_LIMIT),

      db
        .select({
          at: mcpAuditLog.createdAt,
          source: sql<string>`'mcp'`,
          label: mcpAuditLog.method,
          detail: mcpAuditLog.toolName,
          status: sql<string>`case when ${mcpAuditLog.statusCode} < 400 then 'ok' else 'error' end`,
          durationMs: mcpAuditLog.responseTimeMs,
        })
        .from(mcpAuditLog)
        .orderBy(desc(mcpAuditLog.createdAt))
        .limit(EVENTS_LIMIT),

      db
        .select({
          at: toolExecution.executedAt,
          source: sql<string>`'tool'`,
          label: toolExecution.toolName,
          detail: sql<string | null>`null`,
          status: toolExecution.status,
          durationMs: sql<number | null>`null`,
        })
        .from(toolExecution)
        .orderBy(desc(toolExecution.executedAt))
        .limit(EVENTS_LIMIT),
    ]);

    const totalsRow = totals[0];
    const peoplePulseByUser = toSeriesByKey(peoplePulse);

    const events = [...mcpEvents, ...toolEvents]
      .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
      .slice(0, EVENTS_LIMIT);

    return Response.json({
      generatedAt: new Date().toISOString(),
      gauges: {
        people: { value: totalsRow?.people ?? 0, series: toSeries(userPulse) },
        livingCells: {
          value: totalsRow?.livingCells ?? 0,
          total: totalsRow?.cells ?? 0,
          series: toSeries(cellPulse),
        },
        messages24h: {
          value: messages24h[0]?.value ?? 0,
          series: toSeries(messagePulse),
        },
        aiRequests24h: {
          value: ai24h[0]?.value ?? 0,
          series: toSeries(aiPulse),
        },
        spend24hCents: {
          value: spend24h[0]?.cents ?? 0,
          series: toSeries(spendPulse),
        },
        errors24h: {
          value: errors24h[0]?.value ?? 0,
          series: toSeries(errorPulse),
        },
      },
      people: people.map((person) => ({
        id: person.id,
        name: person.displayName || person.name,
        email: person.email,
        createdAt: person.createdAt,
        lastSeen: person.lastSeen,
        cellCount: person.cellCount,
        messageCount: person.messageCount,
        onboarded: person.settings?.onboarding?.completed ?? false,
        series: peoplePulseByUser.get(person.id) ?? pulseDayKeys().map(() => 0),
      })),
      cells,
      keys,
      spend: {
        days: SPEND_DAYS,
        byProvider: spendByProvider,
      },
      agents,
      events,
    });
  } catch (error) {
    return Response.json(
      {
        error: "Не удалось собрать данные",
        detail: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
