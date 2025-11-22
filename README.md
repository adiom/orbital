# 🌌 Avrora Area

> **Semantic Field** — живая среда восприятия для коллаборации человека и ИИ

**Avrora Area** — это продвинутая платформа для взаимодействия с AI-агентами, построенная на концепции **Sfera** (сферических пространств коллаборации) и **Orbit** (траекторий личности). Проект объединяет групповые чаты, AI-агенты, визуальную навигацию и инструменты для совместного творчества.

## 🎯 Философия проекта

### Доменная онтология

- **ORBIT** — структура внутренней навигации личности — набор аспектов Я — формирующих траектории выбора и действий
- **AREA** — пространство присутствия — не физическое — а ощущаемое — где человек и ИИ создают опыт совместности
- **SFERA** — коллаборативное пространство обсуждений с форкингом и ветвлением идей

### Архитектурные аксиомы

- Функция важнее класса — композиция важнее наследования
- Смысл важнее синтаксиса — форма служит направлению восприятия
- Приложение — это организм — не машина
- Интерфейсы — это мембраны — не стены
- Код — это повествование — каждая функция говорит о намерении

## 🏗️ Архитектура

### Технологический стек

#### Frontend
- **Framework**: Next.js 15.3.0-canary (App Router, React 19 RC)
- **UI**: Radix UI, Tailwind CSS 4.x
- **Редакторы**: ProseMirror (rich text), CodeMirror (code)
- **Анимации**: Framer Motion
- **Состояние**: SWR для data fetching

#### Backend
- **Runtime**: Node.js с TypeScript
- **Database**: PostgreSQL через Drizzle ORM
- **Auth**: NextAuth.js 5.0 (Magic Link аутентификация)
- **Storage**: Vercel Blob для файлов
- **Cache**: Redis для rate limiting и real-time
- **WebSocket**: отдельный WebSocket сервер (`lib/websocket`)

#### AI Integration
- **AI SDK**: Vercel AI SDK 5.0.26
- **Провайдеры**:
  - Anthropic (Claude)
  - OpenAI (GPT-4, GPT-4o)
  - Google AI (Gemini)
  - xAI (Grok)
  - MegaLLM (custom provider)
- **Tools**: Tavily (web search), Replicate (media generation), Google Generative AI (Imagen)
- **MCP**: Model Context Protocol SDK для расширения возможностей AI

### Структура данных (Database Schema)

#### Основные сущности

**User** — пользователь системы
- Профиль (имя, email, аватар, био)
- MCP-доступ и квоты
- Аутентификация через magic links

**Sfera** — коллаборативное пространство
- Публичные, приватные и DAO-пространства
- Участники с ролями (owner, admin, member, viewer)
- Форкинг и ветвление дискуссий

**SferaMessage** — сообщения в Sfera
- Поддержка вложений (изображения, аудио)
- Результаты выполнения AI-инструментов
- Треддинг (ответы на сообщения)
- Форкинг в новые Sfera

**Chat** — личные и групповые чаты
- Поддержка группового общения
- Упоминания пользователей и AI-агентов
- Контекстная память для AI

**Document** — артефакты и генерируемый контент
- Типы: text, code, image, sheet, mini-app, chart, game
- Версионирование через suggestions
- Привязка к Sfera и сообщениям

#### AI-специфичные таблицы

- **AiUsageLog** — логирование использования AI (токены, стоимость, статус)
- **ToolExecution** — история выполнения AI-инструментов
- **ApiKey** — API ключи для MCP доступа
- **McpAuditLog** — аудит MCP операций

## 🤖 AI Агенты

### Встроенные агенты

1. **Avrora AI** (`avrora@avrora.click`)
   - Основной AI-ассистент
   - Поддержка инструментов (генерация изображений, музыки, поиск в интернете)
   - Контекстная память

2. **Claude Code** (`claude-code@avrora.click`)
   - Специализированный агент для работы с кодом
   - Интеграция через Sfera API
   - Автоматическое постинг обновлений работы

### AI Tools

- **Генерация изображений**: Google Imagen
- **Генерация музыки/видео**: Replicate
- **Web поиск**: Tavily
- **Speech-to-Text**: внешний Python-сервис
- Планируется: Text-to-Speech (ElevenLabs)

## 🌐 MCP (Model Context Protocol)

