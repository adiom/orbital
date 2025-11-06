/**
 * Smart AI response logic for group chats
 * Avrora should not respond to every message, only when necessary
 */

import type { ChatMessage } from "@/lib/types";

interface ResponseDecision {
  shouldRespond: boolean;
  reason?: string;
  responseType?: "direct" | "summary" | "action" | "mediation";
}

// Patterns that indicate a question
const QUESTION_PATTERNS = [
  /\?$/,
  /^(what|how|why|when|where|who|which|could|would|should|can|is|are|do|does)/i,
  /^(что|как|почему|когда|где|кто|какой|можно|нужно|есть ли)/i,
];

// Patterns that indicate a direct mention or request
const MENTION_PATTERNS = [
  /@avrora/i,
  /@аврора/i,
  /avrora/i,
  /аврора/i,
  /ai\s*(помоги|help|создай|create|сделай|make|предложи|suggest)/i,
];

// Action triggers
const ACTION_PATTERNS = [
  /(создай|create|сделай|make|генерируй|generate)\s+(артефакт|artifact|документ|document|файл|file)/i,
  /(начни|start|запусти|launch)\s+(голосование|vote|voting|опрос|poll)/i,
  /(подведи|summarize|резюме|summary|итоги|results)/i,
  /(экспортируй|export|сохрани|save)\s+(историю|history|чат|chat)/i,
];

// Conflict detection patterns
const CONFLICT_PATTERNS = [
  /не согласен|disagree|спорно|debatable|неправильно|wrong|ошибаешься|mistake/i,
  /это не так|that's not true|неверно|incorrect/i,
  /heated discussion|горячая дискуссия|спор|argument/i,
];

export function analyzeGroupChatContext(
  messages: ChatMessage[],
  currentUserId?: string
): ResponseDecision {
  if (messages.length === 0) {
    return { shouldRespond: false };
  }

  const lastMessage = messages[messages.length - 1];

  // Don't respond to AI's own messages
  if (lastMessage.role === "assistant") {
    return { shouldRespond: false };
  }

  const messageText = getMessageText(lastMessage);
  if (!messageText) {
    return { shouldRespond: false };
  }

  // Check for direct mentions
  if (MENTION_PATTERNS.some(pattern => pattern.test(messageText))) {
    return {
      shouldRespond: true,
      reason: "Direct mention detected",
      responseType: "direct",
    };
  }

  // Check for action requests
  if (ACTION_PATTERNS.some(pattern => pattern.test(messageText))) {
    return {
      shouldRespond: true,
      reason: "Action request detected",
      responseType: "action",
    };
  }

  // Check for questions (but not every question needs an answer)
  const isQuestion = QUESTION_PATTERNS.some(pattern => pattern.test(messageText));
  if (isQuestion) {
    // Check if it's directed at AI or general enough
    const recentMessages = messages.slice(-5);
    const hasRecentAIResponse = recentMessages.some(m => m.role === "assistant");

    // Don't respond to every question if AI just responded
    if (hasRecentAIResponse) {
      return { shouldRespond: false, reason: "Recent AI response exists" };
    }

    // Check if question seems directed or technical
    if (messageText.length > 30 && !messageText.toLowerCase().includes("кто-нибудь")) {
      return {
        shouldRespond: true,
        reason: "Technical question detected",
        responseType: "direct",
      };
    }
  }

  // Check for conflict situations
  const recentMessages = messages.slice(-10);
  const conflictCount = recentMessages.filter(m => {
    const text = getMessageText(m);
    return text && CONFLICT_PATTERNS.some(pattern => pattern.test(text));
  }).length;

  if (conflictCount >= 3) {
    return {
      shouldRespond: true,
      reason: "Conflict detected - mediation might be needed",
      responseType: "mediation",
    };
  }

  // Check if it's time for a summary (after many messages without AI intervention)
  const messagesSinceLastAI = getMessagesSinceLastAI(messages);
  if (messagesSinceLastAI > 20) {
    return {
      shouldRespond: true,
      reason: "Long discussion without AI summary",
      responseType: "summary",
    };
  }

  // Default: don't respond
  return {
    shouldRespond: false,
    reason: "No trigger conditions met",
  };
}

function getMessageText(message: ChatMessage): string | null {
  if (!message.parts || message.parts.length === 0) {
    return null;
  }

  const textParts = message.parts.filter(
    (part): part is { type: "text"; text: string } =>
      part.type === "text" && "text" in part
  );

  if (textParts.length === 0) {
    return null;
  }

  return textParts.map(part => part.text).join(" ");
}

function getMessagesSinceLastAI(messages: ChatMessage[]): number {
  let count = 0;
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role === "assistant") {
      break;
    }
    if (messages[i].role === "user") {
      count++;
    }
  }
  return count;
}

export function generateContextualPrompt(
  decision: ResponseDecision,
  context: string
): string {
  const basePrompt = `You are Avrora, an AI assistant in a group chat.
Be helpful but not intrusive. Keep responses concise unless detailed explanation is needed.`;

  switch (decision.responseType) {
    case "summary":
      return `${basePrompt}\nProvide a brief summary of the key points discussed. Focus on decisions made and action items.`;

    case "action":
      return `${basePrompt}\nExecute the requested action. Be clear about what you're doing and any requirements.`;

    case "mediation":
      return `${basePrompt}\nA heated discussion is detected. Suggest a constructive way forward or propose creating a separate space for detailed discussion.`;

    case "direct":
    default:
      return `${basePrompt}\nAnswer the question or respond to the request directly and concisely.`;
  }
}

// Export additional utilities for testing
export { QUESTION_PATTERNS, MENTION_PATTERNS, ACTION_PATTERNS, CONFLICT_PATTERNS };