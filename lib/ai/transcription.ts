/**
 * Shared transcription helper
 * Used by both the speechToText tool and the /api/sfera/transcribe endpoint
 */

export type TranscriptionResult = {
  success: boolean;
  text?: string;
  language?: string;
  duration?: number;
  confidence?: number;
  error?: string;
};

/**
 * Transcribe audio file to text using the external transcription service
 */
export async function transcribeAudio(
  audioUrl: string,
  language: string = "auto",
  fileName?: string
): Promise<TranscriptionResult> {
  const requestId = crypto.randomUUID();
  const startedAt = Date.now();

  try {
    const configuredUrl = process.env.SPEECH_TO_TEXT_API_URL?.trim();
    const baseUrl = configuredUrl
      ?.replace(/\/+$/, "")
      .replace(/\/transcribe$/, "");
    const apiKey = process.env.SPEECH_TO_TEXT_API_KEY?.trim();
    const lang = language === "auto" ? "ru" : language;

    console.info("[transcription] Started", {
      requestId,
      audioUrl: redactUrl(audioUrl),
      fileName: fileName || null,
      requestedLanguage: language,
      effectiveLanguage: lang,
      configuredUrl: configuredUrl || null,
      hasApiKey: Boolean(apiKey),
      apiKeyLength: apiKey?.length ?? 0,
    });

    if (!baseUrl) {
      console.error("[transcription] Service is not configured", { requestId });
      return {
        success: false,
        error: "Speech-to-text service is not configured",
      };
    }

    // Step 1: Download audio file
    console.info("[transcription] Downloading source audio", {
      requestId,
      audioUrl: redactUrl(audioUrl),
    });
    const audioResponse = await fetch(audioUrl);
    if (!audioResponse.ok) {
      console.error("[transcription] Source audio download failed", {
        requestId,
        status: audioResponse.status,
        statusText: audioResponse.statusText,
        responseBody: await readResponseBody(audioResponse),
      });
      throw new Error(
        `Failed to download audio: ${audioResponse.status} ${audioResponse.statusText}`
      );
    }

    const audioBlob = await audioResponse.blob();
    const audioFile = new File([audioBlob], fileName || "audio.m4a", {
      type: audioBlob.type,
    });
    console.info("[transcription] Source audio downloaded", {
      requestId,
      size: audioBlob.size,
      contentType: audioBlob.type || null,
    });

    // Step 2: Upload to transcription service
    const formData = new FormData();
    formData.append("file", audioFile);

    const uploadUrl = `${baseUrl}/transcribe?language=${encodeURIComponent(lang)}`;
    console.info("[transcription] Uploading to speech-to-text service", {
      requestId,
      uploadUrl,
      hasAuthorizationHeader: Boolean(apiKey),
      fileName: audioFile.name,
      fileSize: audioFile.size,
      fileType: audioFile.type || null,
    });
    const uploadResponse = await fetch(
      uploadUrl,
      {
        method: "POST",
        headers: apiKey ? { Authorization: `Bearer ${apiKey}` } : undefined,
        body: formData,
      }
    );

    if (!uploadResponse.ok) {
      const responseBody = await readResponseBody(uploadResponse);
      console.error("[transcription] Speech-to-text upload rejected", {
        requestId,
        uploadUrl,
        status: uploadResponse.status,
        statusText: uploadResponse.statusText,
        responseBody,
        hasAuthorizationHeader: Boolean(apiKey),
        wwwAuthenticate: uploadResponse.headers.get("www-authenticate"),
      });
      throw new Error(
        extractErrorMessage(responseBody) ||
          `Upload failed: ${uploadResponse.status} ${uploadResponse.statusText}`
      );
    }

    const uploadData = await uploadResponse.json();
    const jobId = uploadData.job_id;
    if (!jobId) {
      console.error("[transcription] Upload response has no job_id", {
        requestId,
        response: uploadData,
      });
      throw new Error("Transcription service returned no job ID");
    }

    console.info("[transcription] Upload accepted", {
      requestId,
      jobId,
      status: uploadResponse.status,
    });

    // Step 3: Poll for job completion (max 2 minutes)
    const maxAttempts = 120;
    let attempts = 0;

    while (attempts < maxAttempts) {
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const statusUrl = `${baseUrl}/jobs/${encodeURIComponent(jobId)}`;
      const statusResponse = await fetch(statusUrl, {
        headers: apiKey ? { Authorization: `Bearer ${apiKey}` } : undefined,
      });

      if (!statusResponse.ok) {
        const responseBody = await readResponseBody(statusResponse);
        console.error("[transcription] Job status request failed", {
          requestId,
          jobId,
          attempt: attempts + 1,
          status: statusResponse.status,
          statusText: statusResponse.statusText,
          responseBody,
          wwwAuthenticate: statusResponse.headers.get("www-authenticate"),
        });
        throw new Error(
          extractErrorMessage(responseBody) ||
            `Failed to check status: ${statusResponse.status} ${statusResponse.statusText}`
        );
      }

      const jobInfo = await statusResponse.json();
      if (attempts === 0 || attempts % 10 === 9 || jobInfo.status !== "processing") {
        console.info("[transcription] Job status", {
          requestId,
          jobId,
          attempt: attempts + 1,
          status: jobInfo.status,
        });
      }

      if (jobInfo.status === "completed" && jobInfo.result) {
        console.info("[transcription] Completed", {
          requestId,
          jobId,
          durationMs: Date.now() - startedAt,
          textLength: jobInfo.result.text?.length ?? 0,
          detectedLanguage: jobInfo.result.language || null,
          audioDuration: jobInfo.result.duration ?? null,
        });
        return {
          success: true,
          text: jobInfo.result.text || "",
          language: jobInfo.result.language || language,
          duration: jobInfo.result.duration,
          confidence: calculateAverageConfidence(jobInfo.result.segments),
        };
      }

      if (jobInfo.status === "failed") {
        throw new Error(
          jobInfo.error_message || "Transcription failed on server"
        );
      }

      if (jobInfo.status === "cancelled") {
        throw new Error("Transcription was cancelled");
      }

      attempts++;
    }

    throw new Error(
      "Transcription timeout: Job took longer than 2 minutes to complete"
    );
  } catch (error) {
    console.error("[transcription] Failed", {
      requestId,
      durationMs: Date.now() - startedAt,
      error: serializeError(error),
    });
    return {
      success: false,
      error: error instanceof Error ? error.message : "Transcription failed",
    };
  }
}

