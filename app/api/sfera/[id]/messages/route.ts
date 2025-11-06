import { db } from "@/lib/db";
import { sfera, sferaMember, sferaMessage, user } from "@/lib/db/schema";
import { auth } from "@/app/(auth)/auth";
import { eq, and, desc } from "drizzle-orm";
import { hasAvroraMention } from "@/lib/mentions/parser";
import { generateAvroraResponse } from "@/lib/ai/sfera-avrora";

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

    const body = await request.json();
    const { content, parentMessageId } = body;

    if (!content || content.trim() === "") {
      return Response.json(
        { error: "Content is required" },
        { status: 400 }
      );
    }

    // Create message
    const [newMessage] = await db
      .insert(sferaMessage)
      .values({
        sferaId,
        userId: session.user.id,
        content: content.trim(),
        parentMessageId: parentMessageId || null,
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

    // Check if @avrora was mentioned
    if (hasAvroraMention(content)) {
      console.log("🔔 @avrora mentioned in Sfera:", {
        sferaId,
        messageId: newMessage.id,
        userId: session.user.id,
        userEmail: session.user.email,
        content: content.substring(0, 100) + (content.length > 100 ? "..." : ""),
      });

      // Generate Avrora response asynchronously
      setTimeout(async () => {
        try {
          console.log("🤖 Starting Avrora response generation...");
          await generateAvroraResponse(sferaId, newMessage.id, session.user!.id);
        } catch (error) {
          console.error("❌ Failed to generate Avrora response:", error);
        }
      }, 0);
    }

    return Response.json({ message: newMessage }, { status: 201 });
  } catch (error) {
    console.error("Failed to create message:", error);
    return Response.json(
      { error: "Failed to create message" },
      { status: 500 }
    );
  }
}
