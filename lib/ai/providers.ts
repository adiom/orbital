import "server-only";

import fs from "node:fs";
import path from "node:path";
import { google } from "@ai-sdk/google";
import { createOpenAI } from "@ai-sdk/openai";
import type { LanguageModelV2 } from "@ai-sdk/provider";
import {
  customProvider,
  extractReasoningMiddleware,
  wrapLanguageModel,
} from "ai";

// Lightweight .env.local loader (avoids external dependency on dotenv).
try {
  const envPath = path.resolve(process.cwd(), ".env.local");
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, "utf8");
    for (const line of content.split(/\r?\n/)) {
      if (!line || line.trim().startsWith("#")) {
        continue;
      }
      const eq = line.indexOf("=");
      if (eq === -1) {
        continue;
      }
      const key = line.slice(0, eq).trim();
      const value = line.slice(eq + 1).trim();
      if (!process.env[key]) {
        process.env[key] = value;
      }
    }
  }
} catch (e) {
  console.warn("[providers] Failed to load .env.local", e);
}

// Helper: in server/test environments we may want a soft-fail fallback.
const optionalEnv = (name: string): string | undefined => {
  const value = process.env[name];
  return value && value.trim() !== "" ? value : undefined;
};

// Centralized model IDs for easier maintenance.
const MODEL = {
  OPENAI_CHAT_TOOL: "openai-gpt-oss-120b",
  OPENAI_CHAT_MINI: "openai-gpt-oss-20b",
  OPENAI_REASONING_LIGHT: "deepseek-ai/deepseek-v3.1-terminus",
  OPENAI_TITLE: "moonshotai/kimi-k2-instruct-0905",
  OPENAI_ARTIFACT: "moonshotai/kimi-k2-instruct-0905",
  CLAUDE_POETIC: "claude-sonnet-4-5-20250929",
  // Alias expected by test script
  CLAUDE_SONNET_LATEST: "claude-sonnet-4-5-20250929",
} as const;

const openaiApiKey = optionalEnv("MEGALLM_API_KEY");
const openai = openaiApiKey
  ? createOpenAI({
      apiKey: openaiApiKey,
      baseURL: process.env.OPENAI_URL || undefined,
    })
  : null;

// Anthropic/Claude. If key missing, we skip adding claude models.
const claudeApiKey = optionalEnv("MEGALLM_API_KEY");
const claude = claudeApiKey
  ? createOpenAI({
      apiKey: claudeApiKey,
      baseURL: process.env.OPENAI_URL || undefined,
    })
  : null;

// Gemini provider for image generation
export const geminiProvider = google;

// Build language model registry only with available providers (avoid undefined entries).
const languageModels: Record<string, LanguageModelV2> = {};

if (openai) {
  languageModels["chat-model"] = openai.chat(MODEL.OPENAI_CHAT_TOOL);
  languageModels["chat-model-mini"] = openai.chat(MODEL.OPENAI_CHAT_MINI);
  languageModels["chat-model-reasoning"] = wrapLanguageModel({
    model: openai.languageModel(MODEL.OPENAI_REASONING_LIGHT),
    middleware: extractReasoningMiddleware({ tagName: "think" }),
  });
  languageModels["title-model"] = openai.chat(MODEL.OPENAI_TITLE);
  languageModels["artifact-model"] = openai.chat(MODEL.OPENAI_ARTIFACT);
}

if (claude) {
  languageModels.poetic = claude.chat(MODEL.CLAUDE_POETIC);
  languageModels[MODEL.CLAUDE_SONNET_LATEST] = claude.chat(
    MODEL.CLAUDE_SONNET_LATEST
  );
  languageModels["poetic-reasoning"] = wrapLanguageModel({
    model: claude.languageModel(MODEL.CLAUDE_POETIC),
    middleware: extractReasoningMiddleware({ tagName: "think" }),
  });
}

export const myProvider = customProvider({ languageModels });

export const myLanguageModels = languageModels;
export type ModelKey = keyof typeof myLanguageModels;
export const getModel = (key: ModelKey) => myLanguageModels[key];
