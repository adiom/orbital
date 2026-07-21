import "server-only";

import { streamText } from "ai";
import { and, desc, eq, inArray } from "drizzle-orm";
import { auth } from "@/app/(auth)/auth";
import { streamAgentResponse } from "@/lib/ai/agents/base-streamer";
import { streamExternalMcpAgentResponse } from "@/lib/ai/agents/external-mcp-streamer";
import { detectMentionedAgents } from "@/lib/ai/agents/detector";
import { getAgentById } from "@/lib/ai/agents/registry";
import { isAiConfigured, myProvider } from "@/lib/ai/providers";
import { db } from "@/lib/db";
import { sfera, sferaMember, sferaMessage, user } from "@/lib/db/schema";
import { checkAvroraRateLimit } from "@/lib/redis/rate-limiter";

const ONBOARDING_AGENT_ID = "00000000-0000-0000-0000-000000000009";

type RouteContext = {
  params: Promise<{ id: string }>;
};

/**
 * POST /api/sfera/[id]/chat - Streaming chat endpoint for AI SDK Elements
 *
 * This endpoint handles:
 * 1. User message creation
 * 2. AI agent mention detection
 * 3. Streaming responses from mentioned agents
 *
 * Requirements: 8.1, 8.2
 */
export async function POST(request: Request, context: RouteContext) {
  // Auth check
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: sferaId } = await context.params;

  try {
    // Verify Sfera membership
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

    // Parse request body
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

    const { messages, parentMessageId } = body as {
      messages?: Array<{
        role: string;
        content: string;
        experimental_attachments?: Array<{
          name: string;
          url: string;
          contentType: string;
        }>;
      }>;
      parentMessageId?: string;
    };

    // Validate messages array
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return Response.json(
        { error: "Messages array is required" },
        { status: 400 }
      );
    }

    // Get last user message
    const lastMessage = messages[messages.length - 1];
    if (!lastMessage || lastMessage.role !== "user") {
      return Response.json(
        { error: "Last message must be from user" },
        { status: 400 }
      );
    }

    const content = lastMessage.content?.trim() || "";
    const attachments = lastMessage.experimental_attachments || [];

    // Require either content or attachments
    if (!content && attachments.length === 0) {
      return Response.json(
        { error: "Content or attachments are required" },
        { status: 400 }
      );
    }

    // Save user message to database
    const [userMessage] = await db
      .insert(sferaMessage)
      .values({
        sferaId,
        userId: session.user.id,
        content,
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

    console.log("📝 User message created:", {
      messageId: userMessage.id,
      sferaId,
      userId: session.user.id,
    });

    // Update Sfera's updatedAt
    await db
      .update(sfera)
      .set({ updatedAt: new Date() })
      .where(eq(sfera.id, sferaId));

    // Detect mentioned AI agents
    let mentionedAgents = detectMentionedAgents(content);

    // Auto-add onboarding agent if this is an onboarding sfera
    // (onboarding agent is a member of the sfera)
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

    if (mentionedAgents.length === 0) {
      // No AI agents mentioned, return empty response
      console.log("ℹ️ No AI agents mentioned in message");
      return Response.json(
        {
          message: userMessage,
          agentMessages: [],
        },
        { status: 201 }
      );
    }

    console.log(
      `🔔 ${mentionedAgents.length} agent(s) mentioned:`,
      mentionedAgents.map((a) => a.name)
    );

    // AI provider must be configured before we create agent messages / stream.
    // Without it, myProvider.languageModel(...) throws deep inside streaming and
    // the error leaks into a chat message. Fail fast with a clear 503 instead.
    if (!isAiConfigured()) {
      console.warn("[chat] AI not configured — rejecting agent request");
      return Response.json(
        {
          message: userMessage,
          agentMessages: [],
          error:
            "Avrora сейчас недоступна: AI-провайдер не настроен. Сообщение сохранено.",
        },
        { status: 503 }
      );
    }

    // Track agent messages for response
    const agentMessages: Array<{ agentId: string; messageId: string }> = [];

    // Batch: check rate limit once per user/sfera pair
    const agentsWithRateLimit = mentionedAgents.filter((a) => a.rateLimit);
    if (agentsWithRateLimit.length > 0) {
      const rateLimitResult = await checkAvroraRateLimit(
        session.user.id,
        sferaId
      );
      if (!rateLimitResult.allowed) {
        for (const agent of agentsWithRateLimit) {
          await db.insert(sferaMessage).values({
            sferaId,
            userId: agent.userId,
            content: `⏱️ Слишком много запросов. ${rateLimitResult.error}\n\nПожалуйста, подождите немного перед следующим обращением.`,
            parentMessageId: userMessage.id,
            isForked: false,
            forkCount: 0,
            isGenerating: false,
            createdAt: new Date(),
            updatedAt: new Date(),
          });
        }
        mentionedAgents = mentionedAgents.filter((a) => !a.rateLimit);
      }
    }

    // Batch: ensure all agent users exist
    const agentUserIds = mentionedAgents.map((a) => a.userId);
    if (agentUserIds.length > 0) {
      const existingUsers = await db
        .select({ id: user.id })
        .from(user)
        .where(inArray(user.id, agentUserIds));
      const existingUserIds = new Set(existingUsers.map((u) => u.id));

      const usersToCreate = mentionedAgents
        .filter((a) => !existingUserIds.has(a.userId))
        .map((a) => ({ id: a.userId, email: a.email }));

      if (usersToCreate.length > 0) {
        await db.insert(user).values(usersToCreate);
      }
    }

    // Batch: ensure all agents are members
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

    // Create empty messages for each agent (batch insert)
    const agentMessageInserts = mentionedAgents.map((agent) => ({
      sferaId,
      userId: agent.userId,
      content: "",
      parentMessageId: userMessage.id,
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

      // Start streaming in background (don't await)
      setTimeout(async () => {
        try {
          console.log(`🤖 Starting ${agent.name} response generation...`);
          const agentContext = {
            sferaId,
            triggerMessageId: userMessage.id,
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

    // For AI SDK Elements compatibility, we need to return a streaming response
    // for the first agent if any agents were mentioned
    if (agentMessages.length > 0) {
      const firstAgent = mentionedAgents[0];

      // Get Sfera details for context
      const [sferaData] = await db
        .select()
        .from(sfera)
        .where(eq(sfera.id, sferaId))
        .limit(1);

      // Get recent messages for context
      const recentMessages = await db
        .select({
          id: sferaMessage.id,
          content: sferaMessage.content,
          userId: sferaMessage.userId,
          userEmail: user.email,
          createdAt: sferaMessage.createdAt,
        })
        .from(sferaMessage)
        .innerJoin(user, eq(sferaMessage.userId, user.id))
        .where(eq(sferaMessage.sferaId, sferaId))
        .orderBy(desc(sferaMessage.createdAt))
        .limit(10);

      const contextMessages = recentMessages.reverse();

      // Build conversation context
      const conversationContext = contextMessages
        .map((msg) => `${msg.userEmail}: ${msg.content}`)
        .join("\n\n");

      // Build system prompt
      const systemPrompt = firstAgent.buildSystemPrompt({
        sfera: {
          title: sferaData?.title || "Untitled Sfera",
          description: sferaData?.description || "",
        },
        userName: session.user.email?.split("@")[0] || "User",
      });

      // Stream response using AI SDK
      const model = myProvider.languageModel(firstAgent.model);
      const result = streamText({
        model,
        system: systemPrompt,
        prompt: `Context of recent discussion:
${conversationContext}

Respond to the message from ${session.user.email}:
${content}`,
        temperature: firstAgent.temperature ?? 0.7,
        tools: firstAgent.tools,
      });

      // Return streaming response compatible with AI SDK Elements
      return result.toTextStreamResponse();
    }

    // No agents mentioned, return success
    return Response.json(
      {
        message: userMessage,
        agentMessages: [],
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Failed to process chat message:", error);
    return Response.json(
      {
        error: "Failed to process message",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
