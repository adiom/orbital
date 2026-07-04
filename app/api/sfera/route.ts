import { and, count, desc, eq, inArray, sql } from "drizzle-orm";
import { auth } from "@/app/(auth)/auth";
import { detectMentionedAgents } from "@/lib/ai/agents/detector";
import { streamAgentResponse } from "@/lib/ai/agents/base-streamer";
import { db } from "@/lib/db";
import {
  sfera,
  sferaForkedSfera,
  sferaMember,
  sferaMessage,
  user,
} from "@/lib/db/schema";
import { checkAvroraRateLimit } from "@/lib/redis/rate-limiter";

// GET /api/sfera - List all Sferas for current user with fork relationships and activity
export async function GET(_request: Request) {
  const session = await auth();

  if (!session || !session.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const userSferas = await db
      .select({
        id: sfera.id,
        title: sfera.title,
        description: sfera.description,
        ownerId: sfera.ownerId,
        visibility: sfera.visibility,
        createdAt: sfera.createdAt,
        updatedAt: sfera.updatedAt,
        role: sferaMember.role,
      })
      .from(sfera)
      .innerJoin(sferaMember, eq(sfera.id, sferaMember.sferaId))
      .where(eq(sferaMember.userId, session.user.id))
      .orderBy(desc(sfera.updatedAt));

    const sferaIds = userSferas.map((s) => s.id);

    let forkRelationships: {
      parentSferaId: string;
      forkedSferaId: string;
      createdAt: Date;
    }[] = [];
    if (sferaIds.length > 0) {
      forkRelationships = await db
        .select({
          parentSferaId: sferaForkedSfera.parentSferaId,
          forkedSferaId: sferaForkedSfera.forkedSferaId,
          createdAt: sferaForkedSfera.createdAt,
        })
        .from(sferaForkedSfera)
        .where(
          and(
            inArray(sferaForkedSfera.parentSferaId, sferaIds),
            inArray(sferaForkedSfera.forkedSferaId, sferaIds)
          )
        );
    }

    // Activity data
    const messageCountsMap = new Map<string, number>();
    const lastMessageAtMap = new Map<string, Date | null>();
    const memberCountsMap = new Map<string, number>();
    const participantsMap = new Map<
      string,
      Array<{ id: string; name: string; image: string | null }>
    >();

    if (sferaIds.length > 0) {
      const messageStats = await db
        .select({
          sferaId: sferaMessage.sferaId,
          messageCount: count(),
          lastMessageAt: sql<Date>`max(${sferaMessage.createdAt})`,
        })
        .from(sferaMessage)
        .where(inArray(sferaMessage.sferaId, sferaIds))
        .groupBy(sferaMessage.sferaId);

      for (const row of messageStats) {
        messageCountsMap.set(row.sferaId, row.messageCount);
        lastMessageAtMap.set(row.sferaId, row.lastMessageAt);
      }

      const memberStats = await db
        .select({
          sferaId: sferaMember.sferaId,
          memberCount: count(),
        })
        .from(sferaMember)
        .where(inArray(sferaMember.sferaId, sferaIds))
        .groupBy(sferaMember.sferaId);

      for (const row of memberStats) {
        memberCountsMap.set(row.sferaId, row.memberCount);
      }

      const recentAuthorRows = await db
        .select({
          sferaId: sferaMessage.sferaId,
          userId: sferaMessage.userId,
          userName: user.name,
          userAvatar: user.avatarUrl,
        })
        .from(sferaMessage)
        .innerJoin(user, eq(sferaMessage.userId, user.id))
        .where(inArray(sferaMessage.sferaId, sferaIds))
        .orderBy(desc(sferaMessage.createdAt))
        .limit(sferaIds.length * 3);

      for (const row of recentAuthorRows) {
        const existing = participantsMap.get(row.sferaId) || [];
        if (existing.length < 3 && !existing.some((p) => p.id === row.userId)) {
          existing.push({
            id: row.userId,
            name: row.userName || "Unknown",
            image: row.userAvatar,
          });
        }
        participantsMap.set(row.sferaId, existing);
      }
    }

    const sferasWithActivity = userSferas.map((sfera) => ({
      ...sfera,
      messageCount: messageCountsMap.get(sfera.id) || 0,
      memberCount: memberCountsMap.get(sfera.id) || 0,
      lastMessageAt: lastMessageAtMap.get(sfera.id) || null,
      recentParticipants: participantsMap.get(sfera.id) || [],
    }));

    return Response.json({
      sferas: sferasWithActivity,
      forkRelationships,
    });
  } catch (error) {
    console.error("Failed to fetch sferas:", error);
    return Response.json({ error: "Failed to fetch sferas" }, { status: 500 });
  }
}

