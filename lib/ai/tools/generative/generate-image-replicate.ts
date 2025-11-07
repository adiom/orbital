/**
 * AVRORA: Generate Image Tool (Replicate)
 *
 * Uses Replicate API (FLUX model) to generate images from text descriptions.
 * Alternative to Gemini for image generation.
 *
 * API Key: REPLICATE_API_KEY
 * Model: black-forest-labs/flux-1.1-pro - Advanced text-to-image generation
 */

import { tool } from "ai";
import Replicate from "replicate";
import { z } from "zod";
import { saveImageToBlob } from "@/lib/blob/media-storage";

/**
 * Generate an image from a text prompt using Replicate FLUX
 *
 * Example usage in Sfera:
 * "@avrora сгенерируй картинку через replicate: космический корабль"
 * "@avrora создай иллюстрацию flux: уютная кофейня в стиле киберпанк"
 */
export const generateImageReplicate = tool({
  description:
    "Generate an image from a text description using Replicate FLUX model. " +
    "Useful for creating high-quality illustrations, concept art, or visual representations. " +
    "Returns an image URL.",

  inputSchema: z.object({
    prompt: z
      .string()
      .describe(
        "Detailed description of the image to generate. " +
          "Be specific about style, mood, composition, and details. " +
          "Example: 'A futuristic spaceship flying towards distant stars, " +
          "cyberpunk aesthetic, vibrant neon colors, detailed, 4k quality'"
      ),
    aspectRatio: z
      .enum(["1:1", "16:9", "9:16", "4:3", "3:4", "21:9", "9:21"])
      .optional()
      .default("1:1")
      .describe("Aspect ratio for the generated image"),
    outputFormat: z
      .enum(["webp", "jpg", "png"])
      .optional()
      .default("png")
      .describe("Output format for the image"),
    outputQuality: z
      .number()
      .min(0)
      .max(100)
      .optional()
      .default(80)
      .describe("Quality of the output image (0-100)"),
    safetyTolerance: z
      .number()
      .min(1)
      .max(6)
      .optional()
      .default(2)
      .describe("Safety tolerance level (1-6, lower is stricter)"),
  }),

  execute: async ({
    prompt,
    aspectRatio,
    outputFormat,
    outputQuality,
    safetyTolerance,
  }) => {
    console.log("🎯 [DEBUG] generateImageReplicate called with:", {
      prompt,
      aspectRatio,
      outputFormat,
      outputQuality,
      safetyTolerance,
    });

    try {
      // Check if API key is configured
      console.log("🔑 [DEBUG] Checking REPLICATE_API_KEY...");
      let apiKey = process.env.REPLICATE_API_KEY;

      if (!apiKey) {
        console.error("❌ [DEBUG] REPLICATE_API_KEY not found in environment");
        return {
          success: false,
          error:
            "Replicate API key is not configured. Please add REPLICATE_API_KEY to your environment variables.",
          prompt,
        };
      }

      // Clean up the API key (remove quotes, whitespace)
      apiKey = apiKey.trim().replace(/^["']|["']$/g, "");

      // Debug: показываем формат токена (первые и последние символы)
      console.log("✅ [DEBUG] REPLICATE_API_KEY found, format:", {
        starts_with: apiKey.substring(0, 3),
        length: apiKey.length,
        ends_with: apiKey.substring(apiKey.length - 3),
      });

      const replicate = new Replicate({
        auth: apiKey,
      });

      console.log("�� [DEBUG] Calling Replicate API with:", {
        prompt,
        aspect_ratio: aspectRatio,
        output_format: outputFormat,
        output_quality: outputQuality,
        safety_tolerance: safetyTolerance,
      });

      // Run FLUX 1.1 Pro model
      const output = (await replicate.run("black-forest-labs/flux-1.1-pro", {
        input: {
          prompt,
          aspect_ratio: aspectRatio,
          output_format: outputFormat,
          output_quality: outputQuality,
          safety_tolerance: safetyTolerance,
        },
      })) as unknown as string;

      console.log("📸 [DEBUG] Replicate API response:", output);

      if (!output) {
        console.error("❌ [DEBUG] No output from Replicate API");
        return {
          success: false,
          error: "No output received from Replicate API",
          prompt,
        };
      }

      console.log("💾 [DEBUG] Saving image to Blob Storage...");
      const imageUrl = await saveImageToBlob(output);
      console.log("✅ [DEBUG] Image saved:", imageUrl);

      const result = {
        success: true,
        imageUrl,
        prompt,
        aspectRatio,
        outputFormat,
        message: `Successfully generated image with FLUX: "${prompt}"`,
      };

      console.log("🎉 [DEBUG] Tool execution successful, returning:", result);
      return result;
    } catch (error) {
      console.error("💥 [DEBUG] Tool execution failed with error:", error);
      console.error(
        "💥 [DEBUG] Error stack:",
        error instanceof Error ? error.stack : "No stack trace"
      );

      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to generate image. Please try again.",
        prompt,
      };
    }
  },
});

/**
 * Helper function to extract Replicate image generation request from natural language
 */
export function parseReplicateImageRequest(content: string): {
  prompt: string;
  aspectRatio?: "1:1" | "16:9" | "9:16" | "4:3" | "3:4" | "21:9" | "9:21";
} | null {
  const lowerContent = content.toLowerCase();

  // Check for Replicate/FLUX specific keywords
  const isReplicateRequest =
    lowerContent.includes("replicate") ||
    lowerContent.includes("flux") ||
    lowerContent.includes("через replicate");

  if (!isReplicateRequest) {
    return null;
  }

  // Pattern matching for Russian prompts with Replicate/FLUX keywords
  const patterns = [
    /(?:сгенерируй|создай|нарисуй).*?(?:replicate|flux|через replicate).*?:\s*(.+)/i,
    /(?:replicate|flux).*?(?:сгенерируй|создай|нарисуй).*?:\s*(.+)/i,
  ];

  for (const pattern of patterns) {
    const match = content.match(pattern);
    if (match?.[1]) {
      return {
        prompt: match[1].trim(),
        aspectRatio: "1:1", // Default aspect ratio
      };
    }
  }

  return null;
}
