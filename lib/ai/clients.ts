import type { LanguageModel } from "ai";
import { generateText, streamText } from "ai";
import { myLanguageModels, myProvider } from "@/lib/ai/providers";

type Role = "primary" | "mini" | "reasoning" | "title" | "artifact";

const map: Record<Role, string> = {
  primary: "chat-model",
  mini: "chat-model-mini",
  reasoning: "chat-model-reasoning",
  title: "title-model",
  artifact: "artifact-model",
};

export function createAIClient(defaultRole: Role = "primary") {
  function use(role: Role = defaultRole): LanguageModel {
    const id = map[role];
    try {
      return myProvider.languageModel(id);
    } catch {
      throw new Error(
        `[AI-Client] Model not found or unavailable: ${role} (${id})`
      );
    }
  }

  return {
    use,
    chat: {
      completions: {
        create: async (options: any) => {
          const lm = myLanguageModels;
          const availableIds = Object.keys(lm);
          console.log("Available models:", availableIds);
          if (availableIds.length === 0) {
            throw new Error("[AI-Client] No language models available.");
          }
          const requestedId: string | undefined =
            options.model && lm[options.model] ? options.model : undefined;
          const fallbackId = availableIds.includes("poetic")
            ? "poetic"
            : availableIds[0];
          const chosenId = requestedId || fallbackId;
          const chosen = lm[chosenId];
          const result = await generateText({
            model: chosen,
            messages: options.messages,
          });
          return {
            choices: [{ message: { content: result.text } }],
          };
        },
      },
    },
    stream: (text: string, role?: Role) => {
      const model = use(role);
      return streamText({ model, prompt: text });
    },
  };
}
