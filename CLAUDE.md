# CLAUDE.md

Руководство для Claude Code при работе с этим проектом.

## Обзор проекта

**Avrora** — AI-чат приложение на Next.js 15+ с коллаборативными возможностями. Расширяет базовый Chat SDK шаблон функциями групповых чатов, area-пространств для совместной работы и кастомной интеграцией с MegaLLM API.

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

### Схема БД (Drizzle ORM)

Расположена в [lib/db/schema.ts](lib/db/schema.ts):

**Основные таблицы**:
- `User` — аутентификация и профили
- `Chat` — личные и групповые чаты (поле `chatType`)
- `Message_v2` — сообщения с отслеживанием автора для групп
- `Area` — пространства для коллаборации с поддержкой форков
- `Document` — общие документы внутри area

**Таблицы коллаборации**:
- `AreaMember` — участники area и их роли
- `ChatMember` — участники групповых чатов
- `AreaDocument` — документы привязанные к area
- `AreaMergeProposal` — предложения слияния форков
- `MessageMention` — отслеживание @упоминаний (включая @avrora)

### Структура роутов

**Area роуты** ([app/(area)/](app/(area)/)):
- `/areas` — список всех areas
- `/area/[id]` — страница конкретного area
- `/area/[id]/chat/[chatId]` — чат внутри area

**Chat роуты** ([app/(chat)/](app/(chat)/)):
- `/chat/[id]` — страница личного чата
- `/` — главная страница чатов

**API роуты**:

*Area API*:
- `/api/areas` — управление areas (CRUD)
- `/api/areas/[id]/fork` — форк area
- `/api/areas/[id]/tree` — дерево форков
- `/api/areas/[id]/members` — управление участниками
- `/api/areas/[id]/chats` — чаты внутри area

*Chat API*:
- `/api/chat` — главный endpoint чата с логикой групповых чатов
- `/api/chat/[id]/stream` — стриминг сообщений
- `/api/area-chats` — список чатов area
- `/api/chats/[chatId]/members` — участники чата

*Другие API*:
- `/api/ws` — WebSocket подключение
- `/api/auth/*` — аутентификация
- `/api/document` — работа с документами
- `/api/files/upload` — загрузка файлов
- `/api/docs` — документация API (OpenAPI)

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

1. Обработка в [app/(chat)/api/chat/route.ts](app/(chat)/api/chat/route.ts:1)
2. Для групповых чатов проверка @avrora упоминания перед ответом
3. Изображения → кастомный MegaLLM обработчик (`callMegaLLMWithImages`)
4. Только текст → стандартный AI SDK стриминг
5. Логика групповых чатов в [lib/ai/group-chat-logic.ts](lib/ai/group-chat-logic.ts)

### WebSocket поддержка

- Реализация: [lib/websocket/server.ts](lib/websocket/server.ts)
- Запуск: `pnpm dev:ws`
- API endpoint: [app/(area)/api/ws/route.ts](app/(area)/api/ws/route.ts)
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

### Area (Пространства)

- **Резюме area**: [lib/ai/area-summary.ts](lib/ai/area-summary.ts) — генерация саммари
- **Форки**: Поддержка fork/merge workflow
- **Члены**: Роли owner/admin/member/viewer
- **Видимость**: public/private/dao

## Тестирование

- Playwright тесты в [tests/](tests/)
- Установить `PLAYWRIGHT=True` для тестирования
- Запуск: `pnpm test`
- Mock модели: [lib/ai/models.mock.ts](lib/ai/models.mock.ts)

## Важные моменты

1. **React 19 RC**: Используется релиз-кандидат — возможны breaking changes
2. **Миграции БД**: Всегда делать бэкап перед миграциями в продакшне
3. **AI Gateway**: Разные настройки для Vercel и не-Vercel деплоев
4. **Контекст групповых чатов**: Ограничен 20 сообщениями для предотвращения переполнения токенов
5. **Обработка изображений**: Кастомная MegaLLM реализация обходит стандартный AI SDK
6. **Middleware**: [middleware.ts](middleware.ts:1) — гостевая аутентификация, защита роутов, доступ к /docs
7. **Документация API**: Доступна на `/docs` через Scalar UI ([app/docs/page.tsx](app/docs/page.tsx))

## Дополнительная документация

- [AREA_IMPLEMENTATION_GUIDE_RU.md](AREA_IMPLEMENTATION_GUIDE_RU.md) — детальное руководство по реализации Area
- [README.md](README.md) — общая информация о проекте
- [test-avrora.md](test-avrora.md) — тестовые сценарии
