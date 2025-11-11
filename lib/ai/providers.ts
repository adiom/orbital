import { google } from "@ai-sdk/google";
import { createOpenAI } from "@ai-sdk/openai";
import {
  customProvider,
  extractReasoningMiddleware,
  wrapLanguageModel,
} from "ai";
import { isTestEnvironment } from "../constants";

const openai = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: process.env.OPENAI_URL,
});

// Gemini provider for image generation
export const geminiProvider = google;

export const myProvider = isTestEnvironment
  ? (() => {
      const {
        artifactModel,
        chatModel,
        reasoningModel,
        titleModel,
      } = require("./models.mock");
      return customProvider({
        languageModels: {
          "chat-model": chatModel,
          "chat-model-mini": titleModel, // Use title model as mini for testing
          "chat-model-reasoning": reasoningModel,
          "title-model": titleModel,
          "artifact-model": artifactModel,
        },
      });
    })()
  : customProvider({
      languageModels: {
        "chat-model": openai.chat("gpt-5-mini"), // For tool calling
        "chat-model-mini": openai.chat("gpt-5-nano"), // For simple text conversations
        "chat-model-reasoning": wrapLanguageModel({
          model: openai.languageModel("gpt-5-nano"),
          middleware: extractReasoningMiddleware({ tagName: "think" }),
        }),
        "title-model": openai.chat("gpt-5-nano"),
        "artifact-model": openai.chat("gpt-5-nano"),
      },
    });
