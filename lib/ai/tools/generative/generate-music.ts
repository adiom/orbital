/**
 * AVRORA: Generate Music Tool
 *
 * Uses Replicate API (Musicgen model) to generate music from text descriptions.
 *
 * API Key: REPLICATE_API_KEY
 * Model: meta/musicgen - Text-to-music generation
 */

import { tool } from "ai";
import Replicate from "replicate";
import { z } from "zod";
import { saveMusicToBlob } from "@/lib/blob/media-storage";

/**
 * Generate music from a text prompt
 *
 * Example usage in Sfera:
 * "@avrora создай музыку: спокойная фоновая музыка для медитации"
 * "@avrora сгенерируй трек: энергичная электронная музыка в стиле synthwave"
 */
export const generateMusic = tool({
  description:
    "Generate music from a text description. " +
    "Specify genre, mood, tempo, and instruments. " +
    "Returns an audio file URL.",

  inputSchema: z.object({
    prompt: z
      .string()
      .describe(
        "Description of the music to generate. Include genre, mood, tempo, instruments. " +
          "Example: 'Calm ambient music for meditation, slow tempo, piano and strings'"
      ),
    duration: z
      .number()
      .min(5)
      .max(30)
      .optional()
      .default(10)
      .describe("Duration of the music in seconds (5-30)"),
    model_version: z
      .enum(["stereo-melody-large", "stereo-large", "melody-large", "large"])
      .optional()
      .default("stereo-melody-large")
      .describe("Musicgen model version (stereo-melody-large recommended)"),
  }),

  execute: async ({ prompt, duration, model_version }) => {
    try {
      // Check if API key is configured
      if (!process.env.REPLICATE_API_KEY) {
        return {
          success: false,
          error:
            "Replicate API key is not configured. Please add REPLICATE_API_KEY to your environment variables.",
          prompt,
          duration,
        };
      }

      const replicate = new Replicate({
        auth: process.env.REPLICATE_API_KEY,
      });

      console.log("🎵 Generating music with Replicate Musicgen:", {
        prompt,
        duration,
        model_version,
      });

      // Run Musicgen model
      const output = (await replicate.run(
        "meta/musicgen:671ac645ce5e552cc63a54a2bbff63fcf798043055d2dac5fc9e36a837eedcfb",
        {
          input: {
            prompt,
            model_version,
            output_format: "mp3",
            normalization_strategy: "peak",
            duration,
          },
        }
      )) as unknown as string;

      console.log("✅ Music generated (temporary URL):", output);
      console.log("📦 Saving generated music to Blob Storage...");

      // Save the generated music to Vercel Blob Storage for permanent access
      const audioUrl = await saveMusicToBlob(output);

      console.log("✅ Music saved to Blob Storage:", audioUrl);

      return {
        success: true,
        audioUrl,
        prompt,
        duration,
        model_version,
        message: `Successfully generated ${duration}s music track: "${prompt}"`,
      };
    } catch (error) {
      console.error("❌ Error generating music:", error);

      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to generate music. Please try again.",
        prompt,
        duration,
      };
    }
  },
});

/**
 * Helper function to extract music generation request from natural language
 */
export function parseMusicGenerationRequest(content: string): {
  prompt: string;
  duration?: number;
} | null {
  const lowerContent = content.toLowerCase();

  const patterns = [
    /(?:создай|сгенерируй)\s+(?:музыку|трек|песню|мелодию):\s*(.+)/i,
    /(?:создай|сгенерируй)\s+(?:музыку|трек|песню|мелодию)\s+(.+)/i,
  ];

  for (const pattern of patterns) {
    const match = content.match(pattern);
    if (match?.[1]) {
      return {
        prompt: match[1].trim(),
        duration: 10, // Default duration
      };
    }
  }

  return null;
}
