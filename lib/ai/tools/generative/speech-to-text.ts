/**
 * AVRORA: Speech-to-Text Tool
 *
 * Transcribes audio files to text using external Python service.
 *
 * API URL: SPEECH_TO_TEXT_API_URL (configured in .env)
 * Supported formats: MP3, M4A, WAV, WebM, OGG
 */

import { tool } from "ai";
import { z } from "zod";
import { transcribeAudio } from "@/lib/ai/transcription";

// Regex patterns for speech-to-text detection (moved to top level for performance)
const SPEECH_TO_TEXT_PATTERNS = [
  /преобразуй\s+(?:это\s+)?в\s+текст/i,
  /транскрибируй/i,
  /расшифруй\s+аудио/i,
  /что\s+говорится\s+в\s+аудио/i,
  /переведи\s+в\s+текст/i,
  /transcribe/i,
  /speech\s+to\s+text/i,
];

/**
 * Transcribe audio file to text
 *
 * Example usage in Sfera:
 * "@Avrora преобразуй в текст" (with audio attachment)
 */
export const speechToText = tool({
  description:
    "Transcribe audio file to text. " +
    "Supports MP3, M4A, WAV, WebM, and OGG formats. " +
    "Detects language automatically (Russian/English).",

  inputSchema: z.object({
    audioUrl: z.string().url().describe("URL of the audio file to transcribe"),
    language: z
      .enum(["ru", "en", "auto"])
      .optional()
      .default("auto")
      .describe("Language of the audio (auto-detect by default)"),
    fileName: z
      .string()
      .optional()
      .describe("Original filename of the audio file"),
  }),

  execute: async ({ audioUrl, language, fileName }) => {
    const result = await transcribeAudio(audioUrl, language, fileName);

    return {
      ...result,
      audioUrl,
      fileName,
      message: result.success
        ? "Audio successfully transcribed"
        : "Failed to transcribe audio. Please check the audio file and try again.",
    };
  },
});

/**
 * Helper function to detect if message requests transcription
 */
export function isSpeechToTextRequest(content: string): boolean {
  const lowerContent = content.toLowerCase();

  return SPEECH_TO_TEXT_PATTERNS.some((pattern) => pattern.test(lowerContent));
}

/**
 * Extract language preference from message content
 */
export function extractLanguagePreference(
  content: string
): "ru" | "en" | "auto" {
  const lowerContent = content.toLowerCase();

  if (
    lowerContent.includes("по-русски") ||
    lowerContent.includes("на русском")
  ) {
    return "ru";
  }

  if (
    lowerContent.includes("по-английски") ||
    lowerContent.includes("на английском") ||
    lowerContent.includes("in english")
  ) {
    return "en";
  }

  return "auto";
}
