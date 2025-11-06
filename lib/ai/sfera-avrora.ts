/**
 * Avrora AI integration for Sfera discussions
 * Handles @avrora mentions and generates context-aware responses
 */

import { generateText } from "ai";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { sfera, sferaMember, sferaMessage, user } from "@/lib/db/schema";
import { myProvider } from "./providers";

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
- Предлагайте чтото свое только если вас попросят
- В сообщении не больше 30 слов

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

    // Generate response using MegaLLM
    console.log("🧠 Generating AI response...");
    const model = myProvider.languageModel("chat-model");
    const { text } = await generateText({
      model,
      system: systemPrompt,
      prompt: `Context of recent discussion:\n${conversationContext}\n\nRespond to the message from ${triggerMessage.userEmail}.`,
      temperature: 0.7,
    });

    console.log("✅ AI response generated:", {
      length: text.length,
      preview: `${text.substring(0, 100)}...`,
    });

    // Ensure Avrora is a member of the Sfera
    console.log("👤 Ensuring Avrora membership...");
    await ensureAvroraMembership(sferaId);

    // Post Avrora's response
    console.log("💾 Saving Avrora's message to database...");
    await db.insert(sferaMessage).values({
      sferaId,
      userId: AVRORA_USER_ID,
      content: text.trim(),
      parentMessageId: triggerMessageId,
      isForked: false,
      forkCount: 0,
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
      email: "avrora@avrora.ai",
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
