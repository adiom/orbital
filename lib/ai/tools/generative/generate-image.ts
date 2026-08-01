/**
 * AVRORA: Generate Image Tool
 *
 * Uses the Banita OpenAI-compatible API to generate images from text descriptions.
 * This tool is available in Sfera collaborative discussions via @avrora mentions.
 */

import { tool } from "ai";
import { z } from "zod";
import "dotenv/config";

// Regex patterns for prompt extraction (moved to top level for performance)
const PROMPT_PATTERNS = [
  /(?:сгенерируй|создай|нарисуй)\s+(?:картинку|иллюстрацию|изображение):\s*(.+)/i,
  /(?:сгенерируй|создай|нарисуй)\s+(.+)/i,
];

/**
 * Generate an image from a text prompt using Banita Sketch
 *
 * Example usage in Sfera:
 * "@avrora сгенерируй картинку: космический корабль летящий к звёздам"
 * "@avrora создай иллюстрацию: уютная кофейня в стиле киберпанк"
 */
export const generateImage = tool({
  description:
    "Generate an image from a text description using AI. " +
    "Useful for creating illustrations, concept art, or visual representations " +
    "of ideas discussed in Sfera. Returns an image URL.",

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
      .enum(["1:1", "16:9", "9:16", "4:3", "3:4"])
      .optional()
      .default("1:1")
      .describe("Aspect ratio for the generated image"),
    negativePrompt: z
      .string()
      .optional()
      .describe(
        "Things to avoid in the image (e.g., 'blurry, low quality, distorted')"
      ),
  }),

  execute: async ({ prompt, aspectRatio, negativePrompt }) => {
    try {
      // Enhance the prompt with quality modifiers
      let enhancedPrompt = prompt;
      if (!prompt.toLowerCase().includes("quality")) {
        enhancedPrompt += ", high quality, detailed";
      }

      // Add negative prompt if provided
      if (negativePrompt) {
        enhancedPrompt += ` | Avoid: ${negativePrompt}`;
      }

      const apiKey = process.env.BANITA_API_KEY?.trim();
      if (!apiKey) {
        throw new Error("BANITA_API_KEY is not configured");
      }

      const baseUrl = (
        process.env.BANITA_IMAGE_API_URL || "https://banita.canfly.org"
      ).replace(/\/$/, "");
      const response = await fetch(`${baseUrl}/v1/images/generations`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "banita-sketch",
            prompt: enhancedPrompt,
            n: 1,
            response_format: "url",
          }),
        });

      const result = (await response.json()) as {
        data?: Array<{ url?: string }>;
        error?: { message?: string } | string;
      };

      if (!response.ok) {
        const errorMessage =
          typeof result.error === "string"
            ? result.error
            : result.error?.message;
        throw new Error(
          errorMessage || `Banita image API returned ${response.status}`
        );
      }

      const imageUrl = result.data?.[0]?.url;
      if (!imageUrl) {
        throw new Error("No image URL returned by Banita");
      }

      return {
        success: true,
        imageUrl,
        prompt: enhancedPrompt,
        aspectRatio,
        message: `Successfully generated image with prompt: "${prompt}"`,
      };
    } catch (error) {
      console.error("Error generating image:", error);

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
 * Helper function to extract image generation request from natural language
 */
export function parseImageGenerationRequest(content: string): {
  prompt: string;
  aspectRatio?: "1:1" | "16:9" | "9:16" | "4:3" | "3:4";
} | null {
  const _lowerContent = content.toLowerCase();

  // Pattern matching for Russian prompts
  for (const pattern of PROMPT_PATTERNS) {
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
