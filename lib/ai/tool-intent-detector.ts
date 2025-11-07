/**
 * AVRORA: Tool Intent Detector
 *
 * Detects user intent from messages and extracts parameters for tool execution.
 * Used for manual tool handling when AI SDK's automatic function calling doesn't work properly.
 */

export interface ToolIntent {
  toolName:
    | "generateImage"
    | "generateImageReplicate"
    | "generateMusic"
    | "generateVideo"
    | "summarizeDiscussion"
    | null;
  parameters: Record<string, any>;
  confidence: "high" | "medium" | "low";
}

/**
 * Detect tool intent from user message
 */
export function detectToolIntent(message: string): ToolIntent {
  const lowerMessage = message.toLowerCase();

  // Image generation detection
  const imageIntent = detectImageGenerationIntent(message);
  if (imageIntent.toolName) {
    return imageIntent;
  }

  // Music generation detection
  const musicIntent = detectMusicGenerationIntent(message);
  if (musicIntent.toolName) {
    return musicIntent;
  }

  // Video generation detection
  const videoIntent = detectVideoGenerationIntent(message);
  if (videoIntent.toolName) {
    return videoIntent;
  }

  // Summary detection
  const summaryIntent = detectSummaryIntent(message);
  if (summaryIntent.toolName) {
    return summaryIntent;
  }

  // No tool intent detected
  return {
    toolName: null,
    parameters: {},
    confidence: "low",
  };
}

/**
 * Detect image generation intent
 */
function detectImageGenerationIntent(message: string): ToolIntent {
  const lowerMessage = message.toLowerCase();

  // Replicate-specific patterns
  const replicatePatterns = [
    /(?:нарисуй|создай|сгенерируй).*?(?:через\s+)?(?:replicate|flux)/i,
    /(?:replicate|flux).*?(?:нарисуй|создай|сгенерируй)/i,
  ];

  for (const pattern of replicatePatterns) {
    if (pattern.test(message)) {
      const prompt = extractPromptFromMessage(message);
      if (prompt) {
        return {
          toolName: "generateImageReplicate",
          parameters: { prompt },
          confidence: "high",
        };
      }
    }
  }

  // General image generation patterns
  const imagePatterns = [
    /(?:нарисуй|нарисовать)\s+(.+)/i,
    /(?:создай|создать)\s+(?:картинку|изображение|рисунок)\s*:?\s*(.+)/i,
    /(?:сгенерируй|сгенерировать)\s+(?:картинку|изображение)\s*:?\s*(.+)/i,
    /(?:покажи|нужна|хочу)\s+(?:картинку|изображение)\s*:?\s*(.+)/i,
  ];

  for (const pattern of imagePatterns) {
    const match = message.match(pattern);
    if (match) {
      let prompt = match[1]?.trim();
      // Clean up prompt from mentions
      if (prompt) {
        prompt = prompt.replace(/@avrora|@аврора/gi, "").trim();
        if (prompt.length > 3) {
          return {
            toolName: "generateImage", // Default to Gemini
            parameters: { prompt },
            confidence: "high",
          };
        }
      }
    }
  }

  return {
    toolName: null,
    parameters: {},
    confidence: "low",
  };
}

/**
 * Detect music generation intent
 */
function detectMusicGenerationIntent(message: string): ToolIntent {
  const lowerMessage = message.toLowerCase();

  const musicPatterns = [
    /(?:создай|сгенерируй|сделай)\s+(?:музыку|трек|песню|мелодию)\s*:?\s*(.+)/i,
    /(?:музыка|трек|песня|мелодия)\s*:?\s*(.+)/i,
  ];

  for (const pattern of musicPatterns) {
    const match = message.match(pattern);
    if (match) {
      let prompt = match[1]?.trim();
      if (prompt) {
        prompt = prompt.replace(/@avrora|@аврора/gi, "").trim();
        if (prompt.length > 3) {
          return {
            toolName: "generateMusic",
            parameters: { prompt },
            confidence: "high",
          };
        }
      }
    }
  }

  return {
    toolName: null,
    parameters: {},
    confidence: "low",
  };
}

/**
 * Detect video generation intent
 */
function detectVideoGenerationIntent(message: string): ToolIntent {
  const lowerMessage = message.toLowerCase();

  const videoPatterns = [
    /(?:создай|сгенерируй|сделай)\s+(?:видео|анимацию|ролик)\s*:?\s*(.+)/i,
    /(?:анимируй|заанимируй)\s+(.+)/i,
  ];

  for (const pattern of videoPatterns) {
    const match = message.match(pattern);
    if (match) {
      let prompt = match[1]?.trim();
      if (prompt) {
        prompt = prompt.replace(/@avrora|@аврора/gi, "").trim();
        if (prompt.length > 3) {
          return {
            toolName: "generateVideo",
            parameters: { prompt },
            confidence: "high",
          };
        }
      }
    }
  }

  return {
    toolName: null,
    parameters: {},
    confidence: "low",
  };
}

/**
 * Detect summary intent
 */
function detectSummaryIntent(message: string): ToolIntent {
  const lowerMessage = message.toLowerCase();

  const summaryKeywords = [
    "резюмируй",
    "подведи итог",
    "суммируй",
    "обобщи",
    "summarize",
    "summary",
  ];

  const hasSummaryKeyword = summaryKeywords.some((keyword) =>
    lowerMessage.includes(keyword)
  );

  if (hasSummaryKeyword) {
    // Detect summary length
    let summaryLength: "brief" | "medium" | "detailed" = "medium";

    if (
      lowerMessage.includes("кратко") ||
      lowerMessage.includes("коротко") ||
      lowerMessage.includes("brief")
    ) {
      summaryLength = "brief";
    } else if (
      lowerMessage.includes("подробно") ||
      lowerMessage.includes("детально") ||
      lowerMessage.includes("detailed")
    ) {
      summaryLength = "detailed";
    }

    return {
      toolName: "summarizeDiscussion",
      parameters: { summaryLength },
      confidence: "high",
    };
  }

  return {
    toolName: null,
    parameters: {},
    confidence: "low",
  };
}

/**
 * Extract prompt from message (helper)
 */
function extractPromptFromMessage(message: string): string | null {
  // Try to find prompt after common patterns
  const patterns = [
    /(?:нарисуй|создай|сгенерируй).*?[:\-]\s*(.+)/i,
    /(?:replicate|flux).*?[:\-]\s*(.+)/i,
    /(?:нарисуй|создай|сгенерируй)\s+(.+)/i,
  ];

  for (const pattern of patterns) {
    const match = message.match(pattern);
    if (match?.[1]) {
      let prompt = match[1].trim();
      // Clean up
      prompt = prompt.replace(/@avrora|@аврора/gi, "").trim();
      if (prompt.length > 3) {
        return prompt;
      }
    }
  }

  return null;
}