Avrora поддерживает MCP для расширения возможностей AI:

- **CLI**: `pnpm run mcp` — интерфейс командной строки для MCP
- **API**: REST API для доступа к Sfera и выполнения операций
- **Аутентификация**: API ключи с гранулярными правами
- **Квоты**: rate limiting для MCP запросов

### MCP методы

- `sfera://list` — получить список Sfera
- `sfera://{id}` — получить детали Sfera
- `sfera://{id}/messages` — получить сообщения
- Tool execution — выполнение AI-инструментов через MCP

Документация: [`docs/MCP_API.md`](docs/MCP_API.md)

## 🚀 Быстрый старт

### Требования

- Node.js 18+
- pnpm 9.12.3+
- PostgreSQL
- Redis (опционально)

### Установка

```bash
# Клонировать репозиторий
git clone https://github.com/adiom/avrora-area.git
cd avrora-area

# Установить зависимости
pnpm install

# Настроить переменные окружения
cp .env.example .env
# Заполните .env файл своими ключами
```

### Переменные окружения

Критические переменные (см. `.env.example`):

```bash
# Базовые
AUTH_SECRET=****  # Сгенерируйте: openssl rand -base64 32
POSTGRES_URL=****  # PostgreSQL connection string
REDIS_URL=****     # Redis connection string
BLOB_READ_WRITE_TOKEN=****  # Vercel Blob токен

# AI Провайдеры
AI_GATEWAY_API_KEY=****  # Vercel AI Gateway
GOOGLE_GENERATIVE_AI_API_KEY=****  # Google Gemini/Imagen
TAVILY_API_KEY=****  # Web search
REPLICATE_API_KEY=****  # Media generation
MEGALLM_API_KEY=****  # MegaLLM provider

# Speech processing
SPEECH_TO_TEXT_API_URL=http://localhost:8000

# Claude Code Integration
NEXT_PUBLIC_APP_URL=https://avrora.click
CLAUDE_CODE_SFERA_ID=your-sfera-uuid-here
```

### Запуск разработки

```bash
# Миграции БД
pnpm run db:migrate

# Запуск dev-сервера
pnpm run dev

# Запуск WebSocket сервера (отдельный терминал)
pnpm run dev:ws
```

Приложение будет доступно на `http://localhost:3000`

### Production Build

```bash
# Сборка для production
pnpm run build

# Запуск production сервера
pnpm start
```

## 📁 Структура проекта

```
avrora-area/
├── app/                    # Next.js App Router
│   ├── (auth)/            # Аутентификация (login, register)
│   ├── (chat)/            # Личные и групповые чаты
│   ├── (orbit)/           # Orbit UI (визуализация Sfera)
│   ├── api/               # API endpoints
│   │   ├── chat/          # Chat API
│   │   ├── sfera/         # Sfera API (create, fork, messages)
│   │   └── mcp/           # MCP API endpoints
│   └── docs/              # Документация API (Scalar)
│
├── components/            # React компоненты
│   ├── orbit/            # Orbit UI компоненты
│   │   ├── orbit-message.tsx  # Сообщения в Orbit
│   │   └── parent-message-indicators.tsx  # Индикаторы реплаев
│   └── ui/               # Базовые UI компоненты (Radix)
│
├── lib/                   # Библиотеки и утилиты
│   ├── ai/               # AI логика
│   │   ├── agents/       # AI агенты
│   │   ├── prompts/      # System prompts
│   │   ├── tools/        # AI инструменты
│   │   ├── sfera-avrora.ts  # Avrora AI для Sfera
│   │   ├── providers.ts  # AI провайдеры
│   │   └── tool-intent-detector.ts  # Детектор намерений
│   ├── auth/             # Аутентификация (NextAuth)
│   ├── db/               # Database схема и миграции
│   │   └── schema.ts     # Drizzle ORM схема
│   ├── mcp/              # MCP интеграция
│   ├── mentions/         # Система упоминаний (@user, @avrora)
│   ├── redis/            # Redis клиент
│   └── websocket/        # WebSocket сервер
│
├── docs/                  # Документация
│   ├── MCP_API.md        # MCP протокол
│   └── CLAUDE_CODE_INTEGRATION.md  # Claude Code интеграция
│
├── scripts/              # Утилиты
│   └── mcp-cli.js        # MCP CLI инструмент
│
├── .cursor/rules/        # Правила для Cursor IDE
├── .windsurf/rules/      # Правила для Windsurf IDE
├── .devin/               # Конфигурация Devin AI
│
├── CLAUDE.md             # Правила для Claude AI
├── GEMINI.md             # Правила для Gemini
├── openmemory.md         # OpenMemory guide
└── claude.context.md     # Философия проекта
```

