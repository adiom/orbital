# Replicate AI Tools Integration

Интеграция с Replicate API для генерации музыки и видео в Avrora.

## Установка

```bash
pnpm add replicate
```

## Настройка

Добавьте API ключ в `.env.local`:

```bash
REPLICATE_API_KEY=r8_V5w0wnCNevxDknocFoknDn85rYLTWgB2XWIMc
```

## Доступные инструменты

### 1. Генерация музыки (Musicgen)

**Модель**: `meta/musicgen`
**Файл**: [lib/ai/tools/generative/generate-music.ts](lib/ai/tools/generative/generate-music.ts)

**Использование в Sfera**:
```
@avrora создай музыку: спокойная ambient музыка для медитации, медленный темп, фортепиано
@avrora сгенерируй трек: энергичная электронная музыка в стиле synthwave
```

**Параметры**:
- `prompt` (обязательно): Описание музыки (жанр, настроение, темп, инструменты)
- `duration`: Длительность в секундах (5-30, по умолчанию 10)
- `model_version`: Версия модели (stereo-melody-large, stereo-large, melody-large, large)

**Возвращает**: URL MP3 файла

### 2. Генерация видео (Stable Video Diffusion)

**Модель**: `stability-ai/stable-video-diffusion`
**Файл**: [lib/ai/tools/generative/generate-video.ts](lib/ai/tools/generative/generate-video.ts)

**Использование в Sfera**:
```
@avrora создай видео из изображения: https://example.com/image.jpg
@avrora анимируй картинку: [URL изображения]
```

**Параметры**:
- `imageUrl` (обязательно): URL изображения для анимации
- `motion_bucket_id`: Интенсивность движения (1-255, по умолчанию 127)
- `cond_aug`: Conditioning augmentation (0-1, по умолчанию 0.02)
- `fps`: Кадров в секунду (по умолчанию 6)
- `decoding_t`: Количество кадров (макс 25, по умолчанию 14)

**Возвращает**: URL MP4 файла

## Архитектура

### Обнаружение tool requests

Функция `detectToolRequest()` в [lib/ai/sfera-tools.ts](lib/ai/sfera-tools.ts) анализирует сообщения и определяет, когда нужно вызвать tool:

```typescript
// Пример для музыки
if (lowerContent.includes("создай музыку") ||
    lowerContent.includes("сгенерируй трек")) {
  return {
    hasToolRequest: true,
    toolName: "generate-music",
    toolInput: content
  };
}
```

### Интеграция в Sfera AI

Tools автоматически доступны Avrora AI в Sfera через [lib/ai/sfera-avrora.ts](lib/ai/sfera-avrora.ts:107-116):

```typescript
const tools = getSferaTools();

const { text, toolCalls, toolResults } = await generateText({
  model,
  tools: tools.length > 0 ? Object.fromEntries(tools.map(t => [t.description?.split(' ')[0] || 'tool', t])) : undefined,
});
```

### Отображение результатов

UI компонент [components/sfera/tool-result-display.tsx](components/sfera/tool-result-display.tsx) отображает результаты выполнения tools:

- Для музыки: audio player с кнопкой скачивания
- Для видео: video player с метаданными
- Обработка ошибок

## Примеры использования

### Создание ambient трека

```
@avrora создай музыку: медленная ambient музыка для концентрации,
синтезаторы, пэды, минималистичный стиль, 15 секунд
```

Результат:
- 15-секундный MP3 трек
- Модель: stereo-melody-large
- Формат: MP3 с peak normalization

### Анимация изображения

```
@avrora создай видео из изображения: https://example.com/sunset.jpg

Параметры анимации:
- Средняя интенсивность движения (127)
- 2.3 секунды (14 кадров @ 6 fps)
- Сохранение пропорций изображения
```

Результат:
- Короткое видео (MP4)
- Плавная анимация исходного изображения

## Обработка ошибок

Все tools проверяют наличие API ключа:

```typescript
if (!process.env.REPLICATE_API_KEY) {
  return {
    success: false,
    error: "Replicate API key is not configured...",
  };
}
```

Ошибки Replicate API логируются и возвращаются пользователю через UI.

## Ограничения

### Musicgen
- Максимальная длительность: 30 секунд
- Минимальная длительность: 5 секунд
- Формат вывода: MP3 только

### Stable Video Diffusion
- Требуется входное изображение
- Максимум 25 кадров
- Только image-to-video (нет text-to-video)

## Стоимость

Replicate взимает плату за использование моделей:
- Musicgen: ~$0.00050 за секунду
- Stable Video Diffusion: ~$0.0055 за запуск

Детали: https://replicate.com/pricing

## Следующие шаги

- [ ] Добавить Text-to-Speech через ElevenLabs
- [ ] Поддержка text-to-video (другая модель)
- [ ] Кэширование результатов в Vercel Blob
- [ ] Отслеживание использования в БД (ToolExecution table)
