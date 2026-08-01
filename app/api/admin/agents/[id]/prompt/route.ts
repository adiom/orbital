import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin/access";
import { errorMessage } from "@/lib/admin/probe";
import { getAgentById } from "@/lib/ai/agents/registry";
import { invalidateAgentConfig } from "@/lib/ai/agents/resolve";
import { db } from "@/lib/db";
import { agentPromptVersion, user } from "@/lib/db/schema";

export const dynamic = "force-dynamic";

const HISTORY_LIMIT = 30;

type RouteContext = {
  params: Promise<{ id: string }>;
};

const saveSchema = z.object({
  prompt: z.string().min(1).max(50_000),
  /** Why it changed, in the operator's words. */
  note: z.string().max(500).nullish(),
});

/**
 * The prompt the agent would use with no override, for the diff and for
 * "back to code". Built with a placeholder context so the text reads the way
 * an operator will edit it — see fillPlaceholders in resolve.ts.
 */
function codePrompt(agentId: string): string | null {
  const agent = getAgentById(agentId);

  if (!agent?.buildSystemPrompt) {
    return null;
  }

  try {
    return agent.buildSystemPrompt({
      sfera: { title: "{sferaTitle}", description: null },
      userName: "{userName}",
      requestingUserId: "{requestingUserId}",
    });
  } catch (error) {
    console.error(`[admin/prompt] could not build code prompt for ${agentId}:`, error);
    return null;
  }
}

/** GET /api/admin/agents/[id]/prompt — every version, newest first. */
export async function GET(_request: Request, context: RouteContext) {
  const admin = await requireAdmin();

  if (!admin) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  const { id } = await context.params;

  if (!getAgentById(id)) {
    return Response.json({ error: "Такого агента нет" }, { status: 404 });
  }

  try {
    const versions = await db
      .select({
        version: agentPromptVersion.version,
        prompt: agentPromptVersion.prompt,
        note: agentPromptVersion.note,
        createdAt: agentPromptVersion.createdAt,
        authorEmail: user.email,
      })
      .from(agentPromptVersion)
      .leftJoin(user, eq(agentPromptVersion.authorId, user.id))
      .where(eq(agentPromptVersion.agentId, id))
      .orderBy(desc(agentPromptVersion.version))
      .limit(HISTORY_LIMIT);

    return Response.json({
      agentId: id,
      /** Null when the agent builds its prompt from context it cannot fake. */
      code: codePrompt(id),
      versions,
    });
  } catch (error) {
    console.error(`[admin/prompt] read failed for ${id}:`, error);
    return Response.json(
      { error: "Не удалось прочитать историю", detail: errorMessage(error) },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/agents/[id]/prompt — append a version.
 *
 * Prompts are never overwritten. A bad edit changes how the product talks to
 * everyone and the damage is invisible until someone reads a conversation, so
 * every save appends and the previous text stays readable.
 *
 * Rolling back is the same operation: post the old text as a new version.
 */
export async function POST(request: Request, context: RouteContext) {
  const admin = await requireAdmin();

  if (!admin) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  const { id } = await context.params;

  if (!getAgentById(id)) {
    return Response.json({ error: "Такого агента нет" }, { status: 404 });
  }

  let parsed: z.infer<typeof saveSchema>;

  try {
    parsed = saveSchema.parse(await request.json());
  } catch (error) {
    return Response.json(
      {
        error: "Промпт не принят",
        detail:
          error instanceof z.ZodError
            ? error.errors.map((e) => e.message).join(", ")
            : errorMessage(error),
      },
      { status: 400 }
    );
  }

  try {
    // The unique (agentId, version) constraint is what actually guarantees
    // ordering: two operators saving at once collide instead of interleaving.
    const saved = await db.transaction(async (tx) => {
      const [latest] = await tx
        .select({ version: agentPromptVersion.version, prompt: agentPromptVersion.prompt })
        .from(agentPromptVersion)
        .where(eq(agentPromptVersion.agentId, id))
        .orderBy(desc(agentPromptVersion.version))
        .limit(1);

      // Saving identical text would add a version that explains nothing.
      if (latest?.prompt === parsed.prompt) {
        return { version: latest.version, unchanged: true };
      }

      const [row] = await tx
        .insert(agentPromptVersion)
        .values({
          agentId: id,
          version: (latest?.version ?? 0) + 1,
          prompt: parsed.prompt,
          note: parsed.note ?? null,
          authorId: admin.userId,
        })
        .returning({ version: agentPromptVersion.version });

      return { version: row.version, unchanged: false };
    });

    invalidateAgentConfig(id);

    console.log(
      `[admin/prompt] ${admin.email} ${saved.unchanged ? "kept" : "saved"} ${id} v${saved.version}`
    );

    return Response.json(saved);
  } catch (error) {
    console.error(`[admin/prompt] save failed for ${id}:`, error);
    return Response.json(
      { error: "Не удалось сохранить промпт", detail: errorMessage(error) },
      { status: 500 }
    );
  }
}

/** DELETE /api/admin/agents/[id]/prompt — drop every version, back to code. */
export async function DELETE(_request: Request, context: RouteContext) {
  const admin = await requireAdmin();

  if (!admin) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  const { id } = await context.params;

  try {
    const removed = await db
      .delete(agentPromptVersion)
      .where(eq(agentPromptVersion.agentId, id))
      .returning({ version: agentPromptVersion.version });

    invalidateAgentConfig(id);

    console.warn(
      `[admin/prompt] ${admin.email} dropped ${removed.length} versions of ${id}`
    );

    return Response.json({ removed: removed.length });
  } catch (error) {
    console.error(`[admin/prompt] reset failed for ${id}:`, error);
    return Response.json(
      { error: "Не удалось вернуть к коду", detail: errorMessage(error) },
      { status: 500 }
    );
  }
}
