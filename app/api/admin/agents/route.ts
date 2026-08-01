import { eq } from "drizzle-orm";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin/access";
import { readAgents } from "@/lib/admin/agents";
import { errorMessage } from "@/lib/admin/probe";
import { getAgentById } from "@/lib/ai/agents/registry";
import { invalidateAgentConfig } from "@/lib/ai/agents/resolve";
import { db } from "@/lib/db";
import { agentConfig } from "@/lib/db/schema";

export const dynamic = "force-dynamic";

/**
 * Only fields the console is allowed to change. Personality, mention patterns,
 * tool implementations and runtime stay in code — see lib/admin/agents.ts.
 *
 * `null` clears an override and hands the field back to the code definition,
 * which is why every one is nullable rather than merely optional.
 */
const overridesSchema = z.object({
  agentId: z.string().min(1).max(64),
  enabled: z.boolean().optional(),
  model: z.string().max(100).nullish(),
  temperature: z.number().min(0).max(2).nullish(),
  maxSteps: z.number().int().min(1).max(20).nullish(),
  tools: z.array(z.string().max(100)).nullish(),
  rateLimit: z
    .object({
      requestsPerMinute: z.number().int().min(1).max(120),
      requestsPerHour: z.number().int().min(1).max(5000),
      cooldownSeconds: z.number().int().min(0).max(600),
    })
    .nullish(),
  mcpEndpoint: z.string().url().max(2000).nullish(),
});

/** GET /api/admin/agents — agents from code, their overrides and what they did. */
export async function GET() {
  const admin = await requireAdmin();

  if (!admin) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  try {
    return Response.json(await readAgents());
  } catch (error) {
    console.error("[admin/agents] read failed:", error);
    return Response.json(
      { error: "Не удалось собрать пульт", detail: errorMessage(error) },
      { status: 500 }
    );
  }
}

/** PATCH /api/admin/agents — save overrides for one agent. */
export async function PATCH(request: Request) {
  const admin = await requireAdmin();

  if (!admin) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  let parsed: z.infer<typeof overridesSchema>;

  try {
    parsed = overridesSchema.parse(await request.json());
  } catch (error) {
    return Response.json(
      {
        error: "Настройки не приняты",
        detail:
          error instanceof z.ZodError
            ? error.errors.map((e) => `${e.path.join(".")}: ${e.message}`).join(", ")
            : errorMessage(error),
      },
      { status: 400 }
    );
  }

  const { agentId, ...values } = parsed;
  const agent = getAgentById(agentId);

  if (!agent) {
    return Response.json({ error: "Такого агента нет" }, { status: 404 });
  }

  // An endpoint only means something for agents that call out to one.
  if (values.mcpEndpoint && agent.runtime !== "external-mcp") {
    return Response.json(
      { error: "У внутреннего агента нет внешнего адреса" },
      { status: 400 }
    );
  }

  // Handing an agent a tool that does not exist in its code definition would
  // silently do nothing, so it is refused rather than stored.
  if (values.tools) {
    const known = new Set(Object.keys(agent.tools ?? {}));
    const unknown = values.tools.filter((name) => !known.has(name));

    if (unknown.length > 0) {
      return Response.json(
        { error: `Этих инструментов у агента нет: ${unknown.join(", ")}` },
        { status: 400 }
      );
    }
  }

  try {
    const now = new Date();

    await db
      .insert(agentConfig)
      .values({
        agentId,
        enabled: values.enabled ?? true,
        model: values.model ?? null,
        temperature: values.temperature ?? null,
        maxSteps: values.maxSteps ?? null,
        tools: values.tools ?? null,
        rateLimit: values.rateLimit ?? null,
        mcpEndpoint: values.mcpEndpoint ?? null,
        updatedById: admin.userId,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: agentConfig.agentId,
        set: {
          ...(values.enabled === undefined ? {} : { enabled: values.enabled }),
          ...(values.model === undefined ? {} : { model: values.model }),
          ...(values.temperature === undefined
            ? {}
            : { temperature: values.temperature }),
          ...(values.maxSteps === undefined
            ? {}
            : { maxSteps: values.maxSteps }),
          ...(values.tools === undefined ? {} : { tools: values.tools }),
          ...(values.rateLimit === undefined
            ? {}
            : { rateLimit: values.rateLimit }),
          ...(values.mcpEndpoint === undefined
            ? {}
            : { mcpEndpoint: values.mcpEndpoint }),
          updatedById: admin.userId,
          updatedAt: now,
        },
      });

    // Without this the change would take up to the cache TTL to appear.
    invalidateAgentConfig(agentId);

    console.log(
      `[admin/agents] ${admin.email} updated ${agentId}: ${Object.keys(values).join(", ")}`
    );

    return Response.json(await readAgents());
  } catch (error) {
    console.error(`[admin/agents] save failed for ${agentId}:`, error);
    return Response.json(
      { error: "Не удалось сохранить", detail: errorMessage(error) },
      { status: 500 }
    );
  }
}

/** DELETE /api/admin/agents?agentId=… — drop overrides, back to code. */
export async function DELETE(request: Request) {
  const admin = await requireAdmin();

  if (!admin) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  const agentId = new URL(request.url).searchParams.get("agentId");

  if (!agentId) {
    return Response.json({ error: "Не указан агент" }, { status: 400 });
  }

  try {
    await db.delete(agentConfig).where(eq(agentConfig.agentId, agentId));
    invalidateAgentConfig(agentId);

    console.log(`[admin/agents] ${admin.email} reset ${agentId} to code`);

    return Response.json(await readAgents());
  } catch (error) {
    console.error(`[admin/agents] reset failed for ${agentId}:`, error);
    return Response.json(
      { error: "Не удалось вернуть к коду", detail: errorMessage(error) },
      { status: 500 }
    );
  }
}
