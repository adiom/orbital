import "server-only";

import {
  createUIMessageStream,
  createUIMessageStreamResponse,
} from "ai";
import { and, eq, inArray } from "drizzle-orm";
import { auth } from "@/app/(auth)/auth";
import { streamAgentResponse } from "@/lib/ai/agents/base-streamer";
import { streamExternalMcpAgentResponse } from "@/lib/ai/agents/external-mcp-streamer";
import { detectMentionedAgents } from "@/lib/ai/agents/detector";
import { getAgentById } from "@/lib/ai/agents/registry";
import type { AgentResponseEvent } from "@/lib/ai/agents/types";
import { isAiConfigured } from "@/lib/ai/providers";
import type { OrbitUIMessage } from "@/lib/ai/orbit-ui-message";
import { db } from "@/lib/db";
import { sfera, sferaMember, sferaMessage, user } from "@/lib/db/schema";
import { checkAvroraRateLimit } from "@/lib/redis/rate-limiter";

const ONBOARDING_AGENT_ID = "00000000-0000-0000-0000-000000000009";
const PROACTIVE_AVRORA_COOLDOWN_MS = 10 * 60 * 1000;

type RouteContext = { params: Promise<{ id: string }> };

function getLastUserMessage(messages: OrbitUIMessage[]) {
  return [...messages].reverse().find((message) => message.role === "user");
}

function getMessageText(message: OrbitUIMessage | undefined) {
  return (message?.parts ?? [])
    .filter((part) => part.type === "text")
    .map((part) => part.text)
    .join("\n")
    .trim();
}

async function shouldTriggerProactiveAvrora({
  content,
  sferaId,
}: {
  content: string;
  sferaId: string;
}) {
  const trimmedContent = content.trim();
  if (trimmedContent.length < 40) return false;

  const lowerContent = trimmedContent.toLowerCase();
  const looksLikePromptForHelp =
    trimmedContent.includes("?") ||
    trimmedContent.length > 180 ||
    ["как", "почему", "зачем", "что если", "идея", "план", "может", "нужно"].some(
      (token) => lowerContent.includes(token),
    );
  if (!looksLikePromptForHelp) return false;

  const avroraAgent = getAgentById("avrora");
  if (!avroraAgent) return false;

  const recentMessages = await db
    .select({ userId: sferaMessage.userId, createdAt: sferaMessage.createdAt })
    .from(sferaMessage)
    .where(eq(sferaMessage.sferaId, sferaId))
    .orderBy(sferaMessage.createdAt)
    .limit(12);

  const lastAvroraMessage = [...recentMessages]
    .reverse()
    .find((message) => message.userId === avroraAgent.userId);
  if (
    lastAvroraMessage &&
    Date.now() - new Date(lastAvroraMessage.createdAt).getTime() <
      PROACTIVE_AVRORA_COOLDOWN_MS
  ) {
    return false;
  }

  const recentHumanMessages = [...recentMessages]
    .reverse()
    .filter((message) => message.userId !== avroraAgent.userId)
    .slice(0, 3);
  return recentHumanMessages.length >= 2;
}

