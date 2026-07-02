# DIFF.md

Расхождения между описанием в исходном `CLAUDE.md` и реальным состоянием проекта.
Обнаружено при сверке структуры репозитория. Эти пункты исправлены в обновлённом `CLAUDE.md`.

## Существенные расхождения

### 1. `app/v2/` пуст
- **В CLAUDE.md:** Объявлено правило «весь новый код должен идти в `app/v2/`» (раздел Legacy code constraint, раздел Route groups).
- **В проекте:** Директория `app/v2/` существует, но полностью пуста — ни одного файла.
- **Исправлено:** Добавлена пометка, что директория пока пуста, но директива для нового кода сохраняется.

### 2. Middleware не защищает маршруты
- **В CLAUDE.md (строка 227 оригинала):** «Middleware (`middleware.ts`) protects all routes».
- **В проекте:** `middleware.ts:66` вызывает `NextResponse.next()` для всех запросов, кроме редиректа авторизованных не-guest пользователей с `/login` и `/register` на `/`. Реальной блокировки неавторизованных запросов нет.
- **Исправлено:** Описание переписано — middleware пропускает все запросы после чтения JWT, без реальной защиты маршрутов.

### 3. Несовпадение публичного маршрута сообщения
- **В CLAUDE.md и middleware whitelist:** `/orbit/message/**` указан как публичный маршрут.
- **В проекте:** Реальная страница публичного просмотра — `/m/[uuid]` (`app/(orbit)/m/[uuid]/page.tsx`), используется в `components/sfera/sfera-message.tsx:97`, `components/orbit/orbit-message.tsx:147`, `components/sfera/sfera-group-chat.tsx:225`.
- **В проекте:** Маршрут `/m/[uuid]` **не** внесён в список публичных исключений middleware → «публичная» страница фактически требует авторизации.
- **Исправлено:** В таблице Pages для `/m/[uuid]` добавлена ссылка на middleware note; в Auth flow отмечено, что whitelist-запись `/orbit/message/**` устарела.

### 4. `OPENAI_URL` не задокументирован
- **В CLAUDE.md:** `OPENAI_URL` упоминается в описании AI-системы (строка 51 оригинала) для MegaLLM proxy и используется в `lib/ai/providers.ts:60,69`, но отсутствует в `.env.example` и не указан в разделе «Key env vars» (строка 105 оригинала).
- **Исправлено:** `OPENAI_URL` добавлен в раздел «Key env vars».

### 5. Мёртвая ссылка на `/register`
- **В CLAUDE.md:** Маршрут `/register` обрабатывается в `middleware.ts:56,62`, но страницы `app/(auth)/register/` не существует.
- **Исправлено:** В Auth flow добавлен пункт 8 — `/register` это dead reference.

## Недокументированное в проекте

### 6. API-маршрут `/api/sfera/[id]/claude-code/`
- Пустая директория существует в `app/api/sfera/[id]/claude-code/`, но отсутствовала в таблице API routes.
- **Исправлено:** Добавлена строка в таблицу API routes с пометкой «stub, no route handler».

### 7. Недокументированные скрипты package.json
- Отсутствовали в блоке Commands: `start`, `db:pull`, `db:check`, `db:up`, `shadcn:update`, `mcp`, а также `bin: { "avrora-mcp": "scripts/mcp-cli.js" }`.
- **Исправлено:** Все скрипты добавлены в раздел Commands.

### 8. Недокументированные директории `lib/`
- В CLAUDE.md не упоминались: `lib/claude-code/`, `lib/constants/`, `lib/editor/`, `lib/mentions/`, `lib/redis/`, `lib/services/`, `lib/blob/`, `lib/auth/`.
- **Исправлено:** Добавлен раздел «Other `lib/` directories» с описанием каждой.

### 9. Неполный component tree
- **`components/elements/`** — не указаны: `actions.tsx`, `branch.tsx`, `context.tsx`, `conversation.tsx`, `image.tsx`, `loader.tsx`, `suggestion.tsx`, `task.tsx`, `web-preview.tsx`.
- **`components/orbit/`** — не указаны ~13 файлов: `orbit-constellation-view.tsx`, `orbit-message.tsx`, `orbit-input.tsx`, `orbit-list-view.tsx`, `orbit-settings.tsx`, `orbit-page-header.tsx`, `orbit-error-state.tsx`, `orbit-skeleton.tsx`, `parent-message-indicators.tsx`, `tool-result-display.tsx`, `tool-result-types.ts`, `chart-artifact.tsx`, `mini-app-artifact.tsx`, `new-home/`.
- **`components/sfera/`** — не указан `sfera-mention-button.tsx`.
- **Исправлено:** Списки расширены.

### 10. Промпты
- В `lib/ai/prompts/` помимо `{core,artifacts,sfera,tools}.ts` существует `index.ts` (barrel).
- На уровень выше также существует отдельный файл `lib/ai/prompts.ts`.
- **Исправлено:** Оба упомянуты в разделе AI system.

### 11. Зависимости
- В таблице Key dependencies отсутствовали: `@ai-sdk/anthropic`, `@ai-sdk/xai`, `@ai-sdk/gateway`.
- `@ai-sdk/google` был описан как «Gemini direct (image generation via Imagen)».
- **Исправлено:** Добавлены три adapter-пакета; описание `@ai-sdk/google` объединено в общую строку с остальными провайдерами.
