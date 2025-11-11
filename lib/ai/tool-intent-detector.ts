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
    | "createMiniApp"
    | "createChart"
    | "createGame"
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

  // Mini-app creation detection
  const miniAppIntent = detectMiniAppIntent(message);
  if (miniAppIntent.toolName) {
    return miniAppIntent;
  }

  // Chart creation detection
  const chartIntent = detectChartIntent(message);
  if (chartIntent.toolName) {
    return chartIntent;
  }

  // Game creation detection
  const gameIntent = detectGameIntent(message);
  if (gameIntent.toolName) {
    return gameIntent;
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

// Mini-app / Chart / Game patterns kept lean for performance
const MINI_APP_PATTERNS = [
  // Русский: "создай приложение калькулятор"
  /(?:создай|сделай)\s+(?:приложение|мини[‑\-\s]?приложение)\s*:?\s*(.+)/i,
  // Английский: "create mini app calculator"
  /(?:create|make)\s+(?:mini[‑\-\s]?app|application)\s*:?\s*(.+)/i,
  // Смешанный: "create приложение X" или "создай mini app X"
  /(?:создай|сделай|create|make)\s+(?:мини[‑\-\s]?приложение|mini[‑\-\s]?app|приложение|application)\s*:?\s*(.+)/i,
  // CamelCase: "createMiniApp calculator"
  /createMiniApp\s+(.+)/i,
  // Упрощенный: "создай mini app" (берём название из контекста или используем дефолт)
  /(?:создай|сделай|create|make)\s+mini[‑\-\s]?app\s*$/i,
  // Неполный с описанием: "простой @avrora создай mini app"
  /(.+?)\s*@?(?:avrora|аврора)?\s*(?:создай|сделай|create|make)\s+mini[‑\-\s]?app\s*$/i,
];
const CHART_PATTERNS = [
  /(?:построй|создай)\s+график\s*:?\s*(.+)/i,
];
const GAME_PATTERNS = [
  /(?:создай)\s+викторину\s*:?\s*(.+)/i,
  /(?:сделай|создай)\s+игру\s*:?\s*(.+)/i,
];

function detectMiniAppIntent(message: string): ToolIntent {
  for (let i = 0; i < MINI_APP_PATTERNS.length; i++) {
    const pattern = MINI_APP_PATTERNS[i];
    const match = message.match(pattern);
    if (match) {
      let title = "Mini App";
      let purpose = "Mini App";

      // Обработка разных типов паттернов
      if (i <= 3 && match[1]) {
        // Стандартные паттерны с захватом названия после команды
        title = match[1].trim();
        purpose = title;
      } else if (i === 4) {
        // Упрощенный паттерн без названия - используем дефолт или контекст
        title = "Calculator"; // или из контекста
        purpose = "Calculator app";
      } else if (i === 5) {
        // Паттерн с описанием перед командой: "простой/научный @avrora создай mini app"
        const description = match[1] ? match[1].trim() : "";
        // Извлекаем информацию из описания
        if (description.includes("калькулятор") || description.includes("calculator")) {
          title = "Calculator";
          purpose = description;
        } else if (description.includes("простой") || description.includes("научный")) {
          // Если указан тип калькулятора
          title = "Calculator";
          purpose = description + " калькулятор";
        } else if (description) {
          title = description.split(/\s+/)[0] || "Mini App";
          purpose = description;
        } else {
          title = "Calculator";
          purpose = "Calculator app";
        }
      }

      return {
        toolName: "createMiniApp",
        parameters: {
          title: title || "Mini App",
          purpose: purpose || title || "Mini App",
          features: ["input", "result"]
        },
        confidence: "high",
      };
    }
  }
  return { toolName: null, parameters: {}, confidence: "low" };
}

function detectChartIntent(message: string): ToolIntent {
  for (const pattern of CHART_PATTERNS) {
    const match = message.match(pattern);
    if (match) {
      const raw = match[1]?.trim();
      const title = raw && raw.length > 0 ? raw : "Chart";
      return {
        toolName: "createChart",
        parameters: {
          title,
          xLabel: "X",
            yLabel: "Y",
          type: "line",
          data: [
            { label: "Series 1", values: [1, 2, 3] },
            { label: "Series 2", values: [3, 2, 1] },
          ],
        },
        confidence: "high",
      };
    }
  }
  return { toolName: null, parameters: {}, confidence: "low" };
}

function detectGameIntent(message: string): ToolIntent {
  for (const pattern of GAME_PATTERNS) {
    const match = message.match(pattern);
    if (match) {
      const raw = match[1]?.trim();
      const title = raw && raw.length > 0 ? raw : "Quiz";
      return {
        toolName: "createGame",
        parameters: {
          title,
          genre: "quiz",
          difficulty: "easy",
          questions: [
            {
              question: "Пример вопроса 1",
              options: ["Вариант A", "Вариант B"],
              answerIndex: 0,
            },
            {
              question: "Пример вопроса 2",
              options: ["Да", "Нет"],
              answerIndex: 1,
            },
          ],
        },
        confidence: "high",
      };
    }
  }
  return { toolName: null, parameters: {}, confidence: "low" };
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
