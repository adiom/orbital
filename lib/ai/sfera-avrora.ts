/**
 * Avrora AI integration for Sfera discussions
 * Handles @avrora mentions and generates context-aware responses
 */

import { generateText } from "ai";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { sfera, sferaMember, sferaMessage, user } from "@/lib/db/schema";
import { myProvider } from "./providers";
import { getSferaTools } from "./sfera-tools";
import { logAiUsage } from "./usage-logger";

// Use a fixed UUID for Avrora AI user
const AVRORA_USER_ID = "00000000-0000-0000-0000-000000000001"; // Special system user ID for Avrora

/**
 * Generate Avrora's response to a message in a Sfera
 */
export async function generateAvroraResponse(
  sferaId: string,
  triggerMessageId: string,
  requestingUserId: string
): Promise<void> {
  console.log("📝 generateAvroraResponse called:", {
    sferaId,
    triggerMessageId,
    requestingUserId,
  });

  try {
    // Get Sfera details
    console.log("🔍 Fetching Sfera details...");
    const [sferaData] = await db
      .select()
      .from(sfera)
      .where(eq(sfera.id, sferaId))
      .limit(1);

    if (!sferaData) {
      console.error("❌ Sfera not found:", sferaId);
      throw new Error("Sfera not found");
    }

    console.log("✅ Sfera found:", {
      title: sferaData.title,
      id: sferaData.id,
    });

    // Get recent messages for context (last 20)
    console.log("💬 Fetching recent messages for context...");
    const messages = await db
      .select({
        id: sferaMessage.id,
        content: sferaMessage.content,
        userId: sferaMessage.userId,
        userEmail: user.email,
        createdAt: sferaMessage.createdAt,
        attachments: sferaMessage.attachments,
      })
      .from(sferaMessage)
      .innerJoin(user, eq(sferaMessage.userId, user.id))
      .where(eq(sferaMessage.sferaId, sferaId))
      .orderBy(desc(sferaMessage.createdAt))
      .limit(20);

    // Reverse to get chronological order
    const contextMessages = messages.reverse();
    console.log(`✅ Found ${contextMessages.length} messages for context`);

    // Build conversation context
    const conversationContext = contextMessages
      .map((msg) => `${msg.userEmail}: ${msg.content}`)
      .join("\n\n");

    // System prompt for Sfera context
    const systemPrompt = `You are Avrora, an AI assistant helping with collaborative discussions in a Sfera.

Sfera Context:
- Title: ${sferaData.title}
- Description: ${sferaData.description || "No description"}
- Discussion Type: Collaborative, fork-based conversation

Ваша роль:
- Поддерживать разговор
- Имейте в виду, что это пространство для совместной работы с несколькими участниками
- Будьте в дискуссии, не надо быть ментором
- Предлагайте что-то свое только если вас попросят
- В сообщении не больше 30 слов (КРОМЕ случаев когда вас просят про список инструментов - тогда опишите их подробно)
- Если в контексте есть результат выполнения инструмента - коротко опиши результат пользователю

Доступные инструменты (всего 11):

🎨 ГЕНЕРАТИВНЫЕ ИНСТРУМЕНТЫ:
1. generateImage - генерация изображений через Gemini (быстро, для простых картинок)
   Пример: "@Avrora нарисуй космический корабль"

2. generateImageReplicate - генерация через Replicate FLUX (качественно, для сложных сцен)
   Пример: "@Avrora создай через replicate портрет в стиле ренессанса"

3. generateMusic - генерация музыки через Replicate (30 секунд)
   Пример: "@Avrora создай музыку: спокойная лаунж мелодия"

4. generateVideo - генерация видео/анимации через Replicate (5 секунд)
   Пример: "@Avrora сделай видео: волны на океане"

5. speechToText - преобразование аудио в текст (транскрипция)
   Пример: "@Avrora транскрибируй это аудио"

🔍 АНАЛИТИЧЕСКИЕ ИНСТРУМЕНТЫ:
6. summarizeDiscussion - резюме обсуждения (краткое/среднее/подробное)
   Пример: "@Avrora резюмируй обсуждение кратко"

7. webSearch - поиск в интернете через Tavily (актуальная информация, новости)
   Пример: "@Avrora найди информацию о новинках в AI"

💻 ИНСТРУМЕНТЫ СОЗДАНИЯ MINI-APP:
8. createMiniApp - создание React приложения (интерактивное)
   Пример: "@Avrora создай приложение калькулятор"

9. createChart - создание графиков и диаграмм
   Пример: "@Avrora построй график продаж за год"

10. createGame - создание игр и викторин
    Пример: "@Avrora создай викторину про историю"

11. editMiniApp - редактирование существующего mini-app
    Пример: "@Avrora измени приложение: добавь кнопку сброса"

КОГДА ВАС ПРОСЯТ СПИСОК ИНСТРУМЕНТОВ: опишите ВСЕ 11 инструментов с примерами использования, категориями и деталями!

Помните: сообщения в Sfera можно разветвлять на новые ветки обсуждения. Если вы видите возможность для более глубокого изучения, сообщите об этом.`;
    // Get the trigger message
    const triggerMessage = contextMessages.find(
      (m) => m.id === triggerMessageId
    );
    if (!triggerMessage) {
      console.error("❌ Trigger message not found:", triggerMessageId);
      throw new Error("Trigger message not found");
    }

    console.log("🎯 Trigger message found:", {
      id: triggerMessage.id,
      from: triggerMessage.userEmail,
      content: triggerMessage.content.substring(0, 100),
    });

    // Get all available tools
    const tools = getSferaTools();
    console.log(`🔧 Loaded ${tools.length} tools for AI to use`);

    // Prepare tools object for AI SDK (convert array to object with tool names as keys)
    const toolsObject: Record<string, typeof tools[number]> = {};

    // Map tools by their type/name from the tool function
    tools.forEach((tool, index) => {
      const toolConfig = tool as any;
      // Extract tool name from description or use index-based naming
      let toolName = `tool_${index}`;

      if (toolConfig.description?.includes("Gemini") && toolConfig.description?.includes("image")) {
        toolName = "generateImage";
      } else if (toolConfig.description?.includes("FLUX") || (toolConfig.description?.includes("Replicate") && toolConfig.description?.includes("image"))) {
        toolName = "generateImageReplicate";
      } else if (toolConfig.description?.includes("music")) {
        toolName = "generateMusic";
      } else if (toolConfig.description?.includes("video")) {
        toolName = "generateVideo";
      } else if (toolConfig.description?.includes("speech") || toolConfig.description?.includes("transcribe")) {
        toolName = "speechToText";
      } else if (toolConfig.description?.includes("summarize")) {
        toolName = "summarizeDiscussion";
      } else if (toolConfig.description?.includes("search") || toolConfig.description?.includes("web")) {
        toolName = "webSearch";
      } else if (toolConfig.description?.includes("mini-app") || toolConfig.description?.includes("mini app")) {
        toolName = "createMiniApp";
      } else if (toolConfig.description?.includes("chart")) {
        toolName = "createChart";
      } else if (toolConfig.description?.includes("game") || toolConfig.description?.includes("quiz")) {
        toolName = "createGame";
      } else if (toolConfig.description?.includes("edit") && toolConfig.description?.includes("mini")) {
        toolName = "editMiniApp";
      }

      toolsObject[toolName] = tool;
    });

    console.log("🗺️ Tools mapped:", Object.keys(toolsObject));

    // Initialize variables for tracking tool execution
    let toolResults: any[] = [];
    let executedToolNames: string[] = [];

    // Generate AI response with automatic tool calling
    console.log("🧠 Generating AI response with automatic tool calling...");
    const model = myProvider.languageModel("chat-model");

    const result = await generateText({
      model,
      system: systemPrompt,
      prompt: `Context of recent discussion:\n${conversationContext}\n\nRespond to the message from ${triggerMessage.userEmail}.`,
      temperature: 0.7,
      tools: toolsObject, // AI will automatically decide which tools to use
      maxSteps: 5, // Allow up to 5 tool calls in sequence
    });

    const { text, usage, steps } = result;

    // Process tool calls from steps
    if (steps && steps.length > 0) {
      console.log(`🔧 AI executed ${steps.length} steps`);

      for (const step of steps) {
        if (step.toolCalls && step.toolCalls.length > 0) {
          for (const toolCall of step.toolCalls) {
            console.log(`✅ Tool called: ${toolCall.toolName}`, {
              args: toolCall.args,
            });

            executedToolNames.push(toolCall.toolName);

            // Find the result for this tool call
            if (step.toolResults) {
              const toolResult = step.toolResults.find(
                (r) => r.toolCallId === toolCall.toolCallId
              );
              if (toolResult) {
                toolResults.push({
                  toolName: toolCall.toolName,
                  ...toolResult.result,
                });
              }
            }
          }
        }
      }

      console.log(`📊 Total tools executed: ${executedToolNames.join(", ")}`);
    }

    console.log("✅ AI response generated:", {
      length: text.length,
      preview: `${text.substring(0, 100)}...`,
      hadToolExecution: toolResults.length > 0,
      tokens: usage?.totalTokens,
    });

    // Log AI usage
    await logAiUsage({
      userId: requestingUserId,
      sferaId,
      messageId: triggerMessageId,
      modelUsed: "gpt-5",
      provider: "openai",
      inputTokens: usage?.promptTokens || 0,
      outputTokens: usage?.completionTokens || 0,
      toolName: executedToolNames.length > 0 ? executedToolNames[0] : undefined,
      toolParameters: executedToolNames.length > 0 ? { tools: executedToolNames } : undefined,
      contextSize: contextMessages.length,
      status: "success",
    });

    // Ensure Avrora is a member of the Sfera
    console.log("👤 Ensuring Avrora membership...");
    await ensureAvroraMembership(sferaId);

    // Post Avrora's response with tool results
    console.log("💾 Saving Avrora's message to database...");
    await db.insert(sferaMessage).values({
      sferaId,
      userId: AVRORA_USER_ID,
      content: text.trim(),
      parentMessageId: triggerMessageId,
      isForked: false,
      forkCount: 0,
      toolResults: (toolResults || []) as any, // Cast to any for DB compatibility
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Update Sfera's updatedAt
    await db
      .update(sfera)
      .set({ updatedAt: new Date() })
      .where(eq(sfera.id, sferaId));

    console.log(`✅ Avrora responded in Sfera ${sferaId}`);
  } catch (error) {
    console.error("❌ Error generating Avrora response:", error);

    // Log error to database
    await logAiUsage({
      userId: requestingUserId,
      sferaId,
      messageId: triggerMessageId,
      modelUsed: "gpt-5",
      provider: "openai",
      inputTokens: 0,
      outputTokens: 0,
      status: "error",
      errorMessage: error instanceof Error ? error.message : "Unknown error",
    });

    throw error;
  }
}

/**
 * Ensure Avrora is a member of the Sfera
 * Creates Avrora user if doesn't exist
 */
async function ensureAvroraMembership(sferaId: string): Promise<void> {
  console.log("🔍 Checking if Avrora user exists...");
  // Check if Avrora user exists
  const [avroraUser] = await db
    .select()
    .from(user)
    .where(eq(user.id, AVRORA_USER_ID))
    .limit(1);

  // Create Avrora user if doesn't exist
  if (avroraUser) {
    console.log("✅ Avrora user already exists");
  } else {
    console.log("➕ Creating Avrora user...");
    await db.insert(user).values({
      id: AVRORA_USER_ID,
      email: "avrora@avrora.click",
    });
    console.log("✅ Avrora user created");
  }

  // Check if Avrora is member of this Sfera
  console.log("🔍 Checking Sfera membership...");
  const [membership] = await db
    .select()
    .from(sferaMember)
    .where(
      and(
        eq(sferaMember.sferaId, sferaId),
        eq(sferaMember.userId, AVRORA_USER_ID)
      )
    )
    .limit(1);

  // Add Avrora as member if not already
  if (membership) {
    console.log("✅ Avrora is already a member");
  } else {
    console.log("➕ Adding Avrora as member to Sfera...");
    await db.insert(sferaMember).values({
      sferaId,
      userId: AVRORA_USER_ID,
      role: "member",
      joinedAt: new Date(),
    });
    console.log("✅ Avrora added as member");
  }
}

/**
 * Check if a message should trigger Avrora response
 */
export function shouldTriggerAvrora(content: string): boolean {
  const lowerContent = content.toLowerCase();
  return (
    lowerContent.includes("@avrora") || lowerContent.includes("@аврора") // Russian version
  );
}
