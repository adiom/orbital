# Avrora AI Tools - Manual Tool Handling Implementation

## Проблема

MegaLLM (OpenAI-compatible API) не корректно поддерживает function calling в формате Vercel AI SDK v5:
- AI модель правильно определяет, КАКОЙ инструмент вызвать
- Но передаёт пустой объект `{}` вместо параметров `{prompt: "..."}`
- Это приводит к ошибкам валидации: `AI_InvalidToolInputError: Required field "prompt" is undefined`

## Решение

Реализована **ручная обработка инструментов** в два этапа:

### 1. Детекция намерений (`lib/ai/tool-intent-detector.ts`)

Парсинг сообщений пользователя для определения намерения использовать инструмент:

```typescript
const intent = detectToolIntent("@avrora нарисуй космический корабль");
// → { toolName: "generateImage", parameters: { prompt: "космический корабль" }, confidence: "high" }
```

Поддерживаемые паттерны:
- **Изображения**: "нарисуй", "создай картинку", "сгенерируй изображение"
- **Replicate FLUX**: "через replicate", "flux"
- **Музыка**: "создай музыку", "сгенерируй трек"
- **Видео**: "создай видео", "анимируй"
- **Резюме**: "резюмируй", "подведи итог", "суммируй"

### 2. Ручной вызов инструментов (`lib/ai/sfera-avrora.ts`)

```typescript
// STEP 1: Детект намерения
const toolIntent = detectToolIntent(triggerMessage.content);

// STEP 2: Вызов инструмента вручную
if (toolIntent.toolName && toolIntent.confidence === "high") {
  const tool = toolsMap[toolIntent.toolName];
  const result = await tool.execute(toolIntent.parameters);

  // Формирование контекста для AI
  toolExecutionContext = `[Я сгенерировал изображение: ${result.imageUrl}]
Опиши результат пользователю коротко.`;
}

// STEP 3: Генерация AI ответа с контекстом
const { text } = await generateText({
  model,
  prompt: `${conversationContext}\n${toolExecutionContext}`,
  // NO tools parameter - ручной режим
});
```

## Преимущества

✅ **Полный контроль** - не зависим от function calling API провайдера
✅ **Гарантированные параметры** - всегда передаём корректные значения
✅ **Расширяемость** - легко добавить новые паттерны детекта
✅ **Совместимость** - работает с любым LLM провайдером

## Доступные инструменты

### Генеративные (`lib/ai/tools/generative/`)

1. **generateImage** - Gemini 2.5 Flash Image Preview
   - Prompt: описание изображения
   - Output: PNG через Vercel Blob Storage

2. **generateImageReplicate** - FLUX 1.1 Pro (Replicate)
   - Prompt: описание изображения
   - Параметры: aspectRatio, outputFormat, outputQuality, safetyTolerance
   - Output: PNG/JPG/WebP через Vercel Blob Storage

3. **generateMusic** - MusicGen (Replicate)
   - Prompt: описание музыки
   - Параметры: duration, model_version
   - Output: MP3 через Vercel Blob Storage

4. **generateVideo** - FILM (Replicate)
   - Prompt: описание видео/анимации
   - Output: MP4 через Vercel Blob Storage

### Аналитические (`lib/ai/tools/analytics/`)

5. **summarizeDiscussion** - Резюмирование дискуссий
   - Input: контекст сообщений
   - Параметры: summaryLength (brief/medium/detailed)
   - Output: структурированное резюме с ключевыми точками

## Использование

Просто упомяните @avrora с запросом:

```
@avrora нарисуй космический корабль летящий к звездам
@avrora создай через replicate: уютная кофейня в стиле киберпанк
@avrora сгенерируй музыку: спокойная фоновая для медитации
@avrora резюмируй обсуждение кратко
```

## Технические детали

### Blob Storage

Все сгенерированные медиа сохраняются в Vercel Blob Storage для постоянного доступа:

```typescript
const imageUrl = await saveImageToBlob(uint8Array); // или URL
// → https://blob.vercel-storage.com/avrora/image-1234567890-abc123.png
```

### Обработка Uint8Array

Gemini возвращает изображения как `Uint8Array` в `result.files`:

```typescript
const imageFile = result.files?.find(file => file.mediaType.startsWith("image/"));
const imageUrl = await saveImageToBlob(imageFile.uint8Array);
```

Vercel Blob API требует `Buffer`:

```typescript
await put(filename, Buffer.from(uint8Array), { access: "public" });
```

### AI SDK v5 параметры

- `maxOutputTokens` - лимит токенов генерации (не maxTokens!)
- `temperature` - креативность (0.0 - 1.0)
- `maxSteps` - для агентов с автоматическим вызовом инструментов (не используется в ручном режиме)

## Будущие улучшения

1. **Автоматический режим**: Если MegaLLM начнёт правильно передавать параметры, можно вернуть `tools` параметр в `generateText()` и использовать `maxSteps`

2. **Дополнительные инструменты**:
   - `extract-topics` - извлечение тем из обсуждения
   - `analyze-sentiment` - анализ тональности
   - `web-search` - поиск в интернете
   - `create-mini-app` - создание интерактивных приложений

3. **Database tracking**: Логирование выполнения инструментов в таблицу `ToolExecution`

## Ссылки

- AI SDK v5 docs: `/docs/llms.txt`
- Tool implementation: `/lib/ai/tools/`
- Intent detection: `/lib/ai/tool-intent-detector.ts`
- Sfera integration: `/lib/ai/sfera-avrora.ts`
