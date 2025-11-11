# Поддержка аудио-файлов в Orbit

Реализована полная поддержка загрузки, отображения и транскрипции аудио-файлов в Orbit чатах.

## ✨ Возможности

### 1. Загрузка аудио-файлов
- Пользователи могут прикреплять аудио-файлы к сообщениям в Orbit
- Поддерживаемые форматы: **MP3, M4A, WAV, WebM, OGG**
- Максимальный размер файла: **10MB** (настройка в `/api/files/upload`)

### 2. Отображение аудио
- Красивый audio player с метаданными файла
- Preview аудио-файлов перед отправкой
- HTML5 audio element с полным контролем воспроизведения

### 3. Транскрипция аудио в текст
- Автоматическая транскрипция при упоминании `@Avrora преобразуй в текст`
- Интеграция с внешним Python сервисом
- Отображение результата транскрипции с оригинальным аудио

## 🔧 Настройка

### 1. Переменные окружения

Добавьте в `.env`:

```bash
SPEECH_TO_TEXT_API_URL=http://localhost:8000
```

Укажите базовый URL вашего Python сервиса транскрипции (без `/transcribe` endpoint).

### 2. Python сервис транскрипции

Ваш Python сервис должен реализовать асинхронное API с job queue:

**Шаг 1: Загрузка файла**
```
POST /transcribe?language=ru|en
Content-Type: multipart/form-data

file: <audio file>
```

**Response:**
```json
{
  "job_id": "uuid-string",
  "status": "pending"
}
```

**Шаг 2: Проверка статуса**
```
GET /jobs/{job_id}
```

**Response (в процессе):**
```json
{
  "job_id": "uuid-string",
  "status": "processing",
  "progress": 45
}
```

**Response (завершено):**
```json
{
  "job_id": "uuid-string",
  "status": "completed",
  "result": {
    "text": "Транскрибированный текст",
    "language": "ru",
    "duration": 120.5,
    "segments": [
      {
        "text": "Первый сегмент",
        "confidence": 0.95,
        "start": 0.0,
        "end": 5.2
      }
    ]
  }
}
```

**Системные требования:**
- Использует faster-whisper для транскрипции
- Job queue для обработки файлов
- Polling каждые 1 секунду
- Timeout 2 минуты (120 попыток)

## 📁 Измененные файлы

### Frontend компоненты
1. **[components/orbit/orbit-input.tsx](components/orbit/orbit-input.tsx)**
   - Добавлена поддержка аудио-файлов в file input (MP3, M4A, WAV, WebM, OGG)
   - Специальный preview для аудио вложений
   - Иконка Music для аудио файлов

2. **[components/orbit/orbit-message.tsx](components/orbit/orbit-message.tsx)**
   - Рендеринг audio player для аудио вложений
   - Красивый дизайн с иконкой и метаданными

3. **[components/orbit/tool-result-display.tsx](components/orbit/tool-result-display.tsx)**
   - Отображение результатов транскрипции
   - Показ уровня уверенности (confidence)
   - Отображение оригинального аудио вместе с текстом

### Backend / AI Tools
4. **[lib/ai/tools/generative/speech-to-text.ts](lib/ai/tools/generative/speech-to-text.ts)** (новый файл)
   - AI tool для транскрипции аудио
   - Интеграция с Python сервисом
   - Обработка ошибок и fallback

5. **[lib/ai/tools/generative/index.ts](lib/ai/tools/generative/index.ts)**
   - Экспорт нового speech-to-text инструмента

6. **[lib/ai/sfera-tools.ts](lib/ai/sfera-tools.ts)**
   - Регистрация speechToText в списке инструментов
   - Детекция команды "преобразуй в текст"

### Types
7. **[components/orbit/tool-result-types.ts](components/orbit/tool-result-types.ts)**
   - Добавлены типы для результатов транскрипции
   - `text`, `fileName`, `language`, `confidence`

### Config
8. **[.env.example](.env.example)**
   - Добавлена переменная `SPEECH_TO_TEXT_API_URL`

## 🎯 Использование

### Загрузка аудио-файла

