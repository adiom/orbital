import "server-only";

import { streamText, type UIMessage } from "ai";
import { and, desc, eq } from "drizzle-orm";
import { auth } from "@/app/(auth)/auth";
import { getAgentById } from "@/lib/ai/agents/registry";
import { logAiUsage } from "@/lib/ai/usage-logger";
import { isAiConfigured, myProvider } from "@/lib/ai/providers";
import { db } from "@/lib/db";
import { sfera, sferaMember, sferaMessage, user } from "@/lib/db/schema";
import { checkAvroraRateLimit } from "@/lib/redis/rate-limiter";

/**
 * Tools that require user approval before execution
 */
const TOOLS_REQUIRING_APPROVAL = [
  "createMiniApp",
  "editMiniApp",
  "createChart",
  "createGame",
  "generateImage",
  "generateVideo",
  "generateMusic",
  "createDocument",
  "updateDocument",
];

type RouteContext = {
  params: Promise<{ id: string }>;
};

function estimateTokens(text: string) {
  return Math.ceil(text.length / 4);
}

function selectSmartContext(
  messages: Array<{
    id: string;
    content: string;
    userEmail: string;
    createdAt: Date;
  }>,
) {
  const targetTokens = 2000;
  const recentCount = 8;

  if (messages.length === 0) {
    return [];
  }

  const selected = messages.slice(-recentCount);
  const selectedIds = new Set(selected.map((message) => message.id));
  let currentTokens = selected.reduce(
    (sum, message) => sum + estimateTokens(`${message.userEmail}: ${message.content}`),
    0,
  );

  for (let i = messages.length - recentCount - 1; i >= 0; i--) {
    const message = messages[i];
    if (selectedIds.has(message.id)) {
      continue;
    }

    const messageTokens = estimateTokens(`${message.userEmail}: ${message.content}`);
    if (currentTokens + messageTokens > targetTokens) {
      continue;
    }

    selected.push(message);
    selectedIds.add(message.id);
    currentTokens += messageTokens;
  }

  return selected.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
}

function getLastUserText(messages: UIMessage[]) {
  const lastMessage = [...messages].reverse().find((message) => message.role === "user");
  if (!lastMessage) {
    return "";
  }

  return (lastMessage.parts ?? [])
    .filter((part) => part.type === "text")
    .map((part) => part.text)
    .join("\n")
    .trim();
}

