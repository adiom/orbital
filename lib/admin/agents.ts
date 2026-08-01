import "server-only";

import { and, desc, eq, gte, inArray, sql } from "drizzle-orm";
import { aiAgents } from "@/lib/ai/agents/registry";
import type { AIAgent } from "@/lib/ai/agents/types";
import { getSferaTools } from "@/lib/ai/sfera-tools";
import { db } from "@/lib/db";
import {
  agentConfig,
  agentPromptVersion,
  aiUsageLog,
  sferaMessage,
  toolExecution,
  user,
} from "@/lib/db/schema";
import { createProbe, type Failure } from "./probe";

const PULSE_DAYS = 14;

/** What the console may change, versus what only code can decide. */
export type AgentOverrides = {
  enabled: boolean;
  model: string | null;
  temperature: number | null;
  maxSteps: number | null;
  tools: string[] | null;
  rateLimit: {
    requestsPerMinute: number;
    requestsPerHour: number;
    cooldownSeconds: number;
  } | null;
  mcpEndpoint: string | null;
};

export type AgentReading = {
  id: string;
  name: string;
  email: string;
  userId: string;
  runtime: "internal" | "external-mcp";

  /** Read-only, straight from code. */
  code: {
    model: string;
    temperature: number | null;
    maxSteps: number | null;
    mentionPatterns: string[];
    toolNames: string[];
    mcpEndpoint: string | null;
    hasPrompt: boolean;
  };

  /** Null when no row exists — the agent runs exactly as written. */
  overrides: AgentOverrides | null;

  /** What the agent is actually running with, after overrides. */
  effective: {
    enabled: boolean;
    model: string;
    temperature: number | null;
    maxSteps: number | null;
    toolNames: string[];
    mcpEndpoint: string | null;
  };

  prompt: {
    version: number | null;
    updatedAt: string | null;
    authorEmail: string | null;
    /** True when the live prompt comes from the console, not from code. */
    overridden: boolean;
  };

  activity: {
    requests: number;
    errors: number;
    spendCents: number;
    lastReplyAt: string | null;
    series: number[];
  };

  check: {
    at: string | null;
    ok: boolean | null;
    ms: number | null;
    error: string | null;
  };
};

export type ToolReading = {
  name: string;
  description: string;
  calls: number;
  errors: number;
  avgMs: number | null;
  lastCalledAt: string | null;
  /** Agent ids whose effective tool set includes this tool. */
  usedBy: string[];
};

function daysAgo(days: number): Date {
  const date = new Date();
  date.setUTCHours(0, 0, 0, 0);
  date.setUTCDate(date.getUTCDate() - days + 1);
  return date;
}

function dayKeys(): string[] {
  const start = daysAgo(PULSE_DAYS);
  return Array.from({ length: PULSE_DAYS }, (_, index) => {
    const date = new Date(start);
    date.setUTCDate(date.getUTCDate() + index);
    return date.toISOString().slice(0, 10);
  });
}

function toSeries(rows: Array<{ day: string; value: number }>): number[] {
  const byDay = new Map(
    rows.map((row) => [new Date(row.day).toISOString().slice(0, 10), row.value])
  );
  return dayKeys().map((key) => byDay.get(key) ?? 0);
}

/** Mention patterns are RegExp in code; the console shows them as text. */
function patternText(pattern: string | RegExp): string {
  return pattern instanceof RegExp
    ? pattern.source.replace(/\\/g, "").replace(/^\^|\$$/g, "")
    : pattern;
}

function toolNamesOf(agent: AIAgent): string[] {
  if (!agent.tools) {
    return [];
  }
  return Object.keys(agent.tools).sort();
}

/**
 * Every tool the product has, keyed the same way the agents key theirs.
 *
 * Tool objects carry only a description, so the name has to come from the
 * agent definitions that already map them (see avrora.ts). Avrora holds the
 * full set, which makes it the catalogue.
 */
