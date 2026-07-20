import { and, eq, inArray } from "drizzle-orm";
import { auth } from "@/app/(auth)/auth";
import { streamAgentResponse } from "@/lib/ai/agents/base-streamer";
import { streamExternalMcpAgentResponse } from "@/lib/ai/agents/external-mcp-streamer";
import { detectMentionedAgents } from "@/lib/ai/agents/detector";
import { getAgentById } from "@/lib/ai/agents/registry";
import { db } from "@/lib/db";
import { sfera, sferaMember, sferaMessage, user } from "@/lib/db/schema";
import { checkAvroraRateLimit } from "@/lib/redis/rate-limiter";

const ONBOARDING_AGENT_ID = "00000000-0000-0000-0000-000000000009";

const PROACTIVE_AVRORA_COOLDOWN_MS = 10 * 60 * 1000;

type RouteContext = {
  params: Promise<{ id: string }>;
};

async function shouldTriggerProactiveAvrora({
  content,
  sferaId,
}: {
  content: string;
  sferaId: string;
}) {
  const trimmedContent = content.trim();

  if (trimmedContent.length < 40) {
    return false;
  }

  const lowerContent = trimmedContent.toLowerCase();
  const looksLikePromptForHelp =
    trimmedContent.includes("?") ||
    trimmedContent.length > 180 ||
    ["как", "почему", "зачем", "что если", "идея", "план", "может", "нужно"].some(
      (token) => lowerContent.includes(token),
    );

  if (!looksLikePromptForHelp) {
    return false;
  }

  const avroraAgent = getAgentById("avrora");
  if (!avroraAgent) {
    return false;
  }

  const recentMessages = await db
    .select({
      id: sferaMessage.id,
      userId: sferaMessage.userId,
      createdAt: sferaMessage.createdAt,
    })
    .from(sferaMessage)
    .where(eq(sferaMessage.sferaId, sferaId))
    .orderBy(sferaMessage.createdAt)
    .limit(12);

  const lastAvroraMessage = [...recentMessages]
    .reverse()
    .find((message) => message.userId === avroraAgent.userId);

  if (
    lastAvroraMessage &&
    Date.now() - new Date(lastAvroraMessage.createdAt).getTime() < PROACTIVE_AVRORA_COOLDOWN_MS
  ) {
    return false;
  }

  const recentHumanMessages = [...recentMessages]
    .reverse()
    .filter((message) => message.userId !== avroraAgent.userId)
    .slice(0, 3);

  return recentHumanMessages.length >= 2;
}

