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
  try {
    const baseUrl = process.env.SPEECH_TO_TEXT_API_URL?.replace(
      "/transcribe",
      ""
    );

    if (!baseUrl) {
      return {
        success: false,
        error: "Speech-to-text service is not configured",
      };
    }

    // Step 1: Download audio file
    const audioResponse = await fetch(audioUrl);
    if (!audioResponse.ok) {
      throw new Error(
        `Failed to download audio: ${audioResponse.statusText}`
      );
    }

    const audioBlob = await audioResponse.blob();
    const audioFile = new File([audioBlob], fileName || "audio.m4a", {
      type: audioBlob.type,
    });

    // Step 2: Upload to transcription service
    const formData = new FormData();
    formData.append("file", audioFile);

    const lang = language === "auto" ? "ru" : language;
    const uploadResponse = await fetch(
      `${baseUrl}/transcribe?language=${lang}`,
      {
        method: "POST",
        body: formData,
      }
    );

    if (!uploadResponse.ok) {
      const errorData = await uploadResponse.json().catch(() => ({}));
      throw new Error(
        errorData.error ||
          `Upload failed: ${uploadResponse.status} ${uploadResponse.statusText}`
      );
    }

    const { job_id } = await uploadResponse.json();

    // Step 3: Poll for job completion (max 2 minutes)
    const maxAttempts = 120;
    let attempts = 0;

    while (attempts < maxAttempts) {
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const statusResponse = await fetch(`${baseUrl}/jobs/${job_id}`);

      if (!statusResponse.ok) {
        throw new Error(
          `Failed to check status: ${statusResponse.statusText}`
        );
      }

      const jobInfo = await statusResponse.json();

      if (jobInfo.status === "completed" && jobInfo.result) {
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
    console.error("Transcription error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Transcription failed",
    };
  }
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