export async function POST(request: Request, context: RouteContext) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: sferaId } = await context.params;
  const [membership] = await db
    .select()
    .from(sferaMember)
    .where(
      and(
        eq(sferaMember.sferaId, sferaId),
        eq(sferaMember.userId, session.user.id),
      ),
    )
    .limit(1);
  if (!membership) return Response.json({ error: "Forbidden" }, { status: 403 });

  let body: {
    messages?: OrbitUIMessage[];
    attachments?: unknown[];
    parentMessageId?: string | null;
    clientMessageId?: string;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return Response.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const requestMessages = Array.isArray(body.messages) ? body.messages : [];
  const userMessageUi = getLastUserMessage(requestMessages);
  const content = getMessageText(userMessageUi);
  if (!userMessageUi || (!content && !body.attachments?.length)) {
    return Response.json({ error: "Content or attachments are required" }, { status: 400 });
  }

  const [sferaData] = await db.select().from(sfera).where(eq(sfera.id, sferaId)).limit(1);
  if (!sferaData) return Response.json({ error: "Sfera not found" }, { status: 404 });

  const mentionedAgents = detectMentionedAgents(content);
  const [onboardingMembership] = await db
    .select()
    .from(sferaMember)
    .where(
      and(
        eq(sferaMember.sferaId, sferaId),
        eq(sferaMember.userId, ONBOARDING_AGENT_ID),
      ),
    )
    .limit(1);
  if (onboardingMembership) {
    const onboardingAgent = getAgentById("onboarding");
    if (onboardingAgent && !mentionedAgents.some((agent) => agent.id === "onboarding")) {
      mentionedAgents.push(onboardingAgent);
    }
  }
  if (
    mentionedAgents.length === 0 &&
    content &&
    (await shouldTriggerProactiveAvrora({ content, sferaId }))
  ) {
    const avroraAgent = getAgentById("avrora");
    if (avroraAgent) mentionedAgents.push(avroraAgent);
  }

  if (
    mentionedAgents.some((agent) => agent.runtime !== "external-mcp") &&
    !isAiConfigured()
  ) {
    return Response.json(
      { error: "Avrora сейчас недоступна: AI-провайдер не настроен." },
      { status: 503 },
    );
  }

  const rateLimitedAgents = mentionedAgents.filter((agent) => agent.rateLimit);
  if (rateLimitedAgents.length > 0) {
    const rateLimitResult = await checkAvroraRateLimit(session.user.id, sferaId);
    if (!rateLimitResult.allowed) {
      return Response.json(
        { error: rateLimitResult.error || "Rate limit exceeded" },
        { status: 429 },
      );
    }
  }

  if (request.signal.aborted) {
    return new Response(null, { status: 499 });
  }

  const attachments = Array.isArray(body.attachments) ? body.attachments : [];
  const [userMessage] = await db
    .insert(sferaMessage)
    .values({
      sferaId,
      userId: session.user.id,
      content,
      parentMessageId: body.parentMessageId || null,
      attachments: attachments as never,
      isForked: false,
      forkCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .returning();

  const agentUserIds = mentionedAgents.map((agent) => agent.userId);
  if (agentUserIds.length > 0) {
    const existingUsers = await db
      .select({ id: user.id })
      .from(user)
      .where(inArray(user.id, agentUserIds));
    const existingUserIds = new Set(existingUsers.map((item) => item.id));
    const usersToCreate = mentionedAgents
      .filter((agent) => !existingUserIds.has(agent.userId))
      .map((agent) => ({ id: agent.userId, email: agent.email }));
    if (usersToCreate.length > 0) await db.insert(user).values(usersToCreate);

    const existingMemberships = await db
      .select({ userId: sferaMember.userId })
      .from(sferaMember)
      .where(and(eq(sferaMember.sferaId, sferaId), inArray(sferaMember.userId, agentUserIds)));
    const existingMemberIds = new Set(existingMemberships.map((item) => item.userId));
    const membershipsToCreate = mentionedAgents
      .filter((agent) => !existingMemberIds.has(agent.userId))
      .map((agent) => ({ sferaId, userId: agent.userId, role: "member" as const, joinedAt: new Date() }));
    if (membershipsToCreate.length > 0) await db.insert(sferaMember).values(membershipsToCreate);
  }

  const insertedAgentMessages =
    mentionedAgents.length > 0
      ? await db
          .insert(sferaMessage)
          .values(
            mentionedAgents.map((agent) => ({
              sferaId,
              userId: agent.userId,
              content: "",
              parentMessageId: userMessage.id,
              isForked: false,
              forkCount: 0,
              isGenerating: true,
              createdAt: new Date(),
              updatedAt: new Date(),
            })),
          )
          .returning()
      : [];

  await db.update(sfera).set({ updatedAt: new Date() }).where(eq(sfera.id, sferaId));

  const stream = createUIMessageStream<OrbitUIMessage>({
    originalMessages: requestMessages,
    execute: async ({ writer }) => {
      writer.write({
        type: "data-stream-init",
        transient: true,
        data: {
          clientMessageId: body.clientMessageId || userMessageUi.id,
          agentMessageIds: insertedAgentMessages.map((message) => message.id),
        },
      });
      writer.write({
        type: "data-user-message",
        id: userMessage.id,
        transient: true,
        data: {
          clientMessageId: body.clientMessageId || userMessageUi.id,
          message: {
            id: userMessage.id,
            content: userMessage.content,
            userId: userMessage.userId,
            userEmail: session.user.email || "user@orbital.local",
            parentMessageId: userMessage.parentMessageId,
            attachments: attachments as never,
            isForked: false,
            forkedSferaId: null,
            createdAt: userMessage.createdAt.toISOString(),
          },
        },
      });

      for (let index = 0; index < insertedAgentMessages.length; index++) {
        const targetMessage = insertedAgentMessages[index];
        const agent = mentionedAgents[index];
        writer.write({
          type: "data-agent-message",
          id: targetMessage.id,
          data: {
            messageId: targetMessage.id,
            agentId: agent.id,
            userId: agent.userId,
            userEmail: agent.email,
            parentMessageId: userMessage.id,
            content: "",
            phase: "started",
            sequence: -1,
            createdAt: targetMessage.createdAt.toISOString(),
          },
        });
      }

      await Promise.all(
        insertedAgentMessages.map((targetMessage, index) => {
          const agent = mentionedAgents[index];
          const onEvent = (event: AgentResponseEvent) => {
            writer.write({
              type: "data-agent-message",
              id: event.messageId,
              data: {
                messageId: event.messageId,
                agentId: event.agentId,
                userId: agent.userId,
                userEmail: agent.email,
                parentMessageId: userMessage.id,
                content: event.content,
                phase: event.phase,
                sequence: event.sequence,
                createdAt: targetMessage.createdAt.toISOString(),
                error: event.error,
                toolResults: event.toolResults as never,
              },
            });
          };

          const agentContext = {
            sferaId,
            triggerMessageId: userMessage.id,
            targetMessageId: targetMessage.id,
            requestingUserId: session.user.id,
            agent,
            abortSignal: request.signal,
            onEvent,
          };

          return agent.runtime === "external-mcp"
            ? streamExternalMcpAgentResponse(agentContext)
            : streamAgentResponse(agentContext);
        }),
      );
    },
    onError: (error) => {
      console.error("[ai-stream] UI stream failed:", error);
      return "AI response stream failed.";
    },
  });

  return createUIMessageStreamResponse({ stream });
}
