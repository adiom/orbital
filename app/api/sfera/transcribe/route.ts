import { eq } from "drizzle-orm";
import { auth } from "@/app/(auth)/auth";
import { db } from "@/lib/db";
import { sferaMessage } from "@/lib/db/schema";
import { transcribeAudio } from "@/lib/ai/transcription";

// POST /api/sfera/transcribe
// Body: { messageId: string, language?: "ru" | "en" | "auto" }
export async function POST(request: Request) {
  const session = await auth();

  if (!session?.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { messageId, language = "auto" } = body;

    if (!messageId) {
      return Response.json(
        { error: "messageId is required" },
        { status: 400 }
      );
    }

    // Find message + ownership check
    const [message] = await db
      .select()
      .from(sferaMessage)
      .where(eq(sferaMessage.id, messageId))
      .limit(1);

    if (!message) {
      return Response.json({ error: "Message not found" }, { status: 404 });
    }

    if (message.userId !== session.user.id) {
      return Response.json(
        { error: "You can only transcribe your own audio" },
        { status: 403 }
      );
    }

    // Check cache (existing toolResults)
    const existingTranscription = (message.toolResults as any[])?.find(
      (r: any) => r.toolName === "speechToText" && r.success
    );

    if (existingTranscription) {
      return Response.json({
        success: true,
        text: existingTranscription.text,
        language: existingTranscription.language,
        duration: existingTranscription.duration,
        confidence: existingTranscription.confidence,
        cached: true,
      });
    }

    // Find audio attachment
    const audioAttachment = (message.attachments as any[])?.find(
      (a: any) => a.contentType?.startsWith("audio/")
    );

    if (!audioAttachment) {
      return Response.json(
        { error: "No audio attachment found" },
        { status: 400 }
      );
    }

    // Future: quota check
    // const quota = await checkTranscriptionQuota(session.user.id);
    // if (!quota.allowed) {
    //   return Response.json({ error: quota.error }, { status: 429 });
    // }

    // Call transcription service
    const result = await transcribeAudio(
      audioAttachment.url,
      language,
      audioAttachment.name
    );

    // Save to toolResults
    if (result.success) {
      const currentToolResults = (message.toolResults as any[]) || [];
      await db
        .update(sferaMessage)
        .set({
          toolResults: [
            ...currentToolResults,
            {
              toolName: "speechToText",
              success: true,
              text: result.text,
              language: result.language,
              duration: result.duration,
              confidence: result.confidence,
            },
          ],
          updatedAt: new Date(),
        })
        .where(eq(sferaMessage.id, messageId));
    }

    // Future: log usage
    // await logTranscriptionUsage(session.user.id);

    return Response.json(result);
  } catch (error) {
    console.error("Transcription API error:", error);
    return Response.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Transcription failed",
      },
      { status: 500 }
    );
  }
}
