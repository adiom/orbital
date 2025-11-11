/**
 * Avrora AI integration for Sfera discussions
 * Handles @avrora mentions and generates context-aware responses
 */

import { generateText } from "ai";
import { and, desc, eq } from "drizzle-orm";
import { buildSferaPrompt } from "@/lib/ai/prompts/index";
import { db } from "@/lib/db";
import { sfera, sferaMember, sferaMessage, user } from "@/lib/db/schema";
import { myProvider } from "./providers";
import { getSferaTools } from "./sfera-tools";
import { logAiUsage } from "./usage-logger";

// Use a fixed UUID for Avrora AI user
const AVRORA_USER_ID = "00000000-0000-0000-0000-000000000001"; // Special system user ID for Avrora

/**
 * Estimate token count for a message (rough estimate: 1 token ≈ 4 characters)
 */
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Smart context selection to keep within ~2000 token budget
 * Prioritizes:
 * 1. Most recent 5 messages (always included)
 * 2. Messages with @avrora mentions
 * 3. Messages from the trigger user
 * 4. Fill remaining budget with recent messages
 */
function selectSmartContext(
  messages: Array<{
    id: string;
    content: string;
    userId: string;
    userEmail: string;
    createdAt: Date;
    attachments: unknown;
  }>,
  triggerMessageId: string
): typeof messages {
  const TARGET_TOKENS = 2000;
  const RECENT_COUNT = 5; // Always include last 5 messages

  if (messages.length === 0) {
    return [];
  }

  // Priority buckets
  const recentMessages = messages.slice(-RECENT_COUNT);
  const avroraMentions = messages.filter(
    (m) =>
      m.content.toLowerCase().includes("@avrora") ||
      m.content.toLowerCase().includes("@аврора")
  );
  const triggerUserMessages = messages.filter(
    (m) =>
      m.id === triggerMessageId ||
      m.userId === messages.find((msg) => msg.id === triggerMessageId)?.userId
  );

  // Deduplicate and collect
  const selectedIds = new Set<string>();
  const selected: typeof messages = [];

  // Add recent messages first (highest priority)
  for (const msg of recentMessages) {
    if (!selectedIds.has(msg.id)) {
      selected.push(msg);
      selectedIds.add(msg.id);
    }
  }

  // Add @avrora mentions
  for (const msg of avroraMentions) {
    if (!selectedIds.has(msg.id)) {
      selected.push(msg);
      selectedIds.add(msg.id);
    }
  }

  // Add trigger user's messages
  for (const msg of triggerUserMessages) {
    if (!selectedIds.has(msg.id)) {
      selected.push(msg);
      selectedIds.add(msg.id);
    }
  }

  // Calculate current token count
  let currentTokens = selected.reduce(
    (sum, msg) => sum + estimateTokens(`${msg.userEmail}: ${msg.content}`),
    0
  );

  // Fill remaining budget with recent messages (working backwards)
  for (
    let i = messages.length - 1;
    i >= 0 && currentTokens < TARGET_TOKENS;
    i--
  ) {
    const msg = messages[i];
    if (!selectedIds.has(msg.id)) {
      const msgTokens = estimateTokens(`${msg.userEmail}: ${msg.content}`);
      if (currentTokens + msgTokens <= TARGET_TOKENS) {
        selected.push(msg);
        selectedIds.add(msg.id);
        currentTokens += msgTokens;
      }
    }
  }

  // Sort by creation time to maintain chronological order
  return selected.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
}

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

    // Get recent messages for context (last 30 for smart selection)
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
      .limit(30);

    // Reverse to get chronological order
    const allMessages = messages.reverse();
    console.log(
      `✅ Found ${allMessages.length} messages for smart context selection`
    );

    // Smart context management: reduce from ~7000 to ~2000 tokens
    const contextMessages = selectSmartContext(allMessages, triggerMessageId);
    console.log(
      `🧠 Smart context selected ${contextMessages.length} messages (target: ~2000 tokens)`
    );

    // Build conversation context
    const conversationContext = contextMessages
      .map((msg) => `${msg.userEmail}: ${msg.content}`)
      .join("\n\n");

    // Get user name from trigger message for personalization
    const triggerUser = contextMessages.find((m) => m.id === triggerMessageId);
    const userName = triggerUser?.userEmail.split("@")[0];

    // Build system prompt using modular system
    const systemPrompt = buildSferaPrompt(
      {
        title: sferaData.title,
        description: sferaData.description,
      },
      userName
    );
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
    //console.log(`🔧 Loaded ${tools.length} tools for AI to use`);
    //console.log(`triggerMessage = ${triggerMessage}`);
    // Prepare tools object for AI SDK (convert array to object with tool names as keys)
    const toolsObject: Record<string, (typeof tools)[number]> = {};

    // Map tools by their type/name from the tool function
    tools.forEach((tool, index) => {
      const toolConfig = tool as any;
      // Extract tool name from description or use index-based naming
      let toolName = `tool_${index}`;

      if (
        toolConfig.description?.includes("Gemini") &&
        toolConfig.description?.includes("image")
      ) {
        toolName = "generateImage";
      } else if (
        toolConfig.description?.includes("FLUX") ||
        (toolConfig.description?.includes("Replicate") &&
          toolConfig.description?.includes("image"))
      ) {
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

    console.log("🗺️ Tools mapped:", Object.keys(toolsObject));

    // Initialize variables for tracking tool execution
    const toolResults: any[] = [];
    const executedToolNames: string[] = [];

    // Always use full model (chat-model/gpt-5-mini) since we provide tools
    // The AI SDK will decide whether to use them based on context
    const selectedModel = "chat-model";

    console.log("🧠 Generating AI response with automatic tool calling...");
    console.log(`🎯 Model: ${selectedModel}`);
    const model = myProvider.languageModel(selectedModel);

    const result = await generateText({
      model,
      system: systemPrompt,
      prompt: `Context of recent discussion:
      ${conversationContext}
      
      Respond to the message from ${triggerMessage.userEmail}
      ${triggerMessage.content}
      `,
      temperature: 0.7,
      tools: toolsObject, // AI will automatically decide which tools to use
    });

    const { text, usage, steps } = result;

    // Resolve promises for text and usage
    const resolvedText = await text;
    const resolvedUsage = await usage;

    // Process tool calls from steps
    if (steps && steps.length > 0) {
      console.log(`🔧 AI executed ${steps.length} steps`);

      for (const step of steps) {
        if (step.toolCalls && step.toolCalls.length > 0) {
          for (const toolCall of step.toolCalls) {
            console.log(`✅ Tool called: ${toolCall.toolName}`);

            executedToolNames.push(toolCall.toolName);

            // Find the result for this tool call
            if (step.toolResults) {
              const toolResult = step.toolResults.find(
                (r) => r.toolCallId === toolCall.toolCallId
              );
              if (toolResult) {
                // toolResult is already the result object in AI SDK 5.0
                const resultData =
                  typeof toolResult === "object" && toolResult !== null
                    ? toolResult
                    : {};
                // Remove toolName from resultData if it exists to avoid conflict
                const { toolName: _, ...restResultData } = resultData as Record<
                  string,
                  unknown
                >;
                toolResults.push({
                  toolName: toolCall.toolName,
                  ...restResultData,
                });
              }
            }
          }
        }
      }

      console.log(`📊 Total tools executed: ${executedToolNames.join(", ")}`);
    }

    console.log("✅ AI response generated:", {
      length: resolvedText.length,
      preview: `${resolvedText.substring(0, 100)}...`,
      hadToolExecution: toolResults.length > 0,
      tokens: resolvedUsage?.totalTokens,
      model: selectedModel,
    });

    // Log AI usage
    await logAiUsage({
      userId: requestingUserId,
      sferaId,
      messageId: triggerMessageId,
      modelUsed: "gpt-5-mini",
      provider: "openai",
      inputTokens: resolvedUsage?.inputTokens || 0,
      outputTokens: resolvedUsage?.outputTokens || 0,
      toolName: executedToolNames.length > 0 ? executedToolNames[0] : undefined,
      toolParameters:
        executedToolNames.length > 0 ? { tools: executedToolNames } : undefined,
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
      content: resolvedText.trim(),
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

    // Log error to database (use gpt-5-nano as default for errors)
    await logAiUsage({
      userId: requestingUserId,
      sferaId,
      messageId: triggerMessageId,
      modelUsed: "gpt-5-nano",
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
