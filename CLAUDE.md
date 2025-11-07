# CLAUDE.md

Руководство для Claude Code при работе с этим проектом.

## Обзор проекта

**Avrora** — AI-чат приложение на Next.js 15+ с коллаборативными пространствами обсуждений **Sfera**. Расширяет базовый Chat SDK шаблон функциями древовидных дискуссий (fork-based conversations) и групповых чатов.

## Ключевые технологии

- **Фреймворк**: Next.js 15.3.0-canary + App Router, React 19 RC
- **БД**: PostgreSQL + Drizzle ORM
- **AI**: Кастомный MegaLLM API (модели gpt-5/gpt-5-mini) через модифицированный Anthropic SDK
- **Аутентификация**: Auth.js (NextAuth 5.0 beta)
- **UI**: shadcn/ui + Radix UI
- **Стили**: Tailwind CSS v4
- **Реал-тайм**: WebSocket сервер (lib/websocket/)
- **Хранилище**: Vercel Blob
- **Тестирование**: Playwright

## Команды разработки

```bash
# Установка зависимостей
pnpm install

# Разработка
pnpm dev                # Next.js dev сервер с Turbo
pnpm dev:ws            # WebSocket сервер (отдельный процесс)

# Операции с БД
pnpm db:migrate        # Применить миграции
pnpm db:generate       # Создать файлы миграций из изменений схемы
pnpm db:studio         # Открыть Drizzle Studio
pnpm db:push          # Прямой push схемы (только для dev)

# Продакшн
pnpm build            # Миграция + сборка Next.js
pnpm start            # Запуск продакшн сервера

# Качество кода
pnpm lint             # Проверка ultracite линтером
pnpm format           # Авто-исправление форматирования

# Тестирование
pnpm test             # Запуск Playwright тестов
```

## Архитектура

### AI интеграция

Используется кастомный MegaLLM API вместо стандартных провайдеров:

