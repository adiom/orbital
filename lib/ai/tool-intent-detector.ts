/**
 * AVRORA: Tool Intent Detector
 *
 * Detects user intent from messages and extracts parameters for tool execution.
 * Used for manual tool handling when AI SDK's automatic function calling doesn't work properly.
 */

// Regex patterns for tool intent detection (moved to top level for performance)
const REPLICATE_PATTERNS = [
  /(?:нарисуй|создай|сгенерируй).*?(?:через\s+)?(?:replicate|flux)/i,
  /(?:replicate|flux).*?(?:нарисуй|создай|сгенерируй)/i,
];

const IMAGE_PATTERNS = [
  /(?:нарисуй|нарисовать)\s+(.+)/i,
  /(?:создай|создать)\s+(?:картинку|изображение|рисунок)\s*:?\s*(.+)/i,
  /(?:сгенерируй|сгенерировать)\s+(?:картинку|изображение)\s*:?\s*(.+)/i,
  /(?:покажи|нужна|хочу)\s+(?:картинку|изображение)\s*:?\s*(.+)/i,
];

const MUSIC_PATTERNS = [
  /(?:создай|сгенерируй|сделай)\s+(?:музыку|трек|песню|мелодию)\s*:?\s*(.+)/i,
  /(?:музыка|трек|песня|мелодия)\s*:?\s*(.+)/i,
];

const VIDEO_PATTERNS = [
  /(?:создай|сгенерируй|сделай)\s+(?:видео|анимацию|ролик)\s*:?\s*(.+)/i,
  /(?:анимируй|заанимируй)\s+(.+)/i,
];

const SPEECH_TO_TEXT_PATTERNS = [
  /преобразуй\s+(?:это\s+)?в\s+текст/i,
  /транскрибируй/i,
  /расшифруй\s+аудио/i,
  /что\s+говорится\s+в\s+аудио/i,
  /переведи\s+в\s+текст/i,
  /transcribe/i,
  /speech\s+to\s+text/i,
];

const CLEANUP_PATTERNS = [
  /^(?:найди|поищи|погугли)\s+(?:информацию\s+)?(?:о|про)?\s*/i,
  /^(?:search for|find|look up)\s+/i,
  /^(?:что нового|какие новости)\s+(?:о|про|в|about)?\s*/i,
  /^(?:расскажи|tell me)\s+(?:о|про|about)\s+/i,
];

const PROMPT_EXTRACTION_PATTERNS = [
  /(?:нарисуй|создай|сгенерируй).*?[:-]\s*(.+)/i,
  /(?:replicate|flux).*?[:-]\s*(.+)/i,
  /(?:нарисуй|создай|сгенерируй)\s+(.+)/i,
];

export type ToolIntent = {
  toolName:
    | "generateImage"
    | "generateImageReplicate"
    | "generateMusic"
    | "generateVideo"
    | "speechToText"
    | "summarizeDiscussion"
    | "webSearch"
    | null;
  parameters: Record<string, any>;
  confidence: "high" | "medium" | "low";
};

/**
 * Detect tool intent from user message
 */
export function detectToolIntent(message: string): ToolIntent {
  const _lowerMessage = message.toLowerCase();

  // Web search detection
  const webSearchIntent = detectWebSearchIntent(message);
  if (webSearchIntent.toolName) {
    return webSearchIntent;
  }

  // Speech-to-text detection
  const speechToTextIntent = detectSpeechToTextIntent(message);
  if (speechToTextIntent.toolName) {
    return speechToTextIntent;
  }

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
  const _lowerMessage = message.toLowerCase();

  // Replicate-specific patterns
  for (const pattern of REPLICATE_PATTERNS) {
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
  for (const pattern of IMAGE_PATTERNS) {
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
  const _lowerMessage = message.toLowerCase();

  for (const pattern of MUSIC_PATTERNS) {
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
  const _lowerMessage = message.toLowerCase();

  for (const pattern of VIDEO_PATTERNS) {
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
 * Detect speech-to-text intent
 */
function detectSpeechToTextIntent(message: string): ToolIntent {
  const lowerMessage = message.toLowerCase();

  // Check if message matches speech-to-text patterns
  for (const pattern of SPEECH_TO_TEXT_PATTERNS) {
    if (pattern.test(message)) {
      // Extract language preference if mentioned
      let language: "ru" | "en" | "auto" = "auto";

      if (
        lowerMessage.includes("по-русски") ||
        lowerMessage.includes("на русском")
      ) {
        language = "ru";
      } else if (
        lowerMessage.includes("по-английски") ||
        lowerMessage.includes("на английском") ||
        lowerMessage.includes("in english")
      ) {
        language = "en";
      }

      return {
        toolName: "speechToText",
        parameters: { language },
        confidence: "high",
      };
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
 * Detect web search intent
 */
function detectWebSearchIntent(message: string): ToolIntent {
  const lowerMessage = message.toLowerCase();

  // Web search patterns (русский и английский)
  const searchKeywords = [
    "найди",
    "найди информацию",
    "поищи",
    "погугли",
    "что нового",
    "какие новости",
    "что произошло",
    "расскажи о",
    "информация о",
    "search for",
    "find",
    "look up",
    "what's new",
    "latest news",
    "tell me about",
  ];

  const hasSearchKeyword = searchKeywords.some((keyword) =>
    lowerMessage.includes(keyword)
  );

  if (hasSearchKeyword) {
    // Extract query from message
    let query = message.replace(/@avrora|@аврора/gi, "").trim();

    // Remove search keywords to get cleaner query
    for (const pattern of CLEANUP_PATTERNS) {
      query = query.replace(pattern, "").trim();
    }

    if (query.length > 2) {
      return {
        toolName: "webSearch",
        parameters: {
          query,
          maxResults: 5,
          searchDepth: "basic",
        },
        confidence: "high",
      };
    }
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
  for (const pattern of PROMPT_EXTRACTION_PATTERNS) {
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
