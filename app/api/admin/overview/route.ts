import { and, count, desc, eq, gte, sql } from "drizzle-orm";
import { isAdminEmail, requireAdmin } from "@/lib/admin/access";
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

/** One failed sensor, surfaced to the station instead of killing the screen. */
type Failure = { source: string; message: string };

function errorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

export async function GET() {
  const admin = await requireAdmin();

  if (!admin) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  const pulseSince = daysAgo(PULSE_DAYS);
  const spendSince = daysAgo(SPEND_DAYS);
  const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const startedAt = Date.now();
  const failures: Failure[] = [];

  /**
   * Runs one aggregate. A single broken query degrades its own panel and is
   * logged with its name — the rest of the station still reports.
   */
  async function probe<T>(
    source: string,
    run: () => Promise<T>,
    fallback: T
  ): Promise<T> {
    const probeStartedAt = Date.now();
    try {
      const result = await run();
      const rows = Array.isArray(result) ? result.length : 1;
      console.log(
        `[admin/overview] ${source} ok rows=${rows} ${Date.now() - probeStartedAt}ms`
      );
      return result;
    } catch (error) {
      const message = errorMessage(error);
      failures.push({ source, message });
      console.error(
        `[admin/overview] ${source} failed after ${Date.now() - probeStartedAt}ms:`,
        error
      );
      return fallback;
    }
  }

  try {
    console.log(
      `[admin/overview] collecting for ${admin.email} (pulse from ${dayKey(pulseSince)})`
    );

    const [
      peopleTotal,
      cellsTotal,
      livingCellsTotal,
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
      probe("people.total", () => db.select({ value: count() }).from(user), []),

      probe("cells.total", () => db.select({ value: count() }).from(sfera), []),

      probe(
        "cells.living",
        () =>
          db
            .select({ value: count() })
            .from(sfera)
            .where(gte(sfera.updatedAt, pulseSince)),
        []
      ),

      probe(
        "messages.24h",
        () =>
          db
            .select({ value: count() })
            .from(sferaMessage)
            .where(gte(sferaMessage.createdAt, dayAgo)),
        []
      ),

      probe(
        "ai.24h",
        () =>
          db
            .select({ value: count() })
            .from(aiUsageLog)
            .where(gte(aiUsageLog.createdAt, dayAgo)),
        []
      ),

      probe(
        "errors.24h",
        () =>
          db
            .select({ value: count() })
            .from(aiUsageLog)
            .where(
              and(
                gte(aiUsageLog.createdAt, dayAgo),
                sql`${aiUsageLog.status} <> 'success'`
              )
            ),
        []
      ),

      probe(
        "spend.24h",
        () =>
          db
            .select({
              cents: sql<number>`coalesce(sum(${aiUsageLog.estimatedCost}), 0)::int`,
            })
            .from(aiUsageLog)
            .where(gte(aiUsageLog.createdAt, dayAgo)),
        []
      ),

      // Daily pulses for the top gauges.
      probe(
        "pulse.people",
        () =>
          db
            .select({
              day: sql<string>`date_trunc('day', ${user.createdAt})::date::text`,
              value: sql<number>`count(*)::int`,
            })
            .from(user)
            .where(gte(user.createdAt, pulseSince))
            .groupBy(sql`1`),
        []
      ),

      probe(
        "pulse.cells",
        () =>
          db
            .select({
              day: sql<string>`date_trunc('day', ${sfera.createdAt})::date::text`,
              value: sql<number>`count(*)::int`,
            })
            .from(sfera)
            .where(gte(sfera.createdAt, pulseSince))
            .groupBy(sql`1`),
        []
      ),

      probe(
        "pulse.messages",
        () =>
          db
            .select({
              day: sql<string>`date_trunc('day', ${sferaMessage.createdAt})::date::text`,
              value: sql<number>`count(*)::int`,
            })
            .from(sferaMessage)
            .where(gte(sferaMessage.createdAt, pulseSince))
            .groupBy(sql`1`),
        []
      ),

      probe(
        "pulse.ai",
        () =>
          db
            .select({
              day: sql<string>`date_trunc('day', ${aiUsageLog.createdAt})::date::text`,
              value: sql<number>`count(*)::int`,
            })
            .from(aiUsageLog)
            .where(gte(aiUsageLog.createdAt, pulseSince))
            .groupBy(sql`1`),
        []
      ),

      probe(
        "pulse.spend",
        () =>
          db
            .select({
              day: sql<string>`date_trunc('day', ${aiUsageLog.createdAt})::date::text`,
              value: sql<number>`coalesce(sum(${aiUsageLog.estimatedCost}), 0)::int`,
            })
            .from(aiUsageLog)
            .where(gte(aiUsageLog.createdAt, pulseSince))
            .groupBy(sql`1`),
        []
      ),

      probe(
        "pulse.errors",
        () =>
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
        []
      ),

      // People register.
      probe(
        "register.people",
        () =>
          db
            .select({
              id: user.id,
              name: user.name,
              displayName: user.displayName,
              email: user.email,
              createdAt: user.createdAt,
              mcpEnabled: user.mcpEnabled,
              settings: user.settings,
              cellCount: sql<number>`(select count(*)::int from ${sferaMember} where ${sferaMember.userId} = ${user.id})`,
              messageCount: sql<number>`(select count(*)::int from ${sferaMessage} where ${sferaMessage.userId} = ${user.id})`,
              lastSeen: sql<string | null>`(select max(${sferaMessage.createdAt})::text from ${sferaMessage} where ${sferaMessage.userId} = ${user.id})`,
              aiRequestCount: sql<number>`(select count(*)::int from ${aiUsageLog} where ${aiUsageLog.userId} = ${user.id})`,
              spendCents: sql<number>`(select coalesce(sum(${aiUsageLog.estimatedCost}), 0)::int from ${aiUsageLog} where ${aiUsageLog.userId} = ${user.id})`,
              activeKeyCount: sql<number>`(select count(*)::int from ${apiKey} where ${apiKey.userId} = ${user.id} and ${apiKey.revokedAt} is null)`,
            })
            .from(user)
            .orderBy(desc(user.createdAt))
            .limit(REGISTER_LIMIT),
        []
      ),

      probe(
        "pulse.perPerson",
        () =>
          db
            .select({
              key: sferaMessage.userId,
              day: sql<string>`date_trunc('day', ${sferaMessage.createdAt})::date::text`,
              value: sql<number>`count(*)::int`,
            })
            .from(sferaMessage)
            .where(gte(sferaMessage.createdAt, pulseSince))
            .groupBy(sferaMessage.userId, sql`2`),
        []
      ),

      // Cells register, most recently active first.
      probe(
        "register.cells",
        () =>
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
        []
      ),

      probe(
        "spend.byProvider",
        () =>
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
        []
      ),

      probe(
        "agents",
        () =>
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
        []
      ),

      // Keys: prefix only, never the hash.
      probe(
        "register.keys",
        () =>
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
        []
      ),

      probe(
        "events.mcp",
        () =>
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
        []
      ),

      probe(
        "events.tools",
        () =>
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
        []
      ),
    ]);

    const peoplePulseByUser = toSeriesByKey(peoplePulse);

    const events = [...mcpEvents, ...toolEvents]
      .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
      .slice(0, EVENTS_LIMIT);

    console.log(
      `[admin/overview] done in ${Date.now() - startedAt}ms — people=${people.length} cells=${cells.length} events=${events.length} failures=${failures.length}`
    );

    return Response.json({
      generatedAt: new Date().toISOString(),
      failures,
      gauges: {
        people: {
          value: peopleTotal[0]?.value ?? 0,
          series: toSeries(userPulse),
        },
        livingCells: {
          value: livingCellsTotal[0]?.value ?? 0,
          total: cellsTotal[0]?.value ?? 0,
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
        mcpEnabled: person.mcpEnabled,
        admin: isAdminEmail(person.email),
        cellCount: person.cellCount,
        messageCount: person.messageCount,
        aiRequestCount: person.aiRequestCount,
        spendCents: person.spendCents,
        activeKeyCount: person.activeKeyCount,
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
    console.error(
      `[admin/overview] collapsed after ${Date.now() - startedAt}ms:`,
      error
    );
    return Response.json(
      {
        error: "Не удалось собрать данные",
        detail: errorMessage(error),
      },
      { status: 500 }
    );
  }
}