export function allToolNames(): Map<string, string> {
  const catalogue = new Map<string, string>();

  for (const agent of aiAgents) {
    if (!agent.tools) {
      continue;
    }
    for (const [name, tool] of Object.entries(agent.tools)) {
      if (!catalogue.has(name)) {
        const description =
          typeof tool === "object" && tool && "description" in tool
            ? String(tool.description ?? "")
            : "";
        catalogue.set(name, description);
      }
    }
  }

  return catalogue;
}

export type AgentsSnapshot = {
  generatedAt: string;
  failures: Failure[];
  agents: AgentReading[];
  tools: ToolReading[];
};

/**
 * Reads the console: agents from code, their overrides, and what each one has
 * actually been doing. Metrics are probed separately so a broken aggregate
 * dims its own row instead of emptying the screen.
 */
export async function readAgents(): Promise<AgentsSnapshot> {
  const { probe, failures } = createProbe("admin/agents");

  const agentIds = aiAgents.map((agent) => agent.id);
  const agentUserIds = aiAgents.map((agent) => agent.userId);
  const pulseSince = daysAgo(PULSE_DAYS);

  const [configs, promptVersions, usage, usagePulse, lastReplies, toolStats] =
    await Promise.all([
      probe(
        "configs",
        () =>
          db
            .select()
            .from(agentConfig)
            .where(inArray(agentConfig.agentId, agentIds)),
        []
      ),

      // Latest prompt version per agent, with who saved it.
      probe(
        "prompts",
        () =>
          db
            .select({
              agentId: agentPromptVersion.agentId,
              version: agentPromptVersion.version,
              createdAt: agentPromptVersion.createdAt,
              authorEmail: user.email,
            })
            .from(agentPromptVersion)
            .leftJoin(user, eq(agentPromptVersion.authorId, user.id))
            .where(inArray(agentPromptVersion.agentId, agentIds))
            .orderBy(
              agentPromptVersion.agentId,
              desc(agentPromptVersion.version)
            ),
        []
      ),

      probe(
        "usage",
        () =>
          db
            .select({
              userId: aiUsageLog.userId,
              requests: sql<number>`count(*)::int`,
              errors: sql<number>`count(*) filter (where ${aiUsageLog.status} <> 'success')::int`,
              cents: sql<number>`coalesce(sum(${aiUsageLog.estimatedCost}), 0)::int`,
            })
            .from(aiUsageLog)
            .where(inArray(aiUsageLog.userId, agentUserIds))
            .groupBy(aiUsageLog.userId),
        []
      ),

      probe(
        "usagePulse",
        () =>
          db
            .select({
              userId: aiUsageLog.userId,
              day: sql<string>`date_trunc('day', ${aiUsageLog.createdAt})::date::text`,
              value: sql<number>`count(*)::int`,
            })
            .from(aiUsageLog)
            .where(
              and(
                inArray(aiUsageLog.userId, agentUserIds),
                gte(aiUsageLog.createdAt, pulseSince)
              )
            )
            .groupBy(aiUsageLog.userId, sql`2`),
        []
      ),

      // When the agent last actually said something. For MCP agents this is
      // the only liveness signal that exists today.
      probe(
        "lastReplies",
        () =>
          db
            .select({
              userId: sferaMessage.userId,
              at: sql<string>`max(${sferaMessage.createdAt})::text`,
            })
            .from(sferaMessage)
            .where(inArray(sferaMessage.userId, agentUserIds))
            .groupBy(sferaMessage.userId),
        []
      ),

      probe(
        "toolStats",
        () =>
          db
            .select({
              toolName: toolExecution.toolName,
              calls: sql<number>`count(*)::int`,
              errors: sql<number>`count(*) filter (where ${toolExecution.status} = 'error')::int`,
              lastCalledAt: sql<string>`max(${toolExecution.executedAt})::text`,
            })
            .from(toolExecution)
            .groupBy(toolExecution.toolName),
        []
      ),
    ]);

  const configByAgent = new Map(configs.map((row) => [row.agentId, row]));
  const usageByUser = new Map(usage.map((row) => [row.userId, row]));
  const lastReplyByUser = new Map(lastReplies.map((row) => [row.userId, row.at]));

  const pulseByUser = new Map<string, Array<{ day: string; value: number }>>();
  for (const row of usagePulse) {
    const bucket = pulseByUser.get(row.userId) ?? [];
    bucket.push({ day: row.day, value: row.value });
    pulseByUser.set(row.userId, bucket);
  }

  // Rows come back newest-first per agent, so the first one wins.
  const promptByAgent = new Map<string, (typeof promptVersions)[number]>();
  for (const row of promptVersions) {
    if (!promptByAgent.has(row.agentId)) {
      promptByAgent.set(row.agentId, row);
    }
  }

  const agents: AgentReading[] = aiAgents.map((agent) => {
    const config = configByAgent.get(agent.id) ?? null;
    const codeToolNames = toolNamesOf(agent);
    const prompt = promptByAgent.get(agent.id);

    const overrides: AgentOverrides | null = config
      ? {
          enabled: config.enabled,
          model: config.model,
          temperature: config.temperature,
          maxSteps: config.maxSteps,
          tools: config.tools,
          rateLimit: config.rateLimit,
          mcpEndpoint: config.mcpEndpoint,
        }
      : null;

    const effectiveTools = config?.tools
      ? codeToolNames.filter((name) => config.tools?.includes(name))
      : codeToolNames;

    const activity = usageByUser.get(agent.userId);

    return {
      id: agent.id,
      name: agent.name,
      email: agent.email,
      userId: agent.userId,
      runtime: agent.runtime ?? "internal",

      code: {
        model: agent.model,
        temperature: agent.temperature ?? null,
        maxSteps: agent.maxSteps ?? null,
        mentionPatterns: agent.mentionPatterns.map(patternText),
        toolNames: codeToolNames,
        mcpEndpoint: agent.externalMcp?.endpoint ?? null,
        hasPrompt: Boolean(agent.buildSystemPrompt),
      },

      overrides,

      effective: {
        enabled: config?.enabled ?? true,
        model: config?.model || agent.model,
        temperature: config?.temperature ?? agent.temperature ?? null,
        maxSteps: config?.maxSteps ?? agent.maxSteps ?? null,
        toolNames: effectiveTools,
        mcpEndpoint: config?.mcpEndpoint || agent.externalMcp?.endpoint || null,
      },

      prompt: {
        version: prompt?.version ?? null,
        updatedAt: prompt?.createdAt?.toISOString() ?? null,
        authorEmail: prompt?.authorEmail ?? null,
        overridden: Boolean(prompt),
      },

      activity: {
        requests: activity?.requests ?? 0,
        errors: activity?.errors ?? 0,
        spendCents: activity?.cents ?? 0,
        lastReplyAt: lastReplyByUser.get(agent.userId) ?? null,
        series: toSeries(pulseByUser.get(agent.userId) ?? []),
      },

      check: {
        at: config?.lastCheckAt?.toISOString() ?? null,
        ok: config?.lastCheckOk ?? null,
        ms: config?.lastCheckMs ?? null,
        error: config?.lastCheckError ?? null,
      },
    };
  });

  const statsByTool = new Map(toolStats.map((row) => [row.toolName, row]));

  const tools: ToolReading[] = [...allToolNames().entries()]
    .map(([name, description]) => {
      const stats = statsByTool.get(name);
      return {
        name,
        description,
        calls: stats?.calls ?? 0,
        errors: stats?.errors ?? 0,
        avgMs: null,
        lastCalledAt: stats?.lastCalledAt ?? null,
        usedBy: agents
          .filter((agent) => agent.effective.toolNames.includes(name))
          .map((agent) => agent.id),
      };
    })
    // Dead tools surface on their own — "never called" is a diagnosis.
    .sort((a, b) => b.calls - a.calls || a.name.localeCompare(b.name));

  return {
    generatedAt: new Date().toISOString(),
    failures,
    agents,
    tools,
  };
}

/** Total tool count, used by the console header. */
export function toolCount(): number {
  return getSferaTools().length;
}
