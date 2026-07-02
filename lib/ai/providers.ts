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
  OLLAMA_CHAT: "gpt-oss:120b-cloud",
  OLLAMA_CHAT_MINI: "gpt-oss:20b-cloud",
  OLLAMA_REASONING: "gpt-oss:120b-cloud",
  OLLAMA_TITLE: "gpt-oss:20b-cloud",
  OLLAMA_ARTIFACT: "gpt-oss:20b-cloud",
  OLLAMA_POETIC: "gpt-oss:120b-cloud",
} as const;

// Ollama Cloud — primary provider (OpenAI-compatible API).
const ollamaApiKey = optionalEnv("OLLAMA_API_KEY");
const ollama = ollamaApiKey
  ? createOpenAI({
      apiKey: ollamaApiKey,
      baseURL: process.env.OLLAMA_CLOUD_BASE_URL || "https://ollama.com/v1",
    })
  : null;

// Gemini provider for image generation
export const geminiProvider = google;

// Build language model registry only with available providers (avoid undefined entries).
const languageModels: Record<string, LanguageModelV2> = {};

if (ollama) {
  languageModels["chat-model"] = ollama.chat(MODEL.OLLAMA_CHAT);
  languageModels["chat-model-mini"] = ollama.chat(MODEL.OLLAMA_CHAT_MINI);
  languageModels["chat-model-reasoning"] = wrapLanguageModel({
    model: ollama.languageModel(MODEL.OLLAMA_REASONING),
    middleware: extractReasoningMiddleware({ tagName: "think" }),
  });
  languageModels["title-model"] = ollama.chat(MODEL.OLLAMA_TITLE);
  languageModels["artifact-model"] = ollama.chat(MODEL.OLLAMA_ARTIFACT);
  languageModels.poetic = ollama.chat(MODEL.OLLAMA_POETIC);
  languageModels["poetic-reasoning"] = wrapLanguageModel({
    model: ollama.languageModel(MODEL.OLLAMA_POETIC),
    middleware: extractReasoningMiddleware({ tagName: "think" }),
  });
}

export const myProvider = customProvider({ languageModels });

export const myLanguageModels = languageModels;
export type ModelKey = keyof typeof myLanguageModels;
export const getModel = (key: ModelKey) => myLanguageModels[key];
