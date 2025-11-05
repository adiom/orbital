import { hasAvroraMention, removeMentions } from "./parser";

export interface IntentResult {
  shouldRespond: boolean;
  confidence: "high" | "medium" | "low";
  reason: string;
  intent?:
    | "question"
    | "command"
    | "request"
    | "discussion"
    | "greeting"
    | "other";
}

/**
 * Detect if Avrora should respond to a message
 * Uses simple heuristics + mention detection
 */
export function detectIntent(
  messageText: string,
  isGroupChat: boolean,
  chatHistory?: { role: string; content: string }[]
): IntentResult {
  const hasMention = hasAvroraMention(messageText);
  const textWithoutMention = removeMentions(messageText).trim();

  // In group chat, only respond if mentioned
  if (isGroupChat && !hasMention) {
    return {
      shouldRespond: false,
      confidence: "high",
      reason: "No @avrora mention in group chat",
    };
  }

  // In personal chat or with mention, check intent
  if (!isGroupChat || hasMention) {
    const intent = classifyIntent(textWithoutMention);

    return {
      shouldRespond: true,
      confidence: "high",
      reason: hasMention
        ? "Direct mention of @avrora"
        : "Personal chat message",
      intent,
    };
  }

  return {
    shouldRespond: false,
    confidence: "low",
    reason: "Unknown intent",
  };
}

/**
 * Classify message intent using simple heuristics
 */
function classifyIntent(
  text: string
):
  | "question"
  | "command"
  | "request"
  | "discussion"
  | "greeting"
  | "other" {
  const lowerText = text.toLowerCase();

  // Question patterns
  const questionPatterns = [
    /^(what|when|where|who|why|how|which|whose|whom)\b/i,
    /\?$/,
    /можешь|можете|как|что|когда|где|почему|зачем/i,
  ];

  if (questionPatterns.some((pattern) => pattern.test(lowerText))) {
    return "question";
  }

  // Command patterns
  const commandPatterns = [
    /^(create|make|generate|build|write|add|remove|delete|update|change|modify)\b/i,
    /^(создай|сделай|напиши|добавь|удали|измени|обнови)\b/i,
  ];

  if (commandPatterns.some((pattern) => pattern.test(lowerText))) {
    return "command";
  }

  // Request patterns
  const requestPatterns = [
    /^(please|could you|can you|would you|помоги|помогите|пожалуйста)\b/i,
    /помоч|помощ|нужно|надо/i,
  ];

  if (requestPatterns.some((pattern) => pattern.test(lowerText))) {
    return "request";
  }

  // Greeting patterns
  const greetingPatterns = [
    /^(hi|hello|hey|привет|здравствуй|добр)/i,
  ];

  if (greetingPatterns.some((pattern) => pattern.test(lowerText))) {
    return "greeting";
  }

  // Default to discussion
  return "discussion";
}

/**
 * Check if message is likely a continuation of previous conversation
 */
export function isConversationContinuation(
  chatHistory?: { role: string; content: string }[]
): boolean {
  if (!chatHistory || chatHistory.length === 0) return false;

  // Check if last message was from assistant
  const lastMessage = chatHistory[chatHistory.length - 1];
  return lastMessage?.role === "assistant";
}

/**
 * Get response priority based on intent
 */
export function getResponsePriority(
  intent: IntentResult
): "immediate" | "normal" | "low" {
  if (intent.confidence === "high" && intent.shouldRespond) {
    if (intent.intent === "question" || intent.intent === "command") {
      return "immediate";
    }
    return "normal";
  }

  return "low";
}
