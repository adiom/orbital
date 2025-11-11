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
import { detectToolIntent } from "./tool-intent-detector";

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

    // STEP 1: Detect tool intent from user message
    console.log("🔍 Detecting tool intent from message...");
    const toolIntent = detectToolIntent(triggerMessage.content);
    console.log("🎯 Tool intent detected:", toolIntent);

    // Initialize variables for tool execution
    let toolResults: any[] = [];
    let toolExecutionContext = "";

    // STEP 2: Handle special case - list tools request
    if (toolIntent.toolName === "listTools") {
      console.log(
        "📋 User requested list of tools, preparing detailed response..."
      );

      // Inject special context for detailed tools list
      toolExecutionContext = `\n\n[Пользователь просит список инструментов - ОПИШИ ВСЕ 11 инструментов подробно с категориями и примерами!]`;

      // Skip to AI response generation with special context
    } else if (toolIntent.toolName && toolIntent.confidence === "high") {
      console.log(`🔧 Executing tool manually: ${toolIntent.toolName}`);

      try {
        const tools = getSferaTools();

        // Build dynamic tools map by description (tool name)
        // This is more robust than hardcoded indices
        const toolsMap: Record<string, any> = {};
        for (const tool of tools) {
          // Extract tool name from the tool object
          // Tools from ai SDK have a `description` property but we need a cleaner way
          // For now, we'll try to match by checking tool.execute existence
          // Better approach: tools should expose their name
          const toolConfig = tool as any;

          // Map by function name or a known pattern
          if (toolConfig.description?.includes("Gemini")) {
            toolsMap.generateImage = tool;
          } else if (
            toolConfig.description?.includes("FLUX") ||
            toolConfig.description?.includes("Replicate")
          ) {
            if (toolConfig.description?.includes("image")) {
              toolsMap.generateImageReplicate = tool;
            } else if (toolConfig.description?.includes("music")) {
              toolsMap.generateMusic = tool;
            } else if (toolConfig.description?.includes("video")) {
              toolsMap.generateVideo = tool;
            }
          } else if (
            toolConfig.description?.includes("speech") ||
            toolConfig.description?.includes("transcribe")
          ) {
            toolsMap.speechToText = tool;
          } else if (
            toolConfig.description?.includes("summarize") ||
            toolConfig.description?.includes("discussion")
          ) {
            toolsMap.summarizeDiscussion = tool;
          } else if (
            toolConfig.description?.includes("search") ||
            toolConfig.description?.includes("web")
          ) {
            toolsMap.webSearch = tool;
          } else if (
            toolConfig.description?.includes("mini-app") ||
            toolConfig.description?.includes("mini app")
          ) {
            toolsMap.createMiniApp = tool;
          } else if (toolConfig.description?.includes("chart")) {
            toolsMap.createChart = tool;
          } else if (
            toolConfig.description?.includes("game") ||
            toolConfig.description?.includes("quiz")
          ) {
            toolsMap.createGame = tool;
          }
        }

        console.log("🗺️ Tools map built:", Object.keys(toolsMap));

        const tool = toolsMap[toolIntent.toolName];

        if (tool) {
          // For summarizeDiscussion, add context messages
          if (toolIntent.toolName === "summarizeDiscussion") {
            toolIntent.parameters.contextMessages = conversationContext;
          }

          // For speech-to-text, find audio attachment from recent messages
          if (toolIntent.toolName === "speechToText") {
            console.log(
              "🎧 Looking for audio attachment in recent messages..."
            );

            // Search through recent messages for audio attachments (last 5 messages)
            let audioFound = false;
            for (const msg of contextMessages.slice(-5).reverse()) {
              if (msg.attachments && Array.isArray(msg.attachments)) {
                const audioAttachment = msg.attachments.find((att: any) =>
                  att.contentType?.startsWith("audio/")
                );

                if (audioAttachment) {
                  console.log("✅ Found audio attachment:", {
                    name: audioAttachment.name,
                    url: `${audioAttachment.url.substring(0, 50)}...`,
                  });

                  toolIntent.parameters.audioUrl = audioAttachment.url;
                  toolIntent.parameters.fileName = audioAttachment.name;
                  audioFound = true;
                  break;
                }
              }
            }

            if (!audioFound) {
              console.warn("⚠️ No audio attachment found in recent messages");
              // Tool will fail gracefully with error message
            }
          }

          console.log("📥 Tool input parameters:", toolIntent.parameters);

          // Execute tool
          const result = await tool.execute(toolIntent.parameters);

          console.log("📊 Tool execution result:", {
            success: result?.success,
            hasData: !!result,
          });

          // Store result for display in UI
          toolResults = [
            {
              toolName: toolIntent.toolName,
              ...result, // Spread result properties (success, imageUrl, prompt, etc.)
            },
          ];

          // Build context for AI response
          if (result?.success !== false) {
            // Success can be undefined for mini-apps/charts/games
            if (result.imageUrl) {
              toolExecutionContext = `\n\n[Я сгенерировал изображение: ${result.imageUrl}]\nОпиши пользователю что ты создал, коротко упомяни результат.`;
            } else if (result.audioUrl) {
              toolExecutionContext = `\n\n[Я создал музыку: ${result.audioUrl}]\nСкажи пользователю что музыка готова.`;
            } else if (result.videoUrl) {
              toolExecutionContext = `\n\n[Я создал видео: ${result.videoUrl}]\nСкажи пользователю что видео готово.`;
            } else if (result.summary) {
              toolExecutionContext = `\n\n[Вот резюме обсуждения: ${result.summary}]\nПредставь это резюме пользователю.`;
            } else if (result.results && Array.isArray(result.results)) {
              // Web search results
              const resultsPreview = result.results
                .slice(0, 3)
                .map(
                  (r: any) => `- ${r.title}: ${r.content?.substring(0, 100)}...`
                )
                .join("\n");
              toolExecutionContext = `\n\n[Результаты поиска по запросу "${result.query}":\n${resultsPreview}${result.answer ? `\n\nAI ответ: ${result.answer}` : ""}]\nКратко перескажи пользователю что нашёл.`;
            } else if (
              result.title &&
              (result.toolName === "create-mini-app" ||
                result.toolName === "create-chart" ||
                result.toolName === "create-game")
            ) {
              // Mini-apps, charts, games
              toolExecutionContext = `\n\n[Я создал "${result.title}": ${result.message || result.purpose || "готово"}]\nСкажи пользователю что создано, коротко (до 20 слов).`;
            } else {
              toolExecutionContext = `\n\n[Инструмент выполнен успешно: ${JSON.stringify(result)}]`;
            }
          } else {
            toolExecutionContext = `\n\n[Ошибка выполнения инструмента: ${result?.error || "Unknown error"}]\nСкажи пользователю что не получилось выполнить запрос.`;
          }

          console.log("✅ Tool executed successfully");
        } else {
          console.error("❌ Tool not found:", toolIntent.toolName);
        }
      } catch (error) {
        console.error("❌ Error executing tool:", error);
        toolExecutionContext = `\n\n[Ошибка: ${error instanceof Error ? error.message : "Unknown error"}]\nСкажи пользователю что произошла ошибка.`;
      }
    }

    // STEP 3: Generate AI response (without automatic tool calling)
    console.log("🧠 Generating AI response...");
    const model = myProvider.languageModel("chat-model");

    const { text } = await generateText({
      model,
      system: systemPrompt,
      prompt: `Context of recent discussion:\n${conversationContext}\n\nRespond to the message from ${triggerMessage.userEmail}.${toolExecutionContext}`,
      temperature: 0.7,
      // No tools parameter - we handle tools manually now
    });

    console.log("✅ AI response generated:", {
      length: text.length,
      preview: `${text.substring(0, 100)}...`,
      hadToolExecution: toolResults.length > 0,
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
