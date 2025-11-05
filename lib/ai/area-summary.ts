import "server-only";
import { generateText } from "ai";
import { myProvider } from "./providers";

/**
 * Generate AI summary for forked Area
 * This creates a compressed context from parent Area's history
 */
export async function generateAreaSummary({
  areaTitle,
  areaDescription,
  chatHistory,
}: {
  areaTitle: string;
  areaDescription?: string;
  chatHistory: string;
}): Promise<string> {
  const model = myProvider.languageModel("chat-model");

  const prompt = `You are Avrora, an AI summarization agent. Your task is to create a concise summary of a parent Area's context for inheritance by a child Area.

**Parent Area:**
Title: ${areaTitle}
Description: ${areaDescription || "No description"}

**Chat History:**
${chatHistory}

**Your task:**
Create a concise summary (500-1000 tokens) that captures:
1. Key decisions made
2. Main topics discussed
3. Important conclusions or findings
4. Current state/direction

Format as a narrative that a team member joining the forked Area would need to understand the context.
Start with: "In the parent Area '${areaTitle}', we..."`;

  try {
    const { text } = await generateText({
      model,
      prompt,
    });

    return text;
  } catch (error) {
    console.error("Failed to generate area summary:", error);
    // Fallback summary
    return `Forked from Area "${areaTitle}". ${areaDescription || ""}`;
  }
}

/**
 * Generate changes summary for merge proposal
 */
export async function generateMergeSummary({
  sourceAreaTitle,
  targetAreaTitle,
  sourceContext,
}: {
  sourceAreaTitle: string;
  targetAreaTitle: string;
  sourceContext: string;
}): Promise<string> {
  const model = myProvider.languageModel("chat-model");

  const prompt = `You are Avrora, an AI merge analysis agent. Analyze what changed in a forked Area and summarize key insights for merging back.

**Source Area (branch):** ${sourceAreaTitle}
**Target Area (main):** ${targetAreaTitle}

**What happened in Source Area:**
${sourceContext}

**Your task:**
Create a concise summary (300-500 tokens) that captures:
1. What problems were solved
2. Key insights discovered
3. Recommended changes to merge back
4. Any potential conflicts or considerations

Format as bullet points for easy review.`;

  try {
    const { text } = await generateText({
      model,
      prompt,
    });

    return text;
  } catch (error) {
    console.error("Failed to generate merge summary:", error);
    return `Changes from Area "${sourceAreaTitle}" ready to merge into "${targetAreaTitle}".`;
  }
}