async function readResponseBody(response: Response): Promise<unknown> {
  const body = await response.text().catch(() => "");
  if (!body) {
    return null;
  }

  try {
    return JSON.parse(body);
  } catch {
    return body.slice(0, 2000);
  }
}

function extractErrorMessage(body: unknown): string | undefined {
  if (typeof body === "string") {
    return body || undefined;
  }

  if (body && typeof body === "object") {
    const data = body as Record<string, unknown>;
    const message = data.error ?? data.message ?? data.detail;
    return typeof message === "string" ? message : undefined;
  }
}

function redactUrl(value: string): string {
  try {
    const url = new URL(value);
    return `${url.origin}${url.pathname}`;
  } catch {
    return "invalid-url";
  }
}

function serializeError(error: unknown) {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
      cause: error.cause,
    };
  }

  return { message: String(error) };
}

/**
 * Calculate average confidence from segments
 */
function calculateAverageConfidence(
  segments?: Array<{ confidence?: number | null }>
): number | undefined {
  if (!segments || segments.length === 0) {
    return;
  }

  const confidences = segments
    .map((s) => s.confidence)
    .filter((c): c is number => c !== null && c !== undefined);

  if (confidences.length === 0) {
    return;
  }

  return confidences.reduce((sum, c) => sum + c, 0) / confidences.length;
}
