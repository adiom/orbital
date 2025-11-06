import { createAnthropic } from "@ai-sdk/anthropic";
import {
  customProvider,
  extractReasoningMiddleware,
  wrapLanguageModel,
} from "ai";
import { isTestEnvironment } from "../constants";

const openai = createAnthropic({
  apiKey: process.env.MEGALLM_API_KEY,
  baseURL: "https://ai.megallm.io/v1",
});

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
