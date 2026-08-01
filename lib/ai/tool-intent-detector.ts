/**
 * AVRORA: Tool Intent Detector
 *
 * Detects user intent from messages and extracts parameters for tool execution.
 * Used for manual tool handling when AI SDK's automatic function calling doesn't work properly.
 */

// Regex patterns for tool intent detection (moved to top level for performance)
const AVRORA_PATTERN = /(?:аврора|avrora)\s+/i;
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

// List tools patterns - when user asks about available tools
const LIST_TOOLS_PATTERNS = [
  /(?:список|перечень|покажи|скинь|расскажи про)\s+(?:свои\s+)?(?:tool|тул|инструмент|возможност|функци)/i,
  /(?:какие|что)\s+(?:у тебя есть|ты умеешь|ты можешь|есть)\s+(?:tool|тул|инструмент|возможност|функци)/i,
  /(?:что\s+)?(?:ты|вы)\s+(?:умеешь|можешь|умеете|можете)/i,
  /(?:твои|ваши)\s+(?:tool|тул|инструмент|возможност|функци)/i,
  /помощь|help|справка/i,
];

// Pattern to match "Аврора/Avrora [tool name]" for explicit tool detection
// Updated to support both Latin and Cyrillic characters
// The tool name should be a single word or hyphenated word (e.g., "mini-app")
const EXPLICIT_TOOL_PATTERN =
  /(?:аврора|avrora)\s+([\wа-яА-Я]+(?:[-][\wа-яА-Я]+)?)/gi;

export type ToolIntent = {
  toolName:
    | "generateImage"
    | "generateMusic"
    | "generateVideo"
    | "speechToText"
    | "summarizeDiscussion"
    | "webSearch"
    | "createMiniApp"
    | "createChart"
    | "createGame"
    | "listTools"
    | null;
  parameters: Record<string, any>;
  confidence: "high" | "medium" | "low";
};

/**
 * Detect explicit tool mention after "Аврора" or "Avrora"
 * Example: "Аврора generateImage котик" or "Аврора mini app калькулятор"
 */
function detectExplicitToolIntent(message: string): ToolIntent {
  // Use the top-level pattern constant
  // Need to create a new RegExp instance for each call since global flag is used
  const pattern = new RegExp(EXPLICIT_TOOL_PATTERN.source, "gi");
  const match = message.match(pattern);

  if (!match) {
    return { toolName: null, parameters: {}, confidence: "low" };
  }

  // Extract the tool name from the match
  const fullMatch = match[0];
  const toolPart = fullMatch.replace(AVRORA_PATTERN, "").toLowerCase();

  // Extract the rest of the message as parameters
  const paramText = message
    .substring(message.indexOf(fullMatch) + fullMatch.length)
    .trim();

  // Map common tool names and variations
  const toolMappings: Record<string, ToolIntent["toolName"]> = {
    // Image generation
    generateimage: "generateImage",
    "generate-image": "generateImage",
    image: "generateImage",
    картинка: "generateImage",
    изображение: "generateImage",
    рисунок: "generateImage",

    // Music generation
    generatemusic: "generateMusic",
    "generate-music": "generateMusic",
    music: "generateMusic",
    музыка: "generateMusic",
    трек: "generateMusic",
    песня: "generateMusic",

    // Video generation
    generatevideo: "generateVideo",
    "generate-video": "generateVideo",
    video: "generateVideo",
    видео: "generateVideo",
    анимация: "generateVideo",

    // Speech to text
    speechtotext: "speechToText",
    "speech-to-text": "speechToText",
    speech: "speechToText",
    transcribe: "speechToText",
    транскрипция: "speechToText",

    // Summary
    summarize: "summarizeDiscussion",
    summary: "summarizeDiscussion",
    резюме: "summarizeDiscussion",
    итог: "summarizeDiscussion",

    // Web search
    websearch: "webSearch",
    "web-search": "webSearch",
    search: "webSearch",
    поиск: "webSearch",
    найди: "webSearch",

    // Mini app
    miniapp: "createMiniApp",
    "mini-app": "createMiniApp",
    "mini app": "createMiniApp",
    createminiapp: "createMiniApp",
    приложение: "createMiniApp",
    app: "createMiniApp",

    // Chart
    chart: "createChart",
    createchart: "createChart",
    график: "createChart",
    диаграмма: "createChart",

    // Game
    game: "createGame",
    creategame: "createGame",
    игра: "createGame",
    викторина: "createGame",
    quiz: "createGame",
  };

  // Normalize the tool part for lookup
  const normalizedTool = toolPart.replace(/[-_\s]+/g, "").toLowerCase();
  const detectedToolName =
    toolMappings[normalizedTool] || toolMappings[toolPart];

  if (!detectedToolName) {
    return { toolName: null, parameters: {}, confidence: "low" };
  }

  // Prepare parameters based on the tool type
  let parameters: Record<string, any> = {};

  switch (detectedToolName) {
    case "generateImage":
      parameters = { prompt: paramText || "красивая картинка" };
      break;
    case "generateMusic":
      parameters = { prompt: paramText || "спокойная музыка" };
      break;
    case "generateVideo":
      parameters = { prompt: paramText || "красивое видео" };
      break;
    case "speechToText":
      parameters = { language: "auto" };
      break;
    case "summarizeDiscussion":
      parameters = { summaryLength: "medium" };
      break;
    case "webSearch":
      parameters = {
        query: paramText || "последние новости",
        maxResults: 5,
        searchDepth: "basic",
      };
      break;
    case "createMiniApp":
      parameters = {
        title: paramText || "Mini App",
        purpose: paramText || "Mini App",
        features: ["input", "result"],
      };
      break;
    case "createChart":
      parameters = {
        title: paramText || "Chart",
        xLabel: "X",
        yLabel: "Y",
        type: "line",
        data: [
          { label: "Series 1", values: [1, 2, 3] },
          { label: "Series 2", values: [3, 2, 1] },
        ],
      };
      break;
    case "createGame":
      parameters = {
        title: paramText || "Quiz",
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
      };
      break;
    default:
      // This should not happen as we checked for detectedToolName existence
      parameters = {};
      break;
  }

  return {
    toolName: detectedToolName,
    parameters,
    confidence: "high",
  };
}