- **Конфигурация**: [lib/ai/providers.ts](lib/ai/providers.ts) — настроен на MegaLLM endpoint (https://ai.megallm.io/v1)
- **Модели**:
  - `gpt-5` — основной чат
  - `gpt-5-mini` — рассуждения, генерация заголовков, артефакты
- **Изображения**: [lib/ai/megallm-direct.ts](lib/ai/megallm-direct.ts) — кастомная обработка multimodal входов
- **Стриминг**: [lib/ai/megallm-stream-parser.ts](lib/ai/megallm-stream-parser.ts) — парсер потоков
- **Sfera AI**: [lib/ai/sfera-avrora.ts](lib/ai/sfera-avrora.ts) — Avrora AI для пространств Sfera

### Схема БД (Drizzle ORM)

Расположена в [lib/db/schema.ts](lib/db/schema.ts):

**Основные таблицы**:
- `User` — аутентификация и профили
- `Chat` — личные и групповые чаты (поле `chatType`)
- `Message_v2` — сообщения с отслеживанием автора для групп
- `Document` — документы с версионированием

**Sfera таблицы** (коллаборативные дискуссии):
- `Sfera` — пространства обсуждений с fork/merge поддержкой
- `SferaMember` — участники Sfera с ролями (owner, admin, member, viewer)
- `SferaMessage` — сообщения в Sfera с поддержкой вложенности (threading) и вложений
- `SferaForkedSfera` — связи между родительской Sfera и форками

### Структура роутов

**Sfera роуты** ([app/(sfera)/](app/(sfera)/)):
- `/sferas` — список всех Sfera текущего пользователя
- `/sferas/new` — создание новой Sfera
- `/sfera/[id]` — страница дискуссии Sfera

**Chat роуты** ([app/(chat)/](app/(chat)/)):
- `/chat/[id]` — страница личного чата
- `/` — главная страница чатов

**API роуты**:

*Sfera API*:
- `/api/sfera` — список/создание Sfera
- `/api/sfera/[id]` — получение/обновление/удаление Sfera
- `/api/sfera/[id]/messages` — сообщения Sfera
- `/api/sfera/[id]/messages/[messageId]` — редактирование/удаление сообщения
- `/api/sfera/[id]/members` — управление участниками
- `/api/sfera/[id]/fork` — fork Sfera или сообщения

*Chat API*:
- `/api/chat` — главный endpoint чата с логикой групповых чатов
- `/api/chat/[id]/stream` — стриминг сообщений

*Другие API*:
- `/api/ws` — WebSocket подключение
- `/api/auth/*` — аутентификация
- `/api/document` — работа с документами
- `/api/files/upload` — загрузка файлов
- `/api/docs` — документация API (OpenAPI)

### Sfera — Коллаборативные пространства

**Концепция**: Sfera — это пространства для групповых дискуссий с древовидной структурой, где любое сообщение или целое обсуждение можно "форкнуть" в новую ветку.

**Ключевые возможности**:

1. **Fork-based дискуссии**:
   - Любое сообщение можно форкнуть в новую Sfera
   - Связи между родительскими и дочерними Sfera отслеживаются
   - Возможность вернуться к родительской дискуссии

2. **@Avrora упоминания**:
   - AI отвечает только при упоминании `@avrora` или `@аврора`
   - Контекстные ответы на основе последних 20 сообщений
   - Реализация в [lib/ai/sfera-avrora.ts](lib/ai/sfera-avrora.ts)
   - Краткие ответы (до 30 слов), участие в дискуссии без менторства

3. **Threading (вложенные ответы)**:
   - Сообщения могут быть ответами на другие сообщения
   - Поле `parentMessageId` в таблице `SferaMessage`
   - UI показывает контекст родительского сообщения

4. **Управление участниками**:
   - Роли: owner, admin, member, viewer
   - Owner может удалять Sfera
   - Admin/Owner могут управлять настройками и участниками

5. **Вложения**:
   - Поддержка файлов, изображений
   - Хранение метаданных в JSON (name, url, contentType)

**Компоненты**:
- [components/sfera/sfera-chat.tsx](components/sfera/sfera-chat.tsx) — основной компонент Sfera
- [components/sfera/sfera-message.tsx](components/sfera/sfera-message.tsx) — отображение сообщений
- [components/sfera/sfera-message-input.tsx](components/sfera/sfera-message-input.tsx) — ввод сообщений
- [components/sfera/sfera-settings.tsx](components/sfera/sfera-settings.tsx) — настройки Sfera

### Особенности групповых чатов

Реализована сложная логика групповых чатов:

1. **@Avrora упоминания**: AI отвечает только при упоминании в групповых чатах
2. **Ограничение контекста**: Используются последние 20 сообщений для групповых бесед
3. **Атрибуция сообщений**: Отслеживание `userId` для каждого сообщения в группах
4. **Контроль доступа**: Групповые чаты открыты для всех участников, личные — приватные
5. **Парсинг упоминаний**: [lib/mentions/parser.ts](lib/mentions/parser.ts) — извлечение @упоминаний
6. **Определение интента**: [lib/mentions/intent-detection.ts](lib/mentions/intent-detection.ts) — анализ намерений
7. **Обработка упоминаний**: [lib/mentions/process.ts](lib/mentions/process.ts) — логика обработки

### Переменные окружения

Обязательные переменные (см. [.env.example](.env.example)):

```bash
AUTH_SECRET           # Секрет Auth.js
POSTGRES_URL         # PostgreSQL строка подключения
BLOB_READ_WRITE_TOKEN # Vercel Blob хранилище
REDIS_URL           # Redis для resumable streams (опционально)
MEGALLM_API_KEY     # API ключ MegaLLM
```

## Детали реализации

### Поток AI ответов

**В обычных чатах**:
1. Обработка в [app/(chat)/api/chat/route.ts](app/(chat)/api/chat/route.ts:1)
2. Для групповых чатов проверка @avrora упоминания перед ответом
3. Изображения → кастомный MegaLLM обработчик (`callMegaLLMWithImages`)
4. Только текст → стандартный AI SDK стриминг
5. Логика групповых чатов в [lib/ai/group-chat-logic.ts](lib/ai/group-chat-logic.ts)

**В Sfera**:
1. Проверка @avrora упоминания в сообщении
2. Загрузка контекста последних 20 сообщений
3. Генерация ответа через [lib/ai/sfera-avrora.ts](lib/ai/sfera-avrora.ts)
4. Avrora автоматически добавляется как участник при первом ответе
5. Ответ сохраняется как обычное сообщение с `parentMessageId`

### WebSocket поддержка

- Реализация: [lib/websocket/server.ts](lib/websocket/server.ts)
- Запуск: `pnpm dev:ws`
- Клиентский хук: [lib/websocket/use-websocket.ts](lib/websocket/use-websocket.ts)

### Миграции БД

- Изменения схемы в [lib/db/schema.ts](lib/db/schema.ts)
- Генерация: `pnpm db:generate`
- Применение: `pnpm db:migrate`
- Миграции автоматически запускаются при сборке

### Аутентификация

- Гостевой доступ: [app/(auth)/api/auth/guest/route.ts](app/(auth)/api/auth/guest/route.ts)
- Типы пользователей: guest, regular, pro
- Ограничения: [lib/ai/entitlements.ts](lib/ai/entitlements.ts)

### Обработка ошибок

- Кастомный класс: `ChatSDKError` в [lib/errors.ts](lib/errors.ts)
- Единообразные ответы об ошибках во всех API
- Rate limiting по типу пользователя

### AI Tools

Доступные инструменты в [lib/ai/tools/](lib/ai/tools/):
- `create-document.ts` — создание документов
- `update-document.ts` — обновление документов
- `request-suggestions.ts` — запрос предложений
- `get-weather.ts` — получение погоды

## Тестирование

- Playwright тесты в [tests/](tests/)
- Установить `PLAYWRIGHT=True` для тестирования
- Запуск: `pnpm test`
- Mock модели: [lib/ai/models.mock.ts](lib/ai/models.mock.ts)

## Важные моменты

1. **React 19 RC**: Используется релиз-кандидат — возможны breaking changes
2. **Миграции БД**: Всегда делать бэкап перед миграциями в продакшне
3. **AI Gateway**: Разные настройки для Vercel и не-Vercel деплоев
4. **Контекст Sfera**: Ограничен 20 сообщениями для предотвращения переполнения токенов
5. **Обработка изображений**: Кастомная MegaLLM реализация обходит стандартный AI SDK
6. **Middleware**: [middleware.ts](middleware.ts:1) — гостевая аутентификация, защита роутов, доступ к /docs
7. **Документация API**: Доступна на `/docs` через Scalar UI ([app/docs/page.tsx](app/docs/page.tsx))
8. **Avrora AI**: Специальный системный пользователь с ID `00000000-0000-0000-0000-000000000001`
9. **Fork структура**: Sfera может быть форкнута из сообщения, создавая древовидные дискуссии
10. **Минималистичный UI**: Дизайн вдохновлён минимализмом с focus на содержание

## Работа со Sfera

### Создание новой Sfera
```typescript
POST /api/sfera
{
  "title": "Название дискуссии",
  "description": "Описание (опционально)",
  "visibility": "private" | "public" | "dao",
  "memberEmails": ["user@example.com"]
}
```

### Fork сообщения в новую Sfera
```typescript
POST /api/sfera/[id]/fork
{
  "messageId": "uuid",
  "title": "Название форка"
}
```

### Отправка сообщения
```typescript
POST /api/sfera/[id]/messages
{
  "content": "Текст сообщения",
  "parentMessageId": "uuid" | null,  // Для threading
  "attachments": []
}
```

### Вызов Avrora AI
Просто упомяните `@avrora` или `@аврора` в сообщении, и AI ответит с учётом контекста дискуссии.
