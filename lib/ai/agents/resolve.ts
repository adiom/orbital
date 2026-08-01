/**
 * Agent configuration resolution
 *
 * Agents live in code (lib/ai/agents/instances/*): personality, mention
 * patterns and tool implementations cannot come from a table. What an operator
 * needs to turn without a deploy can — model, temperature, step budget, the
 * system prompt, which tools are handed over, and whether the agent answers.
 *
 * A row in AgentConfig is an override layer, not a definition: every null
 * column means "keep whatever the code says", so deleting the row restores the
 * code exactly.
 *
 * This is the ONLY place where those overrides enter the execution path. Both
 * streamers resolve the agent before reading any of its fields, so no route can
 * bypass the console by fetching an agent some other way.
 */

import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  agentConfig,
  agentPromptVersion,
  sferaMessage,
} from "@/lib/db/schema";
import type { AgentPromptContext, AIAgent } from "./types";

type Overrides = {
  config: typeof agentConfig.$inferSelect | null;
  prompt: string | null;
};

/**
 * Agents are resolved on every message, so the config is cached briefly.
 * Short enough that an operator sees their change land, long enough that a
 * busy Sfera does not query the table per reply.
 */
const CACHE_TTL_MS = 30_000;

const cache = new Map<string, { overrides: Overrides; fetchedAt: number }>();

/** Drops cached overrides so the next reply picks up a just-saved change. */
export function invalidateAgentConfig(agentId?: string): void {
  if (agentId) {
    cache.delete(agentId);
    return;
  }
  cache.clear();
}

async function loadOverrides(agentId: string): Promise<Overrides> {
  const cached = cache.get(agentId);

  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    return cached.overrides;
  }

  const [[config], [latestPrompt]] = await Promise.all([
    db
      .select()
      .from(agentConfig)
      .where(eq(agentConfig.agentId, agentId))
      .limit(1),
    db
      .select({ prompt: agentPromptVersion.prompt })
      .from(agentPromptVersion)
      .where(eq(agentPromptVersion.agentId, agentId))
      .orderBy(desc(agentPromptVersion.version))
      .limit(1),
  ]);

  const overrides: Overrides = {
    config: config ?? null,
    prompt: latestPrompt?.prompt ?? null,
  };

  cache.set(agentId, { overrides, fetchedAt: Date.now() });
  return overrides;
}

/**
 * The onboarding agent injects the caller's id into its prompt so the
 * saveOnboardingProfile tool knows whose profile to write. An operator editing
 * that prompt keeps the placeholder, so substitution has to survive the
 * override — otherwise a saved prompt silently breaks the interview.
 */
function fillPlaceholders(
  prompt: string,
  context: AgentPromptContext
): string {
  return prompt
    .replaceAll(
      "{requestingUserId}",
      context.requestingUserId ??
        "неизвестен (попроси пользователя сообщить)"
    )
    .replaceAll("{sferaTitle}", context.sfera?.title ?? "")
    .replaceAll("{userName}", context.userName ?? "");
}

/**
 * Lays the operator's overrides over an agent from code.
 *
 * Never mutates the input — callers keep holding the code definition. A
 * disabled agent is still returned, with `enabled: false`; the streamers check
 * that and stop, which keeps the decision out of the mention detector.
 */
export async function resolveAgent(agent: AIAgent): Promise<AIAgent> {
  let overrides: Overrides;

  try {
    overrides = await loadOverrides(agent.id);
  } catch (error) {
    // A missing table or an unreachable database must not silence the product.
    console.error(
      `[resolveAgent] ${agent.id}: could not read overrides, using code:`,
      error
    );
    return agent;
  }

  const { config, prompt } = overrides;

  if (!(config || prompt)) {
    return agent;
  }

  const resolved: AIAgent = { ...agent };

  if (config) {
    resolved.enabled = config.enabled;

    if (config.model) {
      resolved.model = config.model;
    }
    if (config.temperature !== null) {
      resolved.temperature = config.temperature;
    }
    if (config.maxSteps !== null) {
      resolved.maxSteps = config.maxSteps;
    }
    if (config.rateLimit) {
      resolved.rateLimit = config.rateLimit;
    }
    if (config.mcpEndpoint && agent.externalMcp) {
      resolved.externalMcp = {
        ...agent.externalMcp,
        endpoint: config.mcpEndpoint,
      };
    }

    // `tools` is already keyed by tool name in the code definitions
    // (see avrora.ts), so the allow-list filters the keys directly.
    if (config.tools && agent.tools) {
      const allowed = new Set(config.tools);
      resolved.tools = Object.fromEntries(
        Object.entries(agent.tools).filter(([name]) => allowed.has(name))
      );
    }
  }

  if (prompt) {
    resolved.buildSystemPrompt = (context) => fillPlaceholders(prompt, context);
  }

  return resolved;
}

/**
 * Silences a disabled agent by marking its message as complete without content.
 *
 * When `enabled: false`, the agent's mention was detected and a placeholder
 * message was created, but the agent will not reply. This helper marks that
 * message as finished so it does not stay in "generating..." forever.
 */
export async function silenceAgent(params: {
  agent: AIAgent;
  targetMessageId: string;
  reason: string;
}): Promise<{ text: string; success: false }> {
  const { agent, targetMessageId, reason } = params;

  console.log(`🔇 ${agent.name}: silenced (${reason})`);

  await db
    .update(sferaMessage)
    .set({
      content: "",
      isGenerating: false,
    })
    .where(eq(sferaMessage.id, targetMessageId));

  return { text: "", success: false };
}