/**
 * Detect when user asks for list of available tools
 */
function detectListToolsIntent(message: string): ToolIntent {
  const _lowerMessage = message.toLowerCase();

  for (const pattern of LIST_TOOLS_PATTERNS) {
    if (pattern.test(message)) {
      return {
        toolName: "listTools",
        parameters: {},
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
 * Detect tool intent from user message
 */
export function detectToolIntent(message: string): ToolIntent {
  // Check for list tools request first
  const listToolsIntent = detectListToolsIntent(message);
  if (listToolsIntent.toolName) {
    return listToolsIntent;
  }

  // Check for explicit tool mention after "Аврора"
  const explicitToolIntent = detectExplicitToolIntent(message);
  if (explicitToolIntent.toolName) {
    return explicitToolIntent;
  }

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
            toolName: "generateImage",
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
  // React приложение: "создай react приложение X" or "create react app X"
  /(?:создай|сделай|create|make)\s+(?:react|reactjs|react\.js)?\s+(?:приложение|application|web[‑\s]?app|app)\s*:?\s*(.+)/i,
  // React с компонентом: "создай react компонент X"
  /(?:создай|сделай|create|make)\s+(?:react|reactjs|react\.js)?\s+(?:компонент|component)\s*:?\s*(.+)/i,
  // CamelCase: "createMiniApp calculator"
  /createMiniApp\s+(.+)/i,
  // Упрощенный: "создай mini app" (берём название из контекста или используем дефолт)
  /(?:создай|сделай|create|make)\s+mini[‑\-\s]?app\s*$/i,
  // Неполный с описанием: "простой @avrora создай mini app"
  /(.+?)\s*@?(?:avrora|аврора)?\s*(?:создай|сделай|create|make)\s+mini[‑\-\s]?app\s*$/i,
];
const CHART_PATTERNS = [/(?:построй|создай)\s+график\s*:?\s*(.+)/i];
const GAME_PATTERNS = [
  /(?:создай)\s+викторину\s*:?\s*(.+)/i,
  /(?:сделай|создай)\s+игру\s*:?\s*(.+)/i,
];

const WHITESPACE_PATTERN = /\s+/;

function detectMiniAppIntent(message: string): ToolIntent {
  for (let i = 0; i < MINI_APP_PATTERNS.length; i++) {
    const pattern = MINI_APP_PATTERNS[i];
    const match = message.match(pattern);
    if (match) {
      let title = "Mini App";
      let purpose = "Mini App";

      // Обработка разных типов паттернов
      if (i <= 5 && match[1]) {
        // Стандартные паттерны с захватом названия после команды (включая React паттерны)
        title = match[1].trim();
        purpose = title;
      } else if (i === 6) {
        // Упрощенный паттерн без названия - используем дефолт или контекст
        title = "Calculator"; // или из контекста
        purpose = "Calculator app";
      } else if (i === 7) {
        // Паттерн с описанием перед командой: "простой/научный @avrora создай mini app"
        const description = match[1] ? match[1].trim() : "";
        // Извлекаем информацию из описания
        if (
          description.includes("калькулятор") ||
          description.includes("calculator")
        ) {
          title = "Calculator";
          purpose = description;
        } else if (
          description.includes("простой") ||
          description.includes("научный")
        ) {
          // Если указан тип калькулятора
          title = "Calculator";
          purpose = `${description} калькулятор`;
        } else if (description) {
          title = description.split(WHITESPACE_PATTERN)[0] || "Mini App";
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
          features: ["input", "result"],
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
