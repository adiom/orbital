import { eq } from "drizzle-orm";
import { auth } from "@/app/(auth)/auth";
import { db } from "@/lib/db";
import { sferaMessage } from "@/lib/db/schema";
import { transcribeAudio } from "@/lib/ai/transcription";

// POST /api/sfera/transcribe
// Body: { messageId: string, language?: "ru" | "en" | "auto" }
export async function POST(request: Request) {
  const requestId = crypto.randomUUID();
  const startedAt = Date.now();
  const session = await auth();

  if (!session?.user) {
    console.warn("[transcribe-api] Unauthorized request", { requestId });
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { messageId, language = "auto" } = body;

    console.info("[transcribe-api] Request started", {
      requestId,
      messageId: messageId || null,
      userId: session.user.id,
      language,
    });

    if (!messageId) {
      console.warn("[transcribe-api] Missing messageId", { requestId });
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
      console.warn("[transcribe-api] Message not found", {
        requestId,
        messageId,
      });
      return Response.json({ error: "Message not found" }, { status: 404 });
    }

    if (message.userId !== session.user.id) {
      console.warn("[transcribe-api] Ownership check failed", {
        requestId,
        messageId,
        userId: session.user.id,
        messageUserId: message.userId,
      });
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
      console.info("[transcribe-api] Returning cached transcription", {
        requestId,
        messageId,
        durationMs: Date.now() - startedAt,
      });
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
      console.warn("[transcribe-api] Audio attachment not found", {
        requestId,
        messageId,
        attachmentCount: Array.isArray(message.attachments)
          ? message.attachments.length
          : 0,
      });
      return Response.json(
        { error: "No audio attachment found" },
        { status: 400 }
      );
    }

    console.info("[transcribe-api] Audio attachment found", {
      requestId,
      messageId,
      name: audioAttachment.name || null,
      contentType: audioAttachment.contentType || null,
      size: audioAttachment.size ?? null,
      audioHost: getUrlHost(audioAttachment.url),
    });

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

    console.info("[transcribe-api] Service call finished", {
      requestId,
      messageId,
      success: result.success,
      error: result.error || null,
      textLength: result.text?.length ?? 0,
      durationMs: Date.now() - startedAt,
    });

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

      console.info("[transcribe-api] Transcription saved", {
        requestId,
        messageId,
      });
    }

    // Future: log usage
    // await logTranscriptionUsage(session.user.id);

    return Response.json(result);
  } catch (error) {
    console.error("[transcribe-api] Request failed", {
      requestId,
      durationMs: Date.now() - startedAt,
      error:
        error instanceof Error
          ? {
              name: error.name,
              message: error.message,
              stack: error.stack,
              cause: error.cause,
            }
          : { message: String(error) },
    });
    return Response.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Transcription failed",
      },
      { status: 500 }
    );
  }
}

function getUrlHost(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  try {
    return new URL(value).host;
  } catch {
    return "invalid-url";
  }
}
