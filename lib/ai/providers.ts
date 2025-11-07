import { createOpenAI } from "@ai-sdk/openai";
import { google } from "@ai-sdk/google";
import {
  customProvider,
  extractReasoningMiddleware,
  wrapLanguageModel,
} from "ai";
import { isTestEnvironment } from "../constants";

const openai = createOpenAI({
  apiKey: process.env.MEGALLM_API_KEY,
  baseURL: "https://ai.megallm.io/v1",
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
          "chat-model-reasoning": reasoningModel,
          "title-model": titleModel,
          "artifact-model": artifactModel,
        },
      });
    })()
  : customProvider({
      languageModels: {
        "chat-model": openai.chat("gpt-5"),
        "chat-model-reasoning": wrapLanguageModel({
          model: openai.languageModel("gpt-5-mini"),
          middleware: extractReasoningMiddleware({ tagName: "think" }),
        }),
        "title-model": openai.chat("gpt-5-mini"),
        "artifact-model": openai.chat("gpt-5-mini"),
      },
    });