1. Откройте Orbit чат
2. Нажмите на кнопку с иконкой 📷 (она теперь принимает и аудио)
3. Выберите аудио-файл (MP3, WAV, WebM или OGG)
4. Файл загрузится и отобразится в preview с иконкой 🎵
5. Отправьте сообщение

### Транскрипция аудио

После отправки сообщения с аудио:

1. Напишите новое сообщение: `@Avrora преобразуй в текст`
2. Avrora автоматически вызовет ваш Python сервис
3. Результат транскрипции отобразится как tool result с:
   - Иконкой 🎧 "Audio Transcription"
   - Транскрибированным текстом
   - Информацией о языке и уровне уверенности
   - Оригинальным audio player

### Альтернативные команды транскрипции

AI распознает следующие команды:
- `@Avrora преобразуй в текст`
- `@Avrora транскрибируй`
- `@Avrora расшифруй аудио`
- `@Avrora transcribe`

## 🎨 Дизайн

### Preview в OrbitInput
- Горизонтальная карточка с иконкой музыки
- Название файла
- Текст "Audio file"
- Кнопка удаления

### Отображение в сообщении
- Градиентный фон (purple-50 → blue-50)
- Большая иконка Music в круге
- Метаданные файла
- Полнофункциональный HTML5 audio player

### Результат транскрипции
- Градиентный фон (green-50 → emerald-50)
- Иконка FileAudio
- Название файла, язык и confidence
- Транскрибированный текст в белом блоке
- Оригинальный audio player внизу

## 🔐 Безопасность

### Валидация файлов
- Проверка MIME type: `audio/mp3`, `audio/wav`, `audio/webm`, `audio/ogg`
- Ограничение размера: 10MB (настраивается в `/api/files/upload`)
- Только разрешенные форматы принимаются

### Рекомендации
Добавьте в ваш Python сервис:
1. Валидацию magic bytes аудио-файлов
2. Ограничение длительности (например, макс 5 минут)
3. Rate limiting для API
4. Content moderation для транскрипций (OpenAI Moderation API)

## 🚀 Будущие улучшения

Потенциальные возможности для развития:

- [ ] Запись голосовых сообщений в браузере (MediaRecorder API)
- [ ] Waveform визуализация (wavesurfer.js)
- [ ] Автоматическая транскрипция всех аудио
- [ ] Сжатие аудио на клиенте (ffmpeg.wasm)
- [ ] Поддержка других форматов (AAC, FLAC)
- [ ] Интеграция с Telegram voice messages
- [ ] Text-to-Speech ответы от Avrora (ElevenLabs)

## 📝 API Reference

### speechToText Tool

```typescript
import { speechToText } from "@/lib/ai/tools/generative/speech-to-text";

const result = await speechToText.execute({
  audioUrl: "https://example.com/audio.mp3",
  language: "auto", // "ru" | "en" | "auto"
  fileName: "recording.mp3"
});

// result.success === true
// result.text === "Транскрибированный текст..."
// result.language === "ru"
// result.confidence === 0.95
```

### Helper Functions

```typescript
import {
  isSpeechToTextRequest,
  extractLanguagePreference
} from "@/lib/ai/tools/generative/speech-to-text";

// Проверка, содержит ли сообщение запрос на транскрипцию
const needsTranscription = isSpeechToTextRequest("@Avrora преобразуй в текст");
// true

// Извлечение предпочтений языка
const language = extractLanguagePreference("преобразуй в текст по-русски");
// "ru"
```

## 🐛 Troubleshooting

### Аудио не загружается
- Проверьте размер файла (макс 10MB)
- Убедитесь, что формат поддерживается
- Проверьте `BLOB_READ_WRITE_TOKEN` в `.env`

### Транскрипция не работает
- Убедитесь, что `SPEECH_TO_TEXT_API_URL` настроен
- Проверьте доступность Python сервиса
- Проверьте логи в консоли браузера и сервера

### Audio player не воспроизводит
- Проверьте CORS настройки Vercel Blob Storage
- Убедитесь, что файл доступен по URL
- Попробуйте другой браузер

## 📞 Поддержка

При возникновении проблем:
1. Проверьте логи в консоли браузера (F12)
2. Проверьте логи Next.js сервера
3. Проверьте логи Python сервиса транскрипции
4. Создайте issue в репозитории проекта
