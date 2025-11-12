import { streamText } from "ai";
import { and, desc, eq } from "drizzle-orm";
import { auth } from "@/app/(auth)/auth";
import { myProvider } from "@/lib/ai/providers";
import { getSferaTools } from "@/lib/ai/sfera-tools";
import { logAiUsage } from "@/lib/ai/usage-logger";
import { db } from "@/lib/db";
import { sfera, sferaMember, sferaMessage } from "@/lib/db/schema";

export const maxDuration = 30;

const AVRORA_USER_ID = "00000000-0000-0000-0000-000000000001";

export async function POST(req: Request) {
  const session = await auth();

  if (!session || !session.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const {
      messages, // UIMessage[] from useChat
      sferaId,
      data, // experimental_attachments from useChat
    } = await req.json();

    // Require sferaId
    if (!sferaId) {
      return Response.json({ error: "sferaId is required" }, { status: 400 });
    }

    // Verify user has access to this Sfera
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

    // Extract last user message
    const lastUserMessage = messages
      .filter((m: any) => m.role === "user")
      .at(-1);

    if (!lastUserMessage) {
      return Response.json({ error: "No user message found" }, { status: 400 });
    }

    // Extract text content and attachments
    const messageText =
      typeof lastUserMessage.content === "string"
        ? lastUserMessage.content
        : "";

    const attachments = data?.attachments || [];

    // Save user message to database
    const [userMessage] = await db
      .insert(sferaMessage)
      .values({
        sferaId,
        userId: session.user.id,
        content: messageText || "Sent with attachments",
        attachments: attachments.map((att: any) => ({
          name: att.name || "file",
          url: att.url || att.data || "",
          contentType: att.contentType || "application/octet-stream",
        })),
        parentMessageId: null,
        isForked: false,
        forkCount: 0,
        isGenerating: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    // Create empty Avrora message (will be filled by streaming)
    const [avroraMessage] = await db
      .insert(sferaMessage)
      .values({
        sferaId,
        userId: AVRORA_USER_ID,
        content: "",
        parentMessageId: userMessage.id,
        isForked: false,
        forkCount: 0,
        isGenerating: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    // Get recent context
    const recentMessages = await db
      .select({
        id: sferaMessage.id,
        content: sferaMessage.content,
        userId: sferaMessage.userId,
        createdAt: sferaMessage.createdAt,
      })
      .from(sferaMessage)
      .where(eq(sferaMessage.sferaId, sferaId))
      .orderBy(desc(sferaMessage.createdAt))
      .limit(10);

    // Build conversation context
    const conversationContext = recentMessages
      .reverse()
      .map(
        (msg) =>
          `${msg.userId === session.user.id ? "User" : "Assistant"}: ${msg.content}`
      )
      .join("\n\n");

    // Prepare tools
    const tools = getSferaTools();
    const toolsObject: Record<string, any> = {};

    tools.forEach((tool, index) => {
      const toolConfig = tool as any;
      let toolName = `tool_${index}`;

      // Tool name mapping (same as sfera-avrora.ts lines 218-273)
      if (
        toolConfig.description?.includes("Gemini") &&
        toolConfig.description?.includes("image")
      ) {
        toolName = "generateImage";
      } else if (toolConfig.description?.includes("FLUX")) {
        toolName = "generateImageReplicate";
      } else if (toolConfig.description?.includes("music")) {
        toolName = "generateMusic";
      } else if (toolConfig.description?.includes("video")) {
        toolName = "generateVideo";
      } else if (
        toolConfig.description?.includes("speech") ||
        toolConfig.description?.includes("transcribe")
      ) {
        toolName = "speechToText";
      } else if (toolConfig.description?.includes("summarize")) {
        toolName = "summarizeDiscussion";
      } else if (
        toolConfig.description?.includes("search") ||
        toolConfig.description?.includes("web")
      ) {
        toolName = "webSearch";
      } else if (
        toolConfig.description?.includes("mini-app") ||
        toolConfig.description?.includes("mini app")
      ) {
        toolName = "createMiniApp";
      } else if (toolConfig.description?.includes("chart")) {
        toolName = "createChart";
      } else if (
        toolConfig.description?.includes("game") ||
        toolConfig.description?.includes("quiz")
      ) {
        toolName = "createGame";
      } else if (
        toolConfig.description?.includes("edit") &&
        toolConfig.description?.includes("mini")
      ) {
        toolName = "editMiniApp";
      }

      toolsObject[toolName] = tool;
    });

    // Track streaming state
    let currentText = "";
    const toolResults: any[] = [];
    const executedToolNames: string[] = [];
    let lastUpdateTime = Date.now();
    const UPDATE_THROTTLE_MS = 200;

    const model = myProvider.languageModel("chat-model");

    // Stream response
    const result = streamText({
      model,
      system:
        "You are Avrora, a helpful AI assistant. Be concise and friendly.",
      prompt: `Context:\n${conversationContext}\n\nRespond to: ${messageText}`,
      temperature: 0.7,
      tools: toolsObject,
      onChunk: async ({ chunk }) => {
        if (chunk.type === "text-delta") {
          currentText += chunk.text;

          // Throttle DB updates
          const now = Date.now();
          if (now - lastUpdateTime >= UPDATE_THROTTLE_MS) {
            await db
              .update(sferaMessage)
              .set({ content: currentText })
              .where(eq(sferaMessage.id, avroraMessage.id));

            lastUpdateTime = now;
          }
        }
      },
      onFinish: async ({ text, usage, steps }) => {
        // Process tool calls
        if (steps && steps.length > 0) {
          for (const step of steps) {
            if (step.toolCalls && step.toolCalls.length > 0) {
              for (const toolCall of step.toolCalls) {
                executedToolNames.push(toolCall.toolName);

                if (step.toolResults) {
                  const toolResult = step.toolResults.find(
                    (r) => r.toolCallId === toolCall.toolCallId
                  );
                  if (toolResult) {
                    const { toolName: _, ...restResultData } =
                      toolResult as Record<string, unknown>;
                    toolResults.push({
                      toolName: toolCall.toolName,
                      ...restResultData,
                    });
                  }
                }
              }
            }
          }
        }

        // Final database update
        await db
          .update(sferaMessage)
          .set({
            content: text?.trim() || "",
            toolResults: toolResults.length > 0 ? (toolResults as any) : [],
            isGenerating: false,
          })
          .where(eq(sferaMessage.id, avroraMessage.id));

        // Log usage
        await logAiUsage({
          userId: session.user.id,
          sferaId,
          messageId: userMessage.id,
          modelUsed: "gpt-5-mini",
          provider: "openai",
          inputTokens: usage?.promptTokens || 0,
          outputTokens: usage?.completionTokens || 0,
          toolName:
            executedToolNames.length > 0 ? executedToolNames[0] : undefined,
          toolParameters:
            executedToolNames.length > 0
              ? { tools: executedToolNames }
              : undefined,
          contextSize: recentMessages.length,
          status: "success",
        });

        // Update Sfera timestamp
        await db
          .update(sfera)
          .set({ updatedAt: new Date() })
          .where(eq(sfera.id, sferaId));
      },
    });

    // Return streaming response with data annotations
    return result.toDataStreamResponse({
      getErrorMessage: (error) => {
        console.error("Streaming error:", error);
        return error instanceof Error ? error.message : "An error occurred";
      },
      data: {
        sferaId,
        userMessageId: userMessage.id,
        avroraMessageId: avroraMessage.id,
      },
    });
  } catch (error) {
    console.error("Chatbot API error:", error);
    return Response.json(
      { error: "Failed to process chat message" },
      { status: 500 }
    );
  }
}
