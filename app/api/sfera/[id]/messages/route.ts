import { and, eq } from "drizzle-orm";
import { auth } from "@/app/(auth)/auth";
import { streamAgentResponse } from "@/lib/ai/agents/base-streamer";
import { detectMentionedAgents } from "@/lib/ai/agents/detector";
import { db } from "@/lib/db";
import { sfera, sferaMember, sferaMessage, user } from "@/lib/db/schema";
import { checkAvroraRateLimit } from "@/lib/redis/rate-limiter";

type RouteContext = {
  params: Promise<{ id: string }>;
};

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
    const mentionedAgents = detectMentionedAgents(content || "");

    // Track agent messages for response
    const agentMessages: Array<{ agentId: string; messageId: string }> = [];

    if (mentionedAgents.length > 0) {
      console.log(
        `🔔 ${mentionedAgents.length} agent(s) mentioned:`,
        mentionedAgents.map((a) => a.name)
      );

      // Create empty messages for each agent
      for (const agent of mentionedAgents) {
        // Check rate limit (only for agents with rate limits)
        if (agent.rateLimit) {
          const rateLimitResult = await checkAvroraRateLimit(
            session.user.id,
            sferaId
          );

          if (!rateLimitResult.allowed) {
            console.warn(`⚠️ Rate limit exceeded for ${agent.name}:`, {
              userId: session.user.id,
              sferaId,
              error: rateLimitResult.error,
            });

            // Post rate limit message
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

            continue; // Skip this agent
          }
        }

        // Ensure agent user exists
        const [agentUser] = await db
          .select()
          .from(user)
          .where(eq(user.id, agent.userId))
          .limit(1);

        if (!agentUser) {
          console.log(`➕ Creating user for ${agent.name}...`);
          await db.insert(user).values({
            id: agent.userId,
            email: agent.email,
          });
        }

        // Ensure agent is member of Sfera
        const [agentMembership] = await db
          .select()
          .from(sferaMember)
          .where(
            and(
              eq(sferaMember.sferaId, sferaId),
              eq(sferaMember.userId, agent.userId)
            )
          )
          .limit(1);

        if (!agentMembership) {
          console.log(`➕ Adding ${agent.name} to Sfera...`);
          await db.insert(sferaMember).values({
            sferaId,
            userId: agent.userId,
            role: "member",
            joinedAt: new Date(),
          });
        }

        // Create empty message for agent (will be filled by streaming)
        const [agentMessage] = await db
          .insert(sferaMessage)
          .values({
            sferaId,
            userId: agent.userId,
            content: "", // Empty initially
            parentMessageId: newMessage.id,
            isForked: false,
            forkCount: 0,
            isGenerating: true, // Mark as generating
            createdAt: new Date(),
            updatedAt: new Date(),
          })
          .returning();

        agentMessages.push({
          agentId: agent.id,
          messageId: agentMessage.id,
        });

        console.log(`📝 Created empty message for ${agent.name}:`, {
          messageId: agentMessage.id,
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
            await streamAgentResponse({
              sferaId,
              triggerMessageId: newMessage.id,
              targetMessageId: messageId,
              requestingUserId: session.user.id,
              agent,
            });
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
