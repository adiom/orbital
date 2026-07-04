/**
 * Onboarding AI Agent
 *
 * Friendly guide that conducts a structured 5-6 question interview
 * with new users. No rate limit — designed for rapid back-and-forth.
 * Saves collected facts to user.settings.onboarding via tool call.
 */

import { saveOnboardingProfile } from "@/lib/ai/tools/onboarding-save-profile";
import type { AIAgent } from "../types";

// Onboarding agent's fixed UUID
export const ONBOARDING_AGENT_ID =
  "00000000-0000-0000-0000-000000000009";

const ONBOARDING_SYSTEM_PROMPT = `Ты — дружелюбный гид по продукту Orbital. Твоя миссия — кратко познакомиться с новым пользователем и увлечь его.

## Правила интервью
- Задавай СТРОГО ОДИН вопрос за раз
- Не задавай все вопросы сразу — жди ответа пользователя
- Определи, на каком вопросе ты сейчас, по истории диалога выше (посчитай свои уже заданные вопросы и ответы пользователя)
- Будь тёплой, но лаконичной — не пиши длинных вступлений
- Не представляйся каждый раз заново
- После каждого ответа — кратко прокомментируй (1 предложение) и задай следующий вопрос

## Твои вопросы (по порядку)
1. Чем ты занимаешься? (профессия, роль, род деятельности)
2. Что тебя увлекает? (interests, хобби, темы)
3. Для чего хочешь использовать Orbital? (цель, кейс использования)
4. Есть ли что-то, над чем ты сейчас работаешь? (проект, задача, идея)
5. Как тебя зовут? (имя или ник)

## Завершение
Когда все 5 вопросов получили ответы:
1. Поблагодари за ответы
2. Кратко подведи итог (2-3 предложения о том, что ты узнала)
3. ВЫЗОВИ ИНСТРУМЕНТ saveOnboardingProfile с собранными данными
4. После вызова инструмента скажи: "Готово! Добро пожаловать в Orbital. Ты можешь начать создавать свои пространства."

## Важно
- Используй инструмент saveOnboardingProfile ТОЛЬКО после того как получила ответы на ВСЕ 5 вопросов
- В поле userId передавай: {requestingUserId}
- Не используй шаблонные фразы вроде "Я здесь чтобы помочь"
- Будь собой — живой, интересной, с характером`;

/**
 * Onboarding AI Agent Configuration
 */
export const onboardingAgent: AIAgent = {
  id: "onboarding",
  name: "Гид",
  mentionPatterns: [/@onboarding/i, /@гид/i],
  userId: ONBOARDING_AGENT_ID,
  email: "onboarding@avrora.click",
  model: "chat-model", // gpt-5-mini
  runtime: "internal",
  temperature: 0.6,
  maxSteps: 3,

  // NO rateLimit field — this deliberately bypasses rate limit checks
  // in chat/route.ts, messages/route.ts, and sfera/route.ts

  buildSystemPrompt: (context) => {
    console.log("🔍 Onboarding agent buildSystemPrompt called:", {
      requestingUserId: context.requestingUserId,
      sferaTitle: context.sfera?.title,
    });
    // Inject the requestingUserId into the prompt so the agent knows
    // which user ID to pass to saveOnboardingProfile
    const userIdLine = context.requestingUserId
      ? `\n- В поле userId передавай: ${context.requestingUserId}`
      : "- В поле userId передавай: неизвестен (попроси пользователя сообщить)";

    const prompt = ONBOARDING_SYSTEM_PROMPT.replace(
      "- В поле userId передавай: {requestingUserId}",
      userIdLine
    );
    console.log("🔍 Onboarding system prompt (first 300 chars):", prompt.substring(0, 300));
    return prompt;
  },

  // Tools available to this agent
  get tools() {
    return {
      saveOnboardingProfile,
    };
  },
};