export async function POST(request: Request, context: RouteContext) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: sferaId } = await context.params;
  const avroraAgent = getAgentById("avrora");

  if (!avroraAgent) {
    return Response.json({ error: "Avrora agent is not configured" }, { status: 500 });
  }

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

  if (!membership) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  // AI provider must be configured before streaming; fail fast with a clear 503.
  if (!isAiConfigured()) {
    console.warn("[panel-chat] AI not configured — rejecting request");
    return Response.json(
      { error: "Avrora сейчас недоступна: AI-провайдер не настроен." },
      { status: 503 },
    );
  }

  if (avroraAgent.rateLimit) {
    const rateLimitResult = await checkAvroraRateLimit(session.user.id, sferaId);
    if (!rateLimitResult.allowed) {
      return Response.json(
        { error: rateLimitResult.error || "Rate limit exceeded" },
        { status: 429 },
      );
    }
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const requestMessages = Array.isArray((body as { messages?: unknown[] })?.messages)
    ? ((body as { messages: UIMessage[] }).messages ?? [])
    : [];

  const userText = getLastUserText(requestMessages);
  if (!userText) {
    return Response.json({ error: "Message text is required" }, { status: 400 });
  }

  const [sferaData] = await db.select().from(sfera).where(eq(sfera.id, sferaId)).limit(1);
  if (!sferaData) {
    return Response.json({ error: "Sfera not found" }, { status: 404 });
  }

  const [agentUser] = await db
    .select()
    .from(user)
    .where(eq(user.id, avroraAgent.userId))
    .limit(1);

  if (!agentUser) {
    await db.insert(user).values({
      id: avroraAgent.userId,
      email: avroraAgent.email,
    });
  }

  const [agentMembership] = await db
    .select()
    .from(sferaMember)
    .where(
      and(
        eq(sferaMember.sferaId, sferaId),
        eq(sferaMember.userId, avroraAgent.userId),
      ),
    )
    .limit(1);

  if (!agentMembership) {
    await db.insert(sferaMember).values({
      sferaId,
      userId: avroraAgent.userId,
      role: "member",
      joinedAt: new Date(),
    });
  }

  const [userMessage] = await db
    .insert(sferaMessage)
    .values({
      sferaId,
      userId: session.user.id,
      content: userText,
      parentMessageId: null,
      isForked: false,
      forkCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .returning();

  const [assistantMessage] = await db
    .insert(sferaMessage)
    .values({
      sferaId,
      userId: avroraAgent.userId,
      content: "",
      parentMessageId: userMessage.id,
      isForked: false,
      forkCount: 0,
      isGenerating: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .returning();

  await db
    .update(sfera)
    .set({ updatedAt: new Date() })
    .where(eq(sfera.id, sferaId));

  const recentMessages = await db
    .select({
      id: sferaMessage.id,
      content: sferaMessage.content,
      userEmail: user.email,
      createdAt: sferaMessage.createdAt,
    })
    .from(sferaMessage)
    .innerJoin(user, eq(sferaMessage.userId, user.id))
    .where(eq(sferaMessage.sferaId, sferaId))
    .orderBy(desc(sferaMessage.createdAt))
    .limit(30);

  const contextMessages = selectSmartContext(recentMessages.reverse());
  const conversationContext = contextMessages
    .map((message) => `${message.userEmail}: ${message.content}`)
    .join("\n\n");

  const userName = session.user.email?.split("@")[0] || "User";
  const systemPrompt = avroraAgent.buildSystemPrompt({
    sfera: {
      title: sferaData.title,
      description: sferaData.description,
    },
    userName,
    requestingUserId: session.user.id,
  });

  let currentText = "";
  let lastUpdateTime = Date.now();
  const updateThrottleMs = 200;
  const executedToolNames: string[] = [];
  const toolResults: Array<Record<string, unknown>> = [];

  const result = await streamText({
    model: myProvider.languageModel(avroraAgent.model),
    system: systemPrompt,
    prompt: `Context of recent discussion:\n${conversationContext}\n\nRespond to ${session.user.email}:\n${userText}`,
    temperature: avroraAgent.temperature ?? 0.7,
    tools: avroraAgent.tools,
    toolApproval: Object.fromEntries(
      TOOLS_REQUIRING_APPROVAL.map((tool) => [tool, "user-approval" as const])
    ),
    onChunk: async ({ chunk }) => {
      if (chunk.type !== "text-delta") {
        return;
      }

      currentText += chunk.text;
      const now = Date.now();
      if (now - lastUpdateTime < updateThrottleMs) {
        return;
      }

      lastUpdateTime = now;
      await db
        .update(sferaMessage)
        .set({ content: currentText, updatedAt: new Date() })
        .where(eq(sferaMessage.id, assistantMessage.id));
    },
  });

  void (async () => {
    try {
      const resolvedText = await result.text;
      const resolvedUsage = await result.usage;
      const resolvedSteps = await result.steps;

      for (const step of resolvedSteps ?? []) {
        if (!step.toolCalls || step.toolCalls.length === 0) {
          continue;
        }

        for (const toolCall of step.toolCalls) {
          executedToolNames.push(toolCall.toolName);
          const toolResult = step.toolResults?.find(
            (candidate) => candidate.toolCallId === toolCall.toolCallId,
          );

          if (!toolResult || typeof toolResult !== "object") {
            continue;
          }

          const { toolName: _toolName, ...restResult } = toolResult as Record<string, unknown>;
          toolResults.push({
            toolName: toolCall.toolName,
            ...restResult,
          });
        }
      }

      await db
        .update(sferaMessage)
        .set({
          content: resolvedText.trim(),
          toolResults: toolResults.length > 0 ? (toolResults as never) : undefined,
          isGenerating: false,
          updatedAt: new Date(),
        })
        .where(eq(sferaMessage.id, assistantMessage.id));

      await db
        .update(sfera)
        .set({ updatedAt: new Date() })
        .where(eq(sfera.id, sferaId));

      await logAiUsage({
        userId: session.user.id,
        sferaId,
        messageId: userMessage.id,
        modelUsed: avroraAgent.model,
        provider: "openai",
        inputTokens: resolvedUsage?.inputTokens || 0,
        outputTokens: resolvedUsage?.outputTokens || 0,
        toolName: executedToolNames[0],
        toolParameters:
          executedToolNames.length > 0 ? { tools: executedToolNames } : undefined,
        contextSize: contextMessages.length,
        status: "success",
      });
    } catch (error) {
      await db
        .update(sferaMessage)
        .set({
          content: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
          isGenerating: false,
          updatedAt: new Date(),
        })
        .where(eq(sferaMessage.id, assistantMessage.id));

      await logAiUsage({
        userId: session.user.id,
        sferaId,
        messageId: userMessage.id,
        modelUsed: avroraAgent.model,
        provider: "openai",
        inputTokens: 0,
        outputTokens: 0,
        contextSize: contextMessages.length,
        status: "error",
        errorMessage: error instanceof Error ? error.message : "Unknown error",
      });
    }
  })();

  return result.toUIMessageStreamResponse({
    originalMessages: requestMessages,
    onError: (error) => {
      console.error("Panel chat stream failed:", error);
      return "Avrora could not complete the response.";
    },
  });
}
