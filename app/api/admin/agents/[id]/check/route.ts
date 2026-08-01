import { generateText } from "ai";
import { requireAdmin } from "@/lib/admin/access";
import { errorMessage } from "@/lib/admin/probe";
import { getAgentById } from "@/lib/ai/agents/registry";
import { invalidateAgentConfig, resolveAgent } from "@/lib/ai/agents/resolve";
import { myProvider } from "@/lib/ai/providers";
import { db } from "@/lib/db";
import { agentConfig } from "@/lib/db/schema";

export const dynamic = "force-dynamic";

const TIMEOUT_MS = 12_000;

type RouteContext = {
  params: Promise<{ id: string }>;
};

type CheckResult = {
  ok: boolean;
  ms: number;
  error: string | null;
  /** What was actually reached, for the operator to read. */
  target: string;
};

/**
 * Asks the MCP server what it can do.
 *
 * `tools/list` is deliberate: it proves the endpoint is up and speaking MCP
 * without spending tokens or leaving a message in anyone's Sfera, which
 * `tools/call` would do.
 */
async function checkMcp(endpoint: string, authToken?: string): Promise<CheckResult> {
  const startedAt = Date.now();

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: Date.now(),
        method: "tools/list",
        params: {},
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });

    const ms = Date.now() - startedAt;

    if (!response.ok) {
      return {
        ok: false,
        ms,
        error: `HTTP ${response.status}`,
        target: endpoint,
      };
    }

    const json = await response.json();

    if (json.error) {
      return {
        ok: false,
        ms,
        error: `MCP: ${json.error.message ?? JSON.stringify(json.error)}`,
        target: endpoint,
      };
    }

    // A server that answers but exposes nothing cannot act as an agent.
    const tools = json.result?.tools;
    if (!Array.isArray(tools)) {
      return {
        ok: false,
        ms,
        error: "Ответ без списка инструментов",
        target: endpoint,
      };
    }

    return { ok: true, ms, error: null, target: endpoint };
  } catch (error) {
    const ms = Date.now() - startedAt;
    const isTimeout =
      error instanceof Error &&
      (error.name === "TimeoutError" || error.name === "AbortError");

    return {
      ok: false,
      ms,
      error: isTimeout ? `Молчит дольше ${TIMEOUT_MS / 1000} с` : errorMessage(error),
      target: endpoint,
    };
  }
}

/**
 * Sends the model one token's worth of work.
 *
 * Checking that the model is merely registered in the provider would pass even
 * when the upstream key is dead, so this makes a real call — the cheapest one
 * that still proves the agent could answer.
 */
async function checkModel(model: string): Promise<CheckResult> {
  const startedAt = Date.now();

  try {
    await generateText({
      model: myProvider.languageModel(model),
      prompt: "ping",
      maxOutputTokens: 1,
      abortSignal: AbortSignal.timeout(TIMEOUT_MS),
    });

    return { ok: true, ms: Date.now() - startedAt, error: null, target: model };
  } catch (error) {
    const ms = Date.now() - startedAt;
    const isTimeout =
      error instanceof Error &&
      (error.name === "TimeoutError" || error.name === "AbortError");

    return {
      ok: false,
      ms,
      error: isTimeout
        ? `Молчит дольше ${TIMEOUT_MS / 1000} с`
        : errorMessage(error),
      target: model,
    };
  }
}

/**
 * POST /api/admin/agents/[id]/check — is this agent actually reachable?
 *
 * The existing AgentRegistry table only tracks webhook agents, so MCP and
 * internal agents had no health signal at all. This writes one.
 */
export async function POST(_request: Request, context: RouteContext) {
  const admin = await requireAdmin();

  if (!admin) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  const { id } = await context.params;
  const agent = getAgentById(id);

  if (!agent) {
    return Response.json({ error: "Такого агента нет" }, { status: 404 });
  }

  // Check what the agent is really running with, not what the code says.
  const resolved = await resolveAgent(agent);

  let result: CheckResult;

  if (resolved.runtime === "external-mcp") {
    const endpoint = resolved.externalMcp?.endpoint;

    if (!endpoint) {
      return Response.json(
        { error: "У агента не задан внешний адрес" },
        { status: 400 }
      );
    }

    result = await checkMcp(endpoint, resolved.externalMcp?.authToken);
  } else {
    result = await checkModel(resolved.model);
  }

  console.log(
    `[admin/agents] ${admin.email} checked ${id}: ${result.ok ? "ok" : "failed"} ${result.ms}ms ${result.error ?? ""}`
  );

  try {
    const now = new Date();

    await db
      .insert(agentConfig)
      .values({
        agentId: id,
        lastCheckAt: now,
        lastCheckOk: result.ok,
        lastCheckMs: result.ms,
        lastCheckError: result.error,
        updatedById: admin.userId,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: agentConfig.agentId,
        // Only the check fields — a probe must never disturb the settings.
        set: {
          lastCheckAt: now,
          lastCheckOk: result.ok,
          lastCheckMs: result.ms,
          lastCheckError: result.error,
        },
      });

    invalidateAgentConfig(id);
  } catch (error) {
    // The check itself succeeded; failing to record it is worth reporting but
    // must not hide the answer the operator asked for.
    console.error(`[admin/agents] could not record check for ${id}:`, error);
  }

  return Response.json(result);
}
