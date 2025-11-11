/**
 * AVRORA: Generate Video Tool
 *
 * Uses Replicate API (Stable Video Diffusion) to generate videos from images or text.
 *
 * API Key: REPLICATE_API_KEY
 * Model: stability-ai/stable-video-diffusion - Image-to-video generation
 */

import { tool } from "ai";
import Replicate from "replicate";
import { z } from "zod";
import { saveVideoToBlob } from "@/lib/blob/media-storage";

// Regex pattern for URL extraction (moved to top level for performance)
const URL_PATTERN = /https?:\/\/[^\s]+/i;

/**
 * Generate a video from an image URL
 *
 * Example usage in Sfera:
 * "@avrora создай видео из изображения: [url]"
 * "@avrora анимируй картинку: [url]"
 */
export const generateVideo = tool({
  description:
    "Generate a short video by animating an image. " +
    "Requires an image URL as input. " +
    "Returns a video file URL.",

  inputSchema: z.object({
    imageUrl: z
      .string()
      .url()
      .describe("URL of an image to animate (required for image-to-video)"),
    motion_bucket_id: z
      .number()
      .min(1)
      .max(255)
      .optional()
      .default(127)
      .describe("Motion intensity (1=minimal, 255=maximum, 127=balanced)"),
    cond_aug: z
      .number()
      .min(0)
      .max(1)
      .optional()
      .default(0.02)
      .describe("Conditioning augmentation (0-1, lower=closer to original)"),
    fps: z
      .number()
      .optional()
      .default(6)
      .describe("Frames per second (6 recommended for smoother output)"),
    decoding_t: z
      .number()
      .optional()
      .default(14)
      .describe("Number of frames to decode (max 25)"),
  }),

  execute: async ({
    imageUrl,
    motion_bucket_id,
    cond_aug,
    fps,
    decoding_t,
  }) => {
    try {
      // Check if API key is configured
      if (!process.env.REPLICATE_API_KEY) {
        return {
          success: false,
          error:
            "Replicate API key is not configured. Please add REPLICATE_API_KEY to your environment variables.",
          imageUrl,
        };
      }

      const replicate = new Replicate({
        auth: process.env.REPLICATE_API_KEY,
      });

      console.log(
        "🎬 Generating video with Replicate Stable Video Diffusion:",
        {
          imageUrl,
          motion_bucket_id,
          fps,
          decoding_t,
        }
      );

      // Run Stable Video Diffusion model
      const output = (await replicate.run(
        "stability-ai/stable-video-diffusion:3f0457e4619daac51203dedb472816fd4af51f3149fa7a9e0b5ffcf1b8172438",
        {
          input: {
            input_image: imageUrl,
            motion_bucket_id,
            cond_aug,
            fps,
            decoding_t,
            sizing_strategy: "maintain_aspect_ratio",
          },
        }
      )) as unknown as string;

      console.log("✅ Video generated (temporary URL):", output);
      console.log("📦 Saving generated video to Blob Storage...");

      // Save the generated video to Vercel Blob Storage for permanent access
      const videoUrl = await saveVideoToBlob(output);

      console.log("✅ Video saved to Blob Storage:", videoUrl);

      return {
        success: true,
        videoUrl,
        imageUrl,
        duration: Math.round(decoding_t / fps),
        fps,
        message: `Successfully animated image into a ${Math.round(decoding_t / fps)}s video`,
      };
    } catch (error) {
      console.error("❌ Error generating video:", error);

      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to generate video. Please try again.",
        imageUrl,
      };
    }
  },
});

/**
 * Helper function to extract video generation request from natural language
 */
export function parseVideoGenerationRequest(content: string): {
  imageUrl?: string;
} | null {
  const lowerContent = content.toLowerCase();

  // Check for video generation keywords
  const hasVideoIntent =
    lowerContent.includes("создай видео") ||
    lowerContent.includes("сгенерируй видео") ||
    lowerContent.includes("анимируй") ||
    lowerContent.includes("создай анимацию");

  if (!hasVideoIntent) {
    return null;
  }

  // Try to extract image URL
  const match = content.match(URL_PATTERN);

  if (match?.[0]) {
    return {
      imageUrl: match[0],
    };
  }

  // If no URL found but intent is clear, return empty object
  // (caller should prompt for image URL)
  return {};
}