// POST /api/sfera/[id]/messages - Create new message in Sfera
export async function POST(request: Request, context: RouteContext) {
  const session = await auth();

  if (!session || !session.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: sferaId } = await context.params;

  try {
    // Check membership
    const [membership] = await db
      .select()
      .from(sferaMember)
      .where(
        and(
          eq(sferaMember.sferaId, sferaId),
          eq(sferaMember.userId, session.user.id)
        )
      )
      .limit(1);

    if (!membership) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch (error) {
      if (error instanceof SyntaxError) {
        return Response.json(
          { error: "Invalid JSON payload" },
          { status: 400 }
        );
      }
      throw error;
    }

    if (!body || typeof body !== "object") {
      return Response.json(
        { error: "Request body must be a JSON object" },
        { status: 400 }
      );
    }

    const {
      content,
      parentMessageId,
      attachments = [],
    } = body as {
      content?: string;
      parentMessageId?: string;
      attachments?: unknown[];
    };

    // Require either content or attachments
    if (
      (!content || content.trim() === "") &&
      (!attachments || attachments.length === 0)
    ) {
      return Response.json(
        { error: "Content or attachments are required" },
        { status: 400 }
      );
    }

    // Create message
    const [newMessage] = await db
      .insert(sferaMessage)
      .values({
        sferaId,
        userId: session.user.id,
        content: content?.trim() || "",
        parentMessageId: parentMessageId || null,
        attachments: attachments as Array<{
          name: string;
          url: string;
          contentType: string;
        }>,
        isForked: false,
        forkCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    // Update Sfera's updatedAt
    await db
      .update(sfera)
      .set({ updatedAt: new Date() })
      .where(eq(sfera.id, sferaId));

    // Detect all mentioned AI agents
    let mentionedAgents = detectMentionedAgents(content || "");

    // Auto-add onboarding agent if this is an onboarding sfera
    const [onboardingMembership] = await db
      .select()
      .from(sferaMember)
      .where(
        and(
          eq(sferaMember.sferaId, sferaId),
          eq(sferaMember.userId, ONBOARDING_AGENT_ID)
        )
      )
      .limit(1);

    if (onboardingMembership) {
      const onboardingAgent = getAgentById("onboarding");
      if (onboardingAgent && !mentionedAgents.some((a) => a.id === "onboarding")) {
        mentionedAgents.push(onboardingAgent);
      }
    }

    if (
      mentionedAgents.length === 0 &&
      content &&
      (await shouldTriggerProactiveAvrora({
        content,
        sferaId,
      }))
    ) {
      const avroraAgent = getAgentById("avrora");
      if (avroraAgent) {
        mentionedAgents.push(avroraAgent);
      }
    }

    // Track agent messages for response
    const agentMessages: Array<{ agentId: string; messageId: string }> = [];

    if (mentionedAgents.length > 0) {
      console.log(
        `🔔 ${mentionedAgents.length} agent(s) mentioned:`,
        mentionedAgents.map((a) => a.name)
      );

      // Batch: check rate limit once per user/sfera pair (not per agent)
      const agentsWithRateLimit = mentionedAgents.filter((a) => a.rateLimit);
      if (agentsWithRateLimit.length > 0) {
        const rateLimitResult = await checkAvroraRateLimit(
          session.user.id,
          sferaId
        );
        if (!rateLimitResult.allowed) {
          // All rate-limited agents get a rate limit message
          for (const agent of agentsWithRateLimit) {
            await db.insert(sferaMessage).values({
              sferaId,
              userId: agent.userId,
              content: `⏱️ Слишком много запросов. ${rateLimitResult.error}\n\nПожалуйста, подождите немного перед следующим обращением.`,
              parentMessageId: newMessage.id,
              isForked: false,
              forkCount: 0,
              isGenerating: false,
              createdAt: new Date(),
              updatedAt: new Date(),
            });
          }
          // Remove rate-limited agents from processing
          mentionedAgents = mentionedAgents.filter((a) => !a.rateLimit);
        }
      }

      // Batch: ensure all agent users exist in one query
      const agentUserIds = mentionedAgents.map((a) => a.userId);
      if (agentUserIds.length > 0) {
        const existingUsers = await db
          .select({ id: user.id })
          .from(user)
          .where(inArray(user.id, agentUserIds));
        const existingUserIds = new Set(existingUsers.map((u) => u.id));

        const usersToCreate = mentionedAgents
          .filter((a) => !existingUserIds.has(a.userId))
          .map((a) => ({
            id: a.userId,
            email: a.email,
          }));

        if (usersToCreate.length > 0) {
          await db.insert(user).values(usersToCreate);
        }
      }

      // Batch: ensure all agents are members of the Sfera in one query
      const existingMemberships = await db
        .select({ userId: sferaMember.userId })
        .from(sferaMember)
        .where(
          and(
            eq(sferaMember.sferaId, sferaId),
            inArray(sferaMember.userId, agentUserIds)
          )
        );
      const existingMemberIds = new Set(
        existingMemberships.map((m) => m.userId)
      );

      const membershipsToCreate = mentionedAgents
        .filter((a) => !existingMemberIds.has(a.userId))
        .map((a) => ({
          sferaId,
          userId: a.userId,
          role: "member" as const,
          joinedAt: new Date(),
        }));

      if (membershipsToCreate.length > 0) {
        await db.insert(sferaMember).values(membershipsToCreate);
      }

      // Create empty messages for each agent
      const agentMessageInserts = mentionedAgents.map((agent) => ({
        sferaId,
        userId: agent.userId,
        content: "",
        parentMessageId: newMessage.id,
        isForked: false,
        forkCount: 0,
        isGenerating: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      }));

      const insertedAgentMessages = await db
        .insert(sferaMessage)
        .values(agentMessageInserts)
        .returning();

      for (let i = 0; i < insertedAgentMessages.length; i++) {
        agentMessages.push({
          agentId: mentionedAgents[i].id,
          messageId: insertedAgentMessages[i].id,
        });
        console.log(`📝 Created empty message for ${mentionedAgents[i].name}:`, {
          messageId: insertedAgentMessages[i].id,
          sferaId,
        });
      }

      // Start streaming responses for all agents asynchronously
      for (const { agentId, messageId } of agentMessages) {
        const agent = mentionedAgents.find((a) => a.id === agentId);
        if (!agent) {
          continue;
        }

        setTimeout(async () => {
          try {
            console.log(`🤖 Starting ${agent.name} response generation...`);
            const agentContext = {
              sferaId,
              triggerMessageId: newMessage.id,
              targetMessageId: messageId,
              requestingUserId: session.user.id,
              agent,
            };
            if (agent.runtime === "external-mcp") {
              await streamExternalMcpAgentResponse(agentContext);
            } else {
              await streamAgentResponse(agentContext);
            }
            console.log(`✅ ${agent.name} finished streaming`);
          } catch (error) {
            console.error(`❌ ${agent.name} streaming failed:`, error);
          }
        }, 0);
      }
    }

    return Response.json(
      {
        message: newMessage,
        agentMessages: agentMessages.map((am) => ({
          agentId: am.agentId,
          messageId: am.messageId,
        })),
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Failed to create message:", error);
    return Response.json(
      { error: "Failed to create message" },
      { status: 500 }
    );
  }
}
