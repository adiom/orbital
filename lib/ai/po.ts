import { createAIClient } from "../client";

export function createPoMode() {
  const ai = createAIClient("reasoning");

  return async function po(...lines: string[]) {
    return ai.chat(
      [
        "Mode: Poetic Pattern-Intuition",
        "Structure: metaphor + resonance + symbolic topology",
        "",
        ...lines,
      ].join("\n")
    );
  };
}
