import { tool } from "ai";
import { z } from "zod";
import { generateUUID } from "@/lib/utils";

// Minimal schema – later can be expanded with components/schema definitions
const miniAppInput = z.object({
  title: z
    .string()
    .min(2)
    .describe("Human readable title for the mini app"),
  purpose: z
    .string()
    .min(4)
    .describe(
      "Short description of what the app should help with (e.g. calorie tracking)"
    ),
  features: z
    .array(z.string().min(2))
    .min(1)
    .max(10)
    .default(["input", "result"])
    .describe("List of core features / modules"),
});

export const createMiniApp = tool({
  description:
    "Create a structured mini-app specification (no code execution). " +
    "Returns a fast JSON spec that the client can render immediately.",
  inputSchema: miniAppInput,
  execute: async ({ title, purpose, features }) => {
    const id = generateUUID();
    // Simple deterministic layout plan (kept minimal for speed)
    const layout = [
      { id: "header", type: "header", text: title },
      { id: "purpose", type: "text", text: purpose },
      ...features.map((f, i) => ({ id: `feature-${i}`, type: "module", name: f })),
    ];

    return {
      toolName: "create-mini-app",
      id,
      title,
      purpose,
      features,
      layout,
      specVersion: 1,
      message: "Mini-app specification created",
    };
  },
});