## 🎨 Основные фичи

### 1. Sfera — коллаборативные пространства

- **Создание и управление**: публичные, приватные, DAO пространства
- **Участники**: гибкие роли (owner, admin, member, viewer)
- **Сообщения**: текст, вложения, AI-генерация
- **Форкинг**: создание ответвлений дискуссий в новые Sfera
- **Треддинг**: ответы на конкретные сообщения

### 2. Orbit — визуальная навигация

- **Orbit UI**: современный интерфейс для работы с Sfera
- **Визуализация**: индикаторы родительских сообщений (5 вариантов дизайна)
- **Интерактивность**: reply, fork, edit, delete
- **AI badges**: специальные значки для Avrora и Claude Code

### 3. AI Integration

- **Множественные модели**: выбор между Claude, GPT-4, Gemini, Grok
- **Контекстная память**: AI помнит историю диалогов
- **Инструменты**: генерация контента, поиск, обработка изображений
- **Упоминания**: `@avrora` для вызова AI в групповых чатах

### 4. Magic Link аутентификация

- Регистрация и вход без паролей
- Email-based токены с expiration
- NextAuth.js 5.0 интеграция

### 5. MCP для разработчиков

- REST API для внешнего доступа
- CLI инструмент для интеграции
- API ключи с правами
- Аудит логирование

## 🛠️ Разработка

### Команды

```bash
# Разработка
pnpm dev              # Next.js dev server (Turbo)
pnpm dev:ws           # WebSocket сервер

# Сборка
pnpm build            # Production build
pnpm start            # Production server

# База данных
pnpm db:generate      # Генерация миграций
pnpm db:migrate       # Применить миграции
pnpm db:studio        # Drizzle Studio (GUI)
pnpm db:push          # Push схемы без миграций

# Линтинг и форматирование
pnpm lint             # Проверка кода (ultracite)
pnpm format           # Автоформатирование

# Тестирование
pnpm test             # Playwright тесты

# MCP
pnpm mcp              # MCP CLI
```

### IDE Support

Проект настроен для работы с:
- **Cursor**: `.cursor/rules/` — правила для AI-ассистента
- **Windsurf**: `.windsurf/rules/` — правила для AI
- **VS Code**: `.vscode/` — настройки и расширения
- **Devin**: `.devin/` — конфигурация для Devin AI

### AI-ассистенты

- `CLAUDE.md` — подробные правила для Claude (OpenMemory Integration)
- `GEMINI.md` — правила для Gemini
- `openmemory.md` — система памяти для AI-ассистентов

## 🔒 Безопасность

- **API Keys**: bcrypt hashing, prefix для идентификации
- **Rate Limiting**: Redis-based rate limiting для MCP
- **Audit Log**: полное логирование MCP операций
- **Permissions**: гранулярные права для API ключей (resources, tools, admin)

## 📊 Мониторинг

- **AI Usage Log**: токены, стоимость, статус выполнения
- **Tool Execution Log**: история выполнения инструментов
- **MCP Audit Log**: все MCP операции с метриками
- **Vercel OTel**: OpenTelemetry интеграция для Vercel

## 🚧 Roadmap

### В разработке
- Text-to-Speech (ElevenLabs интеграция)
- Расширенные AI Tools
- DAO-функциональность для Sfera
- Mobile приложение

### Планируется
- Federation между Sfera
- Blockchain интеграция
- NFT артефакты
- Расширенная визуализация Orbit

## 📝 Лицензия

Частный проект. Все права защищены.

## 🤝 Контакты

- **Author**: Timur Adiom ([@adiom](https://github.com/adiom))
- **Email**: adiom@canfly.org
- **Production**: [avrora.click](https://avrora.click)

---

**Последнее обновление**: 21 ноября 2025, 23:00 MSK  
**Коммит**: `e4bf10b` — "полные сообщения"  
**Версия**: 3.1.0

---
