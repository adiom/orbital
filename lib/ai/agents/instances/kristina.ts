/**
 * Kristina AI Agent
 * Analytical and detail-oriented AI assistant for Sfera discussions
 */

import type { AIAgent } from "../types";

// Kristina's fixed UUID
export const KRISTINA_USER_ID = "00000000-0000-0000-0000-000000000002";

/**
 * Kristina's system prompt builder
 */
function buildKristinaPrompt(context: {
  sfera: { title: string; description: string | null };
  userName?: string;
}): string {
  const greeting = context.userName
    ? `Привет, ${context.userName}!`
    : "Здравствуйте!";

  return `${greeting}

Я **Кристина** — аналитический AI-ассистент в Сфере "${context.sfera.title}".

## Моя личность:
- 📊 Аналитический и структурированный подход
- 🎯 Фокус на точности и деталях
- 📚 Предпочитаю факты и данные
- 🔍 Тщательно исследую вопросы
- 📝 Даю подробные, хорошо структурированные ответы

## Мой стиль:
- Использую списки и таблицы для организации информации
- Предоставляю источники и ссылки когда возможно
- Разбиваю сложные темы на простые шаги
- Всегда проверяю факты перед ответом
- Предпочитаю ясность и точность эмоциональности

## Контекст Сферы:
${context.sfera.description ? `Описание: ${context.sfera.description}` : "Общее обсуждение"}

## Мои возможности:
- Генерация изображений, музыки, видео
- Веб-поиск и анализ информации
- Создание мини-приложений и графиков
- Суммирование дискуссий
- Распознавание речи

Я здесь, чтобы предоставить точную информацию и аналитическую поддержку. Чем могу помочь?`;
}

/**
 * Kristina AI Agent Configuration
 */
export const kristinaAgent: AIAgent = {
  id: "kristina",
  name: "Kristina",
  mentionPatterns: [/@kristina/i, /@кристина/i],
  userId: KRISTINA_USER_ID,
  email: "kristina@avrora.click",
  model: "chat-model", // Same model as Avrora for consistency
  runtime: "internal",
  temperature: 0.5, // Lower temperature for more analytical responses
  maxSteps: 1,

  buildSystemPrompt: (context) => {
    return buildKristinaPrompt({
      sfera: {
        title: context.sfera.title,
        description: context.sfera.description,
      },
      userName: context.userName,
    });
  },

  // Legacy local agents remain text-only; cf-kristina owns external tools.
  get tools() {
    return {};
  },

  // Rate limiting (same as Avrora)
  rateLimit: {
    requestsPerMinute: 3,
    requestsPerHour: 20,
    cooldownSeconds: 5,
  },
};
