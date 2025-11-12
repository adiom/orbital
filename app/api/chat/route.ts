import type { UIMessage } from "ai";
import { and, desc, eq } from "drizzle-orm";
import { auth } from "@/app/(auth)/auth";
import { generateAvroraResponse } from "@/lib/ai/sfera-avrora";
import { db } from "@/lib/db";
import { sfera, sferaMember, sferaMessage, user } from "@/lib/db/schema";

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

// AVRORA user ID for AI responses
const AVRORA_USER_ID = "00000000-0000-0000-0000-000000000001";

export async function POST(req: Request) {
  const session = await auth();

  if (!session || !session.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const {
      messages,
      sferaId,
      attachments,
      data, // experimental_attachments from useChat (like in /api/chatbot)
    }: {
      messages: UIMessage[];
      sferaId?: string;
      attachments?: Array<{
        name: string;
        url: string;
        contentType: string;
      }>;
      data?: {
        attachments?: Array<{
          name: string;
          url: string;
          contentType: string;
        }>;
      };
    } = await req.json();

    // Get or create sfera for this chat
    let chatSferaId = sferaId;

    if (chatSferaId) {
      // Verify user has access to this sfera
      const [membership] = await db
        .select()
        .from(sferaMember)
        .where(
          and(
            eq(sferaMember.sferaId, chatSferaId),
            eq(sferaMember.userId, session.user.id)
          )
        )
        .limit(1);

      if (!membership) {
        return Response.json({ error: "Forbidden" }, { status: 403 });
      }
    } else {
      // Create a new sfera for this chat session
      const [newSfera] = await db
        .insert(sfera)
        .values({
          title: "Chatbot Session",
          description: null,
          ownerId: session.user.id,
          visibility: "private",
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();

      chatSferaId = newSfera.id;

      // Add owner as member
      await db.insert(sferaMember).values({
        sferaId: newSfera.id,
        userId: session.user.id,
        role: "owner",
        joinedAt: new Date(),
      });

      // Add Avrora as member
      await db.insert(sferaMember).values({
        sferaId: newSfera.id,
        userId: AVRORA_USER_ID,
        role: "member",
        joinedAt: new Date(),
      });
    }

    // Get the last user message
    const lastUserMessage = messages.filter((m) => m.role === "user").at(-1);

    if (!lastUserMessage) {
      return Response.json({ error: "No user message found" }, { status: 400 });
    }

    // Extract text content from the message
    const messageText =
      typeof lastUserMessage.content === "string"
        ? lastUserMessage.content
        : "";

    // Get attachments from body (data.attachments or attachments)
    // UIMessage from useChat doesn't have parts property by default
    const messageAttachments = data?.attachments || attachments || [];

    // Create user message in sfera
    const [userMessage] = await db
      .insert(sferaMessage)
      .values({
        sferaId: chatSferaId,
        userId: session.user.id,
        content: messageText || "Sent with attachments",
        attachments: messageAttachments.map((att: any) => ({
          name: att.name || "file",
          url: att.url || att.data || "",
          contentType: att.contentType || "application/octet-stream",
        })) as Array<{
          name: string;
          url: string;
          contentType: string;
        }>,
        parentMessageId: null,
        isForked: false,
        forkCount: 0,
        isGenerating: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    // Update sfera's updatedAt
    await db
      .update(sfera)
      .set({ updatedAt: new Date() })
      .where(eq(sfera.id, chatSferaId));

    // Trigger Avrora response asynchronously
    // generateAvroraResponse will create the response message itself
    setTimeout(async () => {
      try {
        await generateAvroraResponse(
          chatSferaId,
          userMessage.id,
          session.user.id
        );
      } catch (error) {
        console.error("Failed to generate Avrora response:", error);
      }
    }, 0);

    // Get all messages from sfera to return
    const sferaMessages = await db
      .select({
        id: sferaMessage.id,
        content: sferaMessage.content,
        userId: sferaMessage.userId,
        userEmail: user.email,
        parentMessageId: sferaMessage.parentMessageId,
        attachments: sferaMessage.attachments,
        toolResults: sferaMessage.toolResults,
        isForked: sferaMessage.isForked,
        createdAt: sferaMessage.createdAt,
        isGenerating: sferaMessage.isGenerating,
      })
      .from(sferaMessage)
      .innerJoin(user, eq(sferaMessage.userId, user.id))
      .where(eq(sferaMessage.sferaId, chatSferaId))
      .orderBy(desc(sferaMessage.createdAt))
      .limit(50);

    // Convert to UIMessage format
    const uiMessages: UIMessage[] = sferaMessages.reverse().map((msg) => {
      const isUser = msg.userId === session.user.id;
      const isAvrora = msg.userId === AVRORA_USER_ID;

      return {
        id: msg.id,
        role: isUser ? ("user" as const) : ("assistant" as const),
        content: msg.content,
        parts: [
          {
            type: "text",
            text: msg.content,
          },
          ...(msg.attachments && msg.attachments.length > 0
            ? msg.attachments.map((att: any) => ({
                type: "file" as const,
                name: att.name,
                url: att.url,
                contentType: att.contentType,
              }))
            : []),
        ],
      };
    });

    return Response.json({
      messages: uiMessages,
      sferaId: chatSferaId,
    });
  } catch (error) {
    console.error("Failed to process chat message:", error);
    return Response.json(
      { error: "Failed to process chat message" },
      { status: 500 }
    );
  }
}