// POST /api/sfera - Create new Sfera, optionally with first message
export async function POST(request: Request) {
  const session = await auth();

  if (!session || !session.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const {
      title,
      description,
      visibility = "private",
      content,
      attachments = [],
    } = body as {
      title?: string;
      description?: string;
      visibility?: string;
      content?: string;
      attachments?: Array<{ name: string; url: string; contentType: string }>;
    };

    const DEFAULT_MEMBER_EMAIL = "avrora@avrora.click";
    const orbitTitle =
      title || `Orbit ${Math.floor(1000 + Math.random() * 9000)}`;

    const users = await db
      .select({ id: user.id })
      .from(user)
      .where(inArray(user.email, [DEFAULT_MEMBER_EMAIL]));

    const avroraUserId = users[0]?.id;

    const [newSfera] = await db
      .insert(sfera)
      .values({
        title: orbitTitle,
        description: description || null,
        ownerId: session.user.id,
        visibility: (visibility as "public" | "private" | "dao") || "private",
      })
      .returning();

    await db.insert(sferaMember).values({
      sferaId: newSfera.id,
      userId: session.user.id,
      role: "owner",
      joinedAt: new Date(),
    });

    if (avroraUserId && avroraUserId !== session.user.id) {
      await db.insert(sferaMember).values({
        sferaId: newSfera.id,
        userId: avroraUserId,
        role: "member",
        joinedAt: new Date(),
      });
    }

    // If first message content is provided, create it and trigger AI agents
    let firstMessage: unknown = null;
    let agentMessages: Array<{ agentId: string; messageId: string }> = [];

    const hasContent = content && content.trim().length > 0;
    const hasAttachments = attachments && attachments.length > 0;

    if (hasContent || hasAttachments) {
      const [message] = await db
        .insert(sferaMessage)
        .values({
          sferaId: newSfera.id,
          userId: session.user.id,
          content: content?.trim() || "",
          parentMessageId: null,
          attachments,
          isForked: false,
          forkCount: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();

      firstMessage = message;

      // Detect and trigger AI agents
      if (hasContent) {
        const mentionedAgents = detectMentionedAgents(content);

        for (const agent of mentionedAgents) {
          // Rate limit check
          if (agent.rateLimit) {
            const rateLimitResult = await checkAvroraRateLimit(
              session.user.id,
              newSfera.id
            );
            if (!rateLimitResult.allowed) continue;
          }

          // Ensure agent user exists
          const [agentUser] = await db
            .select()
            .from(user)
            .where(eq(user.id, agent.userId))
            .limit(1);

          if (!agentUser) {
            await db.insert(user).values({
              id: agent.userId,
              email: agent.email,
            });
          }

          // Ensure agent is member
          const [agentMembership] = await db
            .select()
            .from(sferaMember)
            .where(
              and(
                eq(sferaMember.sferaId, newSfera.id),
                eq(sferaMember.userId, agent.userId)
              )
            )
            .limit(1);

          if (!agentMembership) {
            await db.insert(sferaMember).values({
              sferaId: newSfera.id,
              userId: agent.userId,
              role: "member",
              joinedAt: new Date(),
            });
          }

          // Create empty agent message
          const [agentMessage] = await db
            .insert(sferaMessage)
            .values({
              sferaId: newSfera.id,
              userId: agent.userId,
              content: "",
              parentMessageId: message.id,
              isForked: false,
              forkCount: 0,
              isGenerating: true,
              createdAt: new Date(),
              updatedAt: new Date(),
            })
            .returning();

          agentMessages.push({
            agentId: agent.id,
            messageId: agentMessage.id,
          });

          // Stream agent response in background (fire-and-forget)
          setTimeout(async () => {
            try {
              const agentContext = {
                sferaId: newSfera.id,
                triggerMessageId: message.id,
                targetMessageId: agentMessage.id,
                requestingUserId: session.user.id,
                agent,
              };
              if (agent.runtime === "external-mcp") {
                const { streamExternalMcpAgentResponse } = await import(
                  "@/lib/ai/agents/external-mcp-streamer"
                );
                await streamExternalMcpAgentResponse(agentContext);
              } else {
                await streamAgentResponse(agentContext);
              }
            } catch (err) {
              console.error(`Agent ${agent.name} streaming failed:`, err);
            }
          }, 0);
        }
      }

      // Update orbit's updatedAt
      await db
        .update(sfera)
        .set({ updatedAt: new Date() })
        .where(eq(sfera.id, newSfera.id));
    }

    return Response.json(
      {
        sfera: newSfera,
        message: firstMessage,
        agentMessages,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Failed to create sfera:", error);
    return Response.json({ error: "Failed to create sfera" }, { status: 500 });
  }
}
