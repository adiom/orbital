import { config } from "dotenv";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { sfera, sferaMember, sferaMessage, user } from "@/lib/db/schema";

config({ path: ".env.local" });

if (!process.env.POSTGRES_URL) {
  throw new Error("POSTGRES_URL is not defined");
}

const connection = postgres(process.env.POSTGRES_URL, { max: 1 });
const db = drizzle(connection);

const DEV_EMAIL = "dev@canfly.org";
const OWNER_EMAIL = "adiom@list.ru";
const SPACE_TITLE = "План запуска Orbital — техзадание";
const SPACE_DESCRIPTION =
  "Супер-детальный executable-бриф по волнам подготовки к запуску. Написан так, чтобы каждое сообщение можно было отдать отдельной LLM как задачу с путями к файлам, шагами и критериями готовности.";

// Each message is a self-contained task brief. Written for handoff to another LLM.
const MESSAGES: string[] = [
  `# План запуска Orbital — как пользоваться этим брифом

Этот тред — executable-техзадание. Каждое следующее сообщение = одна изолированная задача, которую можно отдать LLM (Claude Code / Cursor / другой агент) без остального контекста.

**Стек проекта (факты из аудита кода):**
- Next.js App Router, React 19, TypeScript
- PostgreSQL + Drizzle ORM (\`lib/db/schema.ts\`, миграции в \`lib/db/migrations/\`)
- Redis (rate limiting)
- NextAuth v5 beta (\`app/(auth)/auth.ts\`), magic-link через Postmark
- AI: сейчас Ollama Cloud (\`lib/ai/providers.ts\`), НЕ Anthropic, вопреки CLAUDE.md
- Vercel AI SDK (\`streamText\`), WebSocket-сервер отдельным процессом (\`lib/websocket/server.ts\`)
- Основная сущность — \`Sfera\` (внутреннее имя ячейки), сообщения — \`SferaMessage\`
- Точка входа — \`app/page.tsx\` (живая карта), НЕ \`app/(orbit)/orbits/new_home/page.tsx\` (его нет)

**Правила продукта (из CLAUDE.md, соблюдать в любой правке UI):**
- Публичное имя — Orbital. «Avrora Area» — не использовать. Avrora — только имя AI.
- Не выдумывать данные в UI: показывать только то, что реально есть в БД.
- Внутренние имена (Orbit/Sfera) не светить в публичном UI.
- Глаголы/состояния в копи: \`Создать...\`, \`живёт\`, \`созревает\`, \`тихо\`. Ветвление — \`Продолжение:\`, не \`Forked from:\`.
- Не делать широких изменений схемы без проверки текущих миграций.

**Формат каждой задачи ниже:** Цель → Контекст/файлы → Шаги → Критерий готовности (DoD) → Риски.

Порядок волн строгий: Волна 1 (блокеры) → Волна 2 (прод-инфра) → Волна 3 (лендинг/приём) → плюс отдельные фичи-хуки.`,

  `## ВОЛНА 1 · Задача 1.1 — Аудит и документирование ВСЕХ переменных окружения

**Цель:** \`.env.example\` должен содержать все переменные, реально используемые в коде, с комментариями «зачем» и «обязательна ли». Сейчас часть env скрыта и без них прод не работает.

**Контекст / файлы:**
- \`.env.example\` (обновить)
- \`lib/ai/providers.ts\` — использует \`OLLAMA_API_KEY\`, \`OLLAMA_CLOUD_BASE_URL\` (свой загрузчик .env)
- \`app/(auth)/actions.ts\` — \`POSTMARK_SERVER_TOKEN\`, \`POSTMARK_FROM_EMAIL\`, \`POSTMARK_MESSAGE_STREAM\`, \`NEXTAUTH_URL\`/\`NEXT_PUBLIC_SITE_URL\`
- \`lib/websocket/server.ts\` — \`NEXT_PUBLIC_WS_URL\`, \`WS_PORT\`
- \`lib/db/index.ts\` — \`POSTGRES_URL\`, \`POSTGRES_MAX_CONNECTIONS\`

**Шаги:**
1. \`grep -rn "process.env." lib/ app/ scripts/\` — собрать полный список ключей.
2. Свести в таблицу: имя, где используется, обязательна/опциональна, дефолт.
3. Дописать в \`.env.example\` недостающие: \`OLLAMA_API_KEY\`, \`OLLAMA_CLOUD_BASE_URL\`, \`POSTMARK_SERVER_TOKEN\`, \`POSTMARK_FROM_EMAIL\`, \`POSTMARK_MESSAGE_STREAM\`, \`NEXTAUTH_URL\`, \`NEXT_PUBLIC_WS_URL\`, \`WS_PORT\`, \`POSTGRES_MAX_CONNECTIONS\`, \`SFERA_CLAUDE_UUID\`.
4. Каждой строке — комментарий над ней с назначением.
5. Добавить в начало файла блок «# ОБЯЗАТЕЛЬНЫЕ ДЛЯ ПРОДА» со списком.

**DoD:** свежий клон с заполненным по \`.env.example\` \`.env.local\` поднимает \`pnpm dev\` без падений от отсутствующих env. Ни одного \`process.env.X\`, которого нет в \`.env.example\`.

**Риски:** есть собственные загрузчики .env (в \`providers.ts\`) — проверить, что они читают тот же файл.`,

  `## ВОЛНА 1 · Задача 1.2 — Решение по AI-провайдеру (критический блокер)

**Цель:** чат/AI не должен зависеть от единственного недокументированного ключа Ollama без фолбэка. Принять решение и реализовать.

**Контекст / файлы:**
- \`lib/ai/providers.ts\` — реестр моделей строится ТОЛЬКО если есть \`OLLAMA_API_KEY\`; иначе \`languageModels\` пустой и всё падает с «No language models available».
- \`lib/ai/models.ts\` — display-имена (Avrora, Avrora Reasoning).
- В \`package.json\` установлены \`@ai-sdk/anthropic\`, \`@ai-sdk/openai\`, \`@ai-sdk/google\`, \`@ai-sdk/xai\`, но в коде НЕ используются для чата.

**Развилка (выбрать одно, зафиксировать в этом треде):**
- **Вариант A (быстрее к запуску):** оставить Ollama Cloud, но: (1) задокументировать ключ, (2) добавить явную проверку при старте с понятной ошибкой, (3) health-эндпоинт (см. задачу-хук).
- **Вариант B (надёжнее для прода):** переключить основной чат на Anthropic (SDK уже стоит). Модель — Claude. Env \`ANTHROPIC_API_KEY\`. Ollama оставить как опциональный фолбэк.

**Шаги (для B):**
1. В \`providers.ts\` добавить ветку: если есть \`ANTHROPIC_API_KEY\` — регистрировать \`anthropic("claude-...")\` под ключами \`chat-model\`, \`chat-model-reasoning\`, \`title-model\`.
2. Приоритет: Anthropic → Ollama → пусто. Логировать выбранного провайдера при старте.
3. Не менять сигнатуры, которые дергает \`sfera/[id]/chat/route.ts\` (ключи моделей те же).
4. Прогнать сквозной чат в ячейке.

**DoD:** при наличии хотя бы одного AI-ключа чат работает; при отсутствии всех — понятная ошибка в логах и деградация в UI (не белый экран).

**Риски:** разные провайдеры по-разному стримят tool-calls — проверить \`lib/ai/agents/base-streamer.ts\` (там хардкод \`provider: "openai"\`).`,

  `## ВОЛНА 1 · Задача 1.3 — Починить рассинхрон миграций (блокер БД)

**Цель:** один источник правды по миграциям; прод-схема гарантированно = \`schema.ts\`.

**Контекст / файлы:**
- \`lib/db/migrations/\` — 23 \`.sql\`, но \`meta/_journal.json\` знает только 20.
- Не в журнале (НЕ применяются через \`pnpm db:migrate\`): \`0011_refactor_sfera_fork.sql\`, \`0012_add_attachments_to_sfera_message.sql\`, \`0013_add_ai_tools_tables.sql\`.
- Коллизия имён с журнальными \`0011_fuzzy_hellcat\`, \`0012_lame_human_fly\`, \`0013_giant_microchip\`.

**Шаги:**
1. \`pnpm db:check\` — зафиксировать текущий статус.
2. Сравнить содержимое трёх «сиротских» файлов с журнальными: изменения (fork refactor, attachments в SferaMessage, ai-tools таблицы) уже применены к БД или нет?
   - Проверить по реальной БД: есть ли колонка \`attachments\` в \`SferaMessage\`, таблицы \`ToolExecution\`/\`SferaArtifact\`/\`AiUsageLog\`, новая структура fork.
3. Если изменения В БД есть, а в журнале нет — привести в порядок: либо удалить дубликаты-сироты (если журнальные их покрывают), либо корректно внести в журнал.
4. НЕ придумывать новые миграции без \`pnpm db:generate\`. Сверять с \`schema.ts\`.
5. После — \`pnpm db:migrate\` на чистой тестовой БД должен пройти без ошибок и дать схему = \`schema.ts\`.

**DoD:** чистая БД + \`pnpm db:migrate\` → схема идентична \`schema.ts\`; \`pnpm db:check\` без предупреждений; в \`migrations/\` нет файлов вне журнала.

**Риски:** высокий. Работать на копии прод-БД, не на живой. Сделать бэкап до любых операций.`,

  `## ВОЛНА 1 · Задача 1.4 — Настоящая авторизация в WebSocket (дыра в безопасности)

**Цель:** убрать mock-userId; реальная JWT-проверка и проверка членства.

**Контекст / файлы:**
- \`lib/websocket/server.ts:24\` — TODO: «Implement proper JWT verification... return a mock userId for development». Плюс TODO «Check ChatMember table for group chats».
- Токены/сессии — NextAuth v5 JWT (\`app/(auth)/auth.ts\`).
- Членство в ячейке — таблица \`SferaMember\` (\`schema.ts\`).

**Шаги:**
1. При подключении клиента читать JWT (из query-параметра/заголовка/куки — как передаёт клиент; см. \`lib/websocket/use-websocket.ts\`).
2. Верифицировать той же секрет-логикой, что NextAuth (\`AUTH_SECRET\`). Достать \`userId\`.
3. При подписке на канал ячейки — проверять запись в \`SferaMember\` (userId + sferaId). Нет членства → закрыть соединение / отклонить подписку.
4. Логировать отказы. Убрать mock полностью.

**DoD:** нельзя подключиться без валидного токена; нельзя слушать чужую приватную ячейку без членства; тест: соединение с поддельным/пустым токеном отклоняется.

**Риски:** WS-сервер — отдельный процесс, не Next.js. Убедиться, что у него есть доступ к \`AUTH_SECRET\` и к БД.`,

  `## ВОЛНА 1 · Задача 1.5 — Вернуть CSRF в magic-link + проверить письмо в проде

**Цель:** закрыть отключённую защиту и убедиться, что вход по email реально работает.

**Контекст / файлы:**
- \`app/(auth)/actions.ts\` — в \`createMagicLink\` CSRF-проверка закомментирована («временно убираем в разработке»). Письмо шлётся только при \`NODE_ENV !== "development"\` (Postmark). В dev — только \`console.log\`.

**Шаги:**
1. Вернуть/восстановить CSRF-валидацию в \`createMagicLink\`. Если механизм был самописный — восстановить его; если нет — использовать next-safe-action/встроенную защиту форм.
2. Проверить rate-limit (сейчас 3/15мин на email) — оставить.
3. В прод-режиме прогнать реальную отправку через Postmark: заполнить \`POSTMARK_SERVER_TOKEN\`, \`POSTMARK_FROM_EMAIL\`, верифицировать sender-домен в Postmark.
4. Для локального теста без прод-env — оставить \`console.log\` кода, но за явным флагом.

**DoD:** запрос магик-линка на реальный email в прод-режиме доставляет письмо; код одноразовый, истекает за 15 мин; CSRF включён; повторные запросы лимитируются.

**Риски:** непроверенный sender-домен в Postmark → письма в спам/отбой. Настроить SPF/DKIM.`,

  `## ВОЛНА 1 · Задача 1.6 — Ручной сквозной прогон базовых функций + чек-лист

**Цель:** зафиксировать, что «базовые функции работают», как воспроизводимый чек-лист.

**Контекст:** это не код, а QA-скрипт. Оформить как \`docs/LAUNCH_SMOKE_CHECKLIST.md\`.

**Сценарий (каждый шаг = пройдено/нет + заметка):**
1. Регистрация нового email → приходит магик-линк → вход.
2. Онбординг (\`onboarding/start\`) отрабатывает, создаётся первая ячейка.
3. Живая карта (\`app/page.tsx\`) рендерится, показывает ячейку с состоянием (\`живёт\`/\`созревает\`/\`тихо\`).
4. Создать новую ячейку (\`Создать...\`) → POST \`/api/sfera\`.
5. Открыть ячейку, отправить сообщение → сохраняется (\`SferaMessage\`).
6. Упомянуть \`@Avrora\` → приходит стриминговый AI-ответ (\`sfera/[id]/chat\`).
7. Форк/продолжение сообщения → создаётся связанная ячейка, в UI «Продолжение:».
8. Профиль \`/u/[handle]\` открывается, редактор профиля сохраняет.
9. Разлогин → защищённые страницы редиректят на \`/login\`.
10. Realtime: во второй вкладке новое сообщение появляется без перезагрузки.

**DoD:** все 10 пунктов зелёные на прод-подобном окружении; файл чек-листа в репо; любые падения заведены отдельными задачами.`,

  `## ВОЛНА 2 · Задача 2.1 — Деплой: Vercel (app) + отдельный хост для WebSocket

**Цель:** воспроизводимый прод-деплой. WS-сервер не serverless — ему нужен отдельный процесс.

**Контекст / файлы:**
- Нет \`vercel.json\`, \`Dockerfile\`, CI. \`next.config.ts\` минимальный, содержит хардкод LAN-IP (\`10.37.180.52\`) и ngrok-хост в \`allowedDevOrigins\` — убрать для прода.
- \`package.json\`: \`build\` = \`next build\` (миграции НЕ гоняет, вопреки CLAUDE.md). WS: \`tsx lib/websocket/server.ts\`.

**Шаги:**
1. Next.js приложение → Vercel. Подключить прод Postgres (Neon/Supabase/Vercel Postgres) и Redis (Upstash).
2. Прогонять миграции в CI/предеплой-шаге (не в \`next build\`): отдельный job \`pnpm db:migrate\`.
3. WS-сервер (\`lib/websocket/server.ts\`) задеплоить отдельно (Railway/Fly/render/VPS) как long-running процесс. Прокинуть \`AUTH_SECRET\`, \`POSTGRES_URL\`, \`WS_PORT\`. Обновить \`NEXT_PUBLIC_WS_URL\` на публичный wss://.
4. Убрать из \`next.config.ts\` dev-хосты; вынести в env при необходимости.
5. Прописать все env из задачи 1.1 в дашбордах Vercel и WS-хоста.

**DoD:** прод-URL открывается, вход работает, realtime через wss:// работает, миграции применены. Деплой описан в \`docs/DEPLOY.md\`.

**Риски:** WS на serverless не живёт — не пытаться пихать в Vercel Functions. Держать sticky/long-running.`,

  `## ВОЛНА 2 · Задача 2.2 — Обработка ошибок, пустые состояния, мониторинг

**Цель:** первые юзеры не должны видеть белый экран; ты должен видеть падения.

**Контекст / файлы:**
- 99 \`console.error\` по \`app/\` и \`lib/\` — логи есть, но никуда не собираются.
- AI завязан на внешний ключ → нужна деградация, когда провайдер лёг.

**Шаги:**
1. Подключить Sentry (или аналог) для Next.js + для WS-процесса. \`SENTRY_DSN\` в env-таблицу.
2. Добавить \`app/error.tsx\`, \`app/not-found.tsx\`, \`loading.tsx\` для ключевых сегментов.
3. Пустые состояния: пустая карта («Создать...» как приглашение), ячейка без сообщений, профиль без ячеек.
4. Деградация AI: если провайдер недоступен — сообщение «Avrora сейчас недоступна», а не краш стрима. Ловить в \`sfera/[id]/chat/route.ts\`.
5. Заменить критичные \`console.error\` на структурный логер + Sentry capture.

**DoD:** отключение AI-ключа даёт понятное сообщение, не белый экран; ошибки прилетают в Sentry с контекстом; все ключевые сегменты имеют error/loading/empty состояния.`,

  `## ВОЛНА 2 · Задача 2.3 — Убрать dev-мусор и закрыть тестовые страницы

**Цель:** прод не должен отдавать демо/тест-страницы.

**Контекст / файлы:**
- \`app/test-artifact/page.tsx\` — демо с хардкод todo-list.
- \`app/v2\`, \`app/docs/*\` — проверить, что должно быть публично.
- \`next.config.ts\` — хардкод LAN-IP и ngrok.

**Шаги:**
1. Удалить или закрыть за флагом/авторизацией \`app/test-artifact\`, \`app/v2\` (если это не прод-функции).
2. Ревизия \`app/docs/*\`: оставить только то, что должно быть публичным.
3. Почистить \`next.config.ts\` от dev-хостов.
4. Проверить \`robots.txt\`/метатеги, чтобы тест-страницы не индексировались (если остаются).

**DoD:** ни одна dev/демо-страница не доступна анонимно в проде; \`next.config.ts\` без хардкод-IP.`,

  `## ВОЛНА 2 · Задача 2.4 — Минимальный CI + smoke-тесты

**Цель:** каждый PR проверяется автоматически; есть хотя бы 1 e2e на критичный путь.

**Контекст / файлы:**
- CI нет (\`.github/\` отсутствует). Юнит-тестов 3 (\`lib/api/validation.test.ts\`, \`lib/ai/agents/detector.test.ts\`, \`lib/ai/agents/cf-kristina-mcp.test.ts\`).
- \`playwright.config.ts\` указывает на \`./tests\`, но папки НЕТ — \`pnpm test\` не имеет что гонять.

**Шаги:**
1. \`.github/workflows/ci.yml\`: на PR — \`pnpm install\`, \`pnpm lint\`, \`pnpm build\`, \`pnpm test:unit\`.
2. Создать \`tests/\` и написать 1–2 Playwright smoke: (a) \`/login\` рендерится и принимает email; (b) редирект анонима с \`/\` на \`/login\`.
3. Поднять сервисы для e2e (Postgres/Redis) в CI или мокать.
4. Бейдж статуса в README.

**DoD:** PR с падающим lint/build/тестом не мержится зелёным; \`pnpm test\` находит и гоняет хотя бы 1 e2e.

**Риски:** e2e требует env и сервисов — начать с юнит + build, e2e добавить минимально.`,

  `## ВОЛНА 3 · Задача 3.1 — Публичный лендинг (позиционирование)

**Цель:** посадочная под «разговоры становятся знанием» для анонимов.

**Контекст:**
- Сейчас \`app/page.tsx\` редиректит анонимов на \`/login\` — нет публичной витрины.
- Позиционирование — в ячейке «Раскрутка Orbital» (\`3e361cf6-fb55-4795-8b96-151096e3b46e\`).

**Шаги:**
1. Публичный маршрут лендинга (напр. \`app/(marketing)/page.tsx\` или отдать \`/\` анониму лендинг вместо редиректа).
2. Блоки: крючок («У тебя сотни гениальных диалогов с AI. Где они все?»), сдвиг (живая карта), обещание (ничего не теряется), CTA \`Создать...\` / войти, демо-видео/скрин живой карты.
3. Копи по правилам CLAUDE.md: без «AI-чат/база знаний/граф/заметки». Продавать состояние.
4. SEO: title, description, OG-изображение.

**DoD:** аноним на \`/\` видит лендинг, а не редирект; CTA ведёт на вход/создание; страница индексируется.

**Риски:** не сломать существующий редирект для залогиненных — им сразу карта.`,

  `## ВОЛНА 3 · Задача 3.2 — Инвайты / waitlist (управляемый приём)

**Цель:** контролируемый вход первых юзеров вместо открытых дверей.

**Контекст / файлы:**
- Есть \`guest\`-провайдер и magic-link (\`app/(auth)/\`). Инвайты ложатся поверх.

**Шаги (выбрать модель):**
- **Waitlist:** форма email → таблица \`Waitlist\`, ручная/пакетная рассылка магик-линков.
- **Инвайт-коды:** таблица \`InviteCode\` (code, createdBy, usedBy, expiresAt); регистрация требует валидный код.
1. Мини-миграция через \`pnpm db:generate\` (не руками!).
2. Гейт на регистрацию/первый вход.
3. Экран «ты в списке» / «нужен инвайт».

**DoD:** без инвайта/не из списка зарегистрироваться нельзя; выдача кодов работает; всё через нормальную миграцию.

**Риски:** не сломать существующий guest-flow, если он нужен для демо.`,

  `## ВОЛНА 3 · Задача 3.3 — Аналитика активации (не vanity-метрики)

**Цель:** видеть, наступает ли момент «вау», а не просто трафик.

**Контекст (из стратегии):** activation event, например «создал/импортировал ячейку И открыл карту ≥3 раз» или «карта показала связь, которую юзер не заметил».

**Шаги:**
1. Подключить аналитику (PostHog предпочтительно — self-host/cloud, есть retention/funnels).
2. Разметить события: \`signup\`, \`onboarding_completed\`, \`cell_created\`, \`message_sent\`, \`avrora_replied\`, \`map_opened\`, \`import_completed\` (если будет хук импорта), \`cell_forked\`.
3. Собрать в PostHog воронку активации и retention-когорты по неделям.
4. Не трекать PII сверх необходимого; уважать приватность.

**DoD:** дашборд показывает воронку signup→активация и retention недели 1/4; каждое ключевое действие шлёт событие.`,

  `## ФИЧА-ХУК A — Импорт истории ChatGPT/Claude (сильнейший активационный хук)

**Цель:** юзер грузит экспорт диалогов → сразу видит СВОЮ живую карту из СВОИХ мыслей. Убивает «пустой экран», даёт «вау» за 30 сек.

**Контекст / файлы:**
- Модель готова: \`Sfera\` (ячейка) + \`SferaMessage\` (\`schema.ts\`). Создание — \`/api/sfera\`, паттерн вставки — \`scripts/setup-growth-space.ts\`.
- ChatGPT экспорт: \`conversations.json\` (массив бесед с mapping-деревом сообщений). Claude экспорт: JSON с conversations/messages.

**Шаги:**
1. UI загрузки файла (\`files/upload\` уже есть) на онбординге/в пустой карте.
2. Парсер: определить формат (ChatGPT vs Claude) → нормализовать в \`{title, messages[]}\`.
3. Маппинг: каждая беседа → ячейка \`Sfera\`; каждое сообщение → \`SferaMessage\` (роль user/agent, \`createdAt\` из экспорта для правильной раскладки по времени и состояний).
4. Батчинг + прогресс (диалогов могут быть сотни). Идемпотентность по \`idempotencyKey\`.
5. После импорта — редирект на живую карту, чтобы человек увидел результат.

**DoD:** загрузка реального экспорта ChatGPT создаёт ячейки с сообщениями и корректными датами; карта показывает их с состояниями; повторный импорт не дублирует.

**Риски:** большие файлы (лимиты аплоада, таймауты) → стримить/чанкать. Приватность: диалоги чувствительны — не логировать содержимое.`,

  `## ФИЧА-ХУК B — Health-check AI + видимый статус Avrora

**Цель:** раз весь чат висит на внешнем AI-ключе — нужен видимый статус и понятная деградация.

**Контекст / файлы:**
- \`lib/ai/providers.ts\` — источник провайдера. \`sfera/[id]/chat/route.ts\` — где стримится ответ.

**Шаги:**
1. Эндпоинт \`GET /api/health\` — проверяет: БД (простой select), Redis (ping), AI-провайдер (наличие ключа + лёгкий ping/наличие модели). Возвращает JSON со статусами.
2. В UI — ненавязчивый индикатор «Avrora на связи / недоступна» (только когда реально недоступна, по правилу «не выдумывать данные»).
3. При недоступности AI — не давать отправить \`@Avrora\` в пустоту; понятное сообщение.

**DoD:** \`/api/health\` отражает реальный статус компонентов; при снятом AI-ключе UI сообщает о недоступности, а не падает.

**Риски:** не дёргать платный AI слишком часто в health-пинге — кэшировать статус на N секунд.`,

  `## ФИЧА-ХУК C — Онбординг, который сразу показывает живую карту

**Цель:** через ~60 сек после входа человек видит не пустоту, а живую карту (примеры или результат импорта).

**Контекст / файлы:**
- \`app/api/onboarding/start/route.ts\` — уже создаёт онбординг-ячейку через фиксированного агента (UUID \`...009\`).

**Шаги:**
1. Довести онбординг: после ответов создавать 2–3 связанные ячейки-примера ИЛИ предложить импорт (Хук A).
2. Финал онбординга → редирект на \`app/page.tsx\` (живая карта) с уже заполненным состоянием.
3. Копи по правилам: \`Создать...\`, состояния \`живёт/созревает/тихо\`, никаких внутренних имён.
4. Не показывать фейковые данные — если примеров нет, честно вести к «Создать...» или импорту.

**DoD:** новый юзер за минуту доходит до непустой живой карты; путь не показывает выдуманных данных; онбординг переиспользует реальные API (\`/api/sfera\`, onboarding-агент).

**Риски:** не хардкодить фейковые ячейки в прод как «реальные» — либо явные примеры, либо импорт.`,

  `## Порядок исполнения и зависимости

**Строгий порядок:**
1. Волна 1 целиком (1.1→1.6) — без неё нет рабочей базы. 1.1 (env) и 1.3 (миграции) — предпосылки для всего.
2. Волна 2 (2.1→2.4) — прод-инфра. 2.1 (деплой) зависит от 1.1.
3. Волна 3 (3.1→3.3) — приём юзеров. Зависит от рабочего прода (Волна 2).
4. Хуки: A (импорт) — самый ценный, делать параллельно после Волны 1; B (health) — внутри/после 1.2; C (онбординг) — после A.

**Как отдавать в LLM:** одно сообщение = одна сессия/задача. Начинать промпт с блока «Стек» и «Правила продукта» из первого сообщения этого треда, затем вставлять конкретную задачу. Требовать от LLM: сначала прочитать указанные файлы, показать план, потом править; после — прогнать \`pnpm lint\` и \`pnpm build\`.

**Definition of Done всего этапа:** сквозной чек-лист (1.6) зелёный на проде + лендинг + управляемый приём + аналитика активации показывает первых реальных юзеров.`,
];

async function ensureUser(email: string, defaults?: { name: string; displayName: string }) {
  const existing = await db
    .select()
    .from(user)
    .where(eq(user.email, email))
    .limit(1)
    .then((res) => res[0]);
  if (existing) {
    return existing;
  }
  if (!defaults) {
    return null;
  }
  const [created] = await db
    .insert(user)
    .values({ email, name: defaults.name, displayName: defaults.displayName })
    .returning();
  return created;
}

async function setupLaunchPlanSpace() {
  console.log("🚀 Setting up launch-plan space...\n");

  // 1. dev user (owner of content)
  console.log(`1️⃣  Ensuring user ${DEV_EMAIL}...`);
  const devUser = await ensureUser(DEV_EMAIL, { name: "Canfly Dev", displayName: "@dev" });
  if (!devUser) {
    throw new Error(`Could not resolve ${DEV_EMAIL}`);
  }
  console.log(`   ✅ ${devUser.email}: ${devUser.id}`);

  // 2. space
  console.log(`\n2️⃣  Ensuring space "${SPACE_TITLE}"...`);
  let space = await db
    .select()
    .from(sfera)
    .where(eq(sfera.title, SPACE_TITLE))
    .limit(1)
    .then((res) => res[0]);

  if (space) {
    console.log(`   ✅ Space already exists: ${space.id}`);
  } else {
    const [created] = await db
      .insert(sfera)
      .values({
        title: SPACE_TITLE,
        description: SPACE_DESCRIPTION,
        ownerId: devUser.id,
        visibility: "private",
      })
      .returning();
    space = created;
    console.log(`   ✅ Created space: ${space.id}`);
  }

  // 3. membership: dev owner + adiom member
  console.log("\n3️⃣  Ensuring membership...");
  const members = await db
    .select()
    .from(sferaMember)
    .where(eq(sferaMember.sferaId, space.id));

  if (!members.some((m) => m.userId === devUser.id)) {
    await db.insert(sferaMember).values({
      sferaId: space.id,
      userId: devUser.id,
      role: "owner",
    });
    console.log("   ✅ Added dev@canfly.org as owner");
  } else {
    console.log("   ✅ dev@canfly.org already a member");
  }

  const ownerUser = await ensureUser(OWNER_EMAIL);
  if (ownerUser) {
    if (!members.some((m) => m.userId === ownerUser.id)) {
      await db.insert(sferaMember).values({
        sferaId: space.id,
        userId: ownerUser.id,
        role: "member",
      });
      console.log(`   ✅ Added ${OWNER_EMAIL} as member`);
    } else {
      console.log(`   ✅ ${OWNER_EMAIL} already a member`);
    }
  } else {
    console.log(`   ⚠️  ${OWNER_EMAIL} not found - skipping`);
  }

  // 4. messages (idempotent)
  console.log("\n4️⃣  Writing launch-plan content...");
  let inserted = 0;
  let skipped = 0;
  for (let i = 0; i < MESSAGES.length; i++) {
    const idempotencyKey = `launch-plan-v1-${i}`;
    const already = await db
      .select({ id: sferaMessage.id })
      .from(sferaMessage)
      .where(eq(sferaMessage.idempotencyKey, idempotencyKey))
      .limit(1)
      .then((res) => res[0]);

    if (already) {
      skipped++;
      continue;
    }

    const createdAt = new Date(Date.now() + i * 1000);
    await db.insert(sferaMessage).values({
      sferaId: space.id,
      userId: devUser.id,
      content: MESSAGES[i],
      messageType: "user",
      idempotencyKey,
      attachments: [],
      toolResults: [],
      createdAt,
      updatedAt: createdAt,
    });
    inserted++;
  }
  console.log(`   ✅ Messages inserted: ${inserted}, skipped: ${skipped}`);

  console.log("\n" + "=".repeat(50));
  console.log("✨ Launch-plan space ready!");
  console.log("=".repeat(50));
  console.log(`\n📝 Space: "${SPACE_TITLE}" (${space.id})`);
  console.log(`📝 Open:  /orbit/${space.id}\n`);

  process.exit(0);
}

setupLaunchPlanSpace().catch((error) => {
  console.error("❌ Setup failed:", error);
  process.exit(1);
});
