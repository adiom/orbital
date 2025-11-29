# Avrora Area - OpenMemory Guide

**Project:** adiom/avrora-area  
**Version:** 3.1.0  
**Last Updated:** 2025-11-29

## Overview

Avrora Area — продвинутая AI-платформа для коллаборации,

**Философия:**
- Function over class — композиция вместо наследования
- Meaning over syntax — форма служит восприятию
- Application as organism — не машина
- Code as narrative — каждая функция говорит о намерении

**Ключевые возможности:**
- Sfera Spaces: публичные, приватные и DAO коллаборативные среды с ролевым доступом
- AI Agents: множественные AI-ассистенты (Avrora AI, Claude Code)
- Message Threading & Forking: ответы на сообщения и форки дискуссий в новые Sfera
- Artifacts: генерируемый контент (text, code, images, sheets, mini-apps, charts, games)
- Magic Link Authentication: вход без пароля через email токены
- MCP Integration: Model Context Protocol для расширения AI возможностей
- Multi-Provider AI: поддержка Anthropic, OpenAI, Google, xAI

## User Defined Namespaces

- database
- frontend
- backend
- ai-agents
- api

## Architecture

### Tech Stack

**Core:**
- Next.js 15.3.0-canary с App Router и React 19 RC
- TypeScript 5.6+ (strict mode)
- pnpm 9.12.3+
- PostgreSQL + Drizzle ORM 0.34
- Redis (rate limiting, WebSocket)
- Vercel Blob (file uploads)
- NextAuth.js 5.0 (magic link auth)

**Frontend:**
- UI: Radix UI primitives + Tailwind CSS 4.x
- Rich Text: ProseMirror
- Code Editor: CodeMirror 6
- Animations: Framer Motion
- Data Fetching: SWR
- Charts: Recharts
- Spreadsheets: react-data-grid

**AI Integration:**
- Vercel AI SDK 5.0.26 (streaming)
- Providers: @ai-sdk/anthropic, @ai-sdk/openai, @ai-sdk/google, @ai-sdk/xai
- MCP SDK 1.0.4
- Tools: Tavily (search), Replicate (media), Google Generative AI

**Code Quality:**
- Linter: Ultracite 5.3.9 (extends Biome)
- Formatter: Biome 2.2.2
- Testing: Playwright (E2E)

### Directory Structure

```
avrora-area/
├── app/                    # Next.js App Router
│   ├── (auth)/            # Authentication routes
│   ├── (chat)/            # Personal/group chat
│   ├── (orbit)/           # Orbit UI для Sfera
│   └── api/               # API endpoints
├── components/            # React components
│   ├── ui/               # Base primitives (Radix)
│   ├── orbit/            # Orbit-specific
│   └── elements/         # Reusable chat elements
├── lib/                   # Core business logic
│   ├── ai/               # AI integration
│   ├── db/               # Database layer
│   ├── mcp/              # Model Context Protocol
│   ├── mentions/         # Mention system
│   └── websocket/        # WebSocket server
├── artifacts/             # Artifact implementations
├── hooks/                 # React hooks
└── public/               # Static assets
```

### Database Schema

**Core Tables:**
- `User` - пользователи системы
- `Chat` - личные чаты (deprecated, заменяется на Sfera)
- `Message_v2` - сообщения в чатах
- `Document` - артефакты (text, code, etc.)
- `Suggestion` - AI предложения
- `Stream` - resumable streams

**Sfera System:**
- `Sfera` - коллаборативные пространства
- `SferaMember` - участники с ролями (owner/admin/member/viewer)
- `SferaMessage` - сообщения с threading и forking
- `SferaForkedSfera` - связи форков
- `SferaArtifact` - связь артефактов с Sfera

**AI & MCP:**
- `AgentRegistry` - webhook-based AI agents
- `ToolExecution` - трекинг выполнения AI tools
- `AiUsageLog` - логирование использования AI
- `ApiKey` - MCP API ключи
- `McpAuditLog` - аудит MCP вызовов

**Utilities:**
- `IdempotencyLog` - предотвращение дубликатов (24h TTL)
- `MagicToken` - токены для magic link auth
- `MessageMention` - упоминания в сообщениях
- `ChatMember` - участники чатов (deprecated)

## Components

### Core Components

**Artifact System:**
- `artifact.tsx` - контейнер артефактов
- `code-editor.tsx` - CodeMirror редактор
- `text-editor.tsx` - ProseMirror редактор
- `image-editor.tsx` - редактор изображений
- `sheet-editor.tsx` - табличный редактор

**Chat Elements:**
- `elements/message.tsx` - отображение сообщений
- `elements/response.tsx` - AI ответы
- `elements/conversation.tsx` - контейнер беседы
- `elements/code-block.tsx` - блоки кода с подсветкой
- `elements/tool.tsx` - результаты AI tools
- `elements/reasoning.tsx` - отображение AI reasoning

**Orbit Components:**
- `orbit/orbit-network.tsx` - визуализация сети Sfera
- `orbit/orbit-message.tsx` - сообщения в Orbit view
- `orbit/orbit-chat.tsx` - чат интерфейс
- `orbit/parent-message-indicators.tsx` - индикаторы threading
- `orbit/tool-result-display.tsx` - рендеринг AI tool результатов

**UI Primitives:**
- `ui/button.tsx`, `ui/input.tsx`, `ui/dialog.tsx` - базовые Radix компоненты
- `ui/shadcn-io/ai/` - AI-специфичные UI компоненты

### Authentication

- `auth-form.tsx` - форма входа
- `magic-link-form.tsx` - форма magic link
- `sign-out-form.tsx` - выход
- `app/(auth)/auth.ts` - NextAuth конфигурация

## Patterns & Conventions

### File Naming
- kebab-case для всех файлов (`orbit-message.tsx`, `use-orbit-zoom.ts`)
- PascalCase для React компонентов
- Хуки с префиксом `use-`
- Server actions: `actions.ts` в route директориях
- API routes: `route.ts` в API директориях

### Import Patterns
```typescript
// Порядок: external → internal → relative
import { useState } from 'react'
import { streamText } from 'ai'
import { db } from '@/lib/db'
import { OrbitMessage } from './orbit-message'
```

### React Patterns
- Server Components по умолчанию
- `"use client"` только при необходимости (hooks, events, browser APIs)
- `"use server"` для server actions
- Streaming для AI ответов (streamText, streamObject)

### Database Patterns
- UUID primary keys с `defaultRandom()`
- Timestamps: `createdAt`, `updatedAt`
- JSONB для гибких данных (attachments, toolResults, permissions)
- Cascade deletes на foreign keys
- Indexes inline с table definition: `(table) => ({})`

### AI Integration
- Mention parser для `@avrora`, `@kristina` detection
- Streaming responses через AI SDK
- Tool definitions в `lib/ai/tools/`
- Prompts централизованы в `lib/ai/prompts/`
- Multi-provider support через AI SDK

## Common Commands

```bash
# Development
pnpm dev              # Next.js dev server (Turbo)
pnpm dev:ws           # WebSocket server (отдельный терминал)

# Database
pnpm db:generate      # Generate Drizzle migrations
pnpm db:migrate       # Run migrations
pnpm db:studio        # Drizzle Studio GUI
pnpm db:push          # Push schema без migrations

# Build & Deploy
pnpm build            # Production build (runs migrations)
pnpm start            # Production server

# Code Quality
pnpm lint             # Ultracite check
pnpm format           # Auto-fix formatting

# Testing
pnpm test             # Playwright tests

# Tools
pnpm mcp              # MCP CLI tool
pnpm shadcn:update    # Update shadcn components
```

## Key Implementation Details

### Sfera API
- **POST /api/sfera** - создание Sfera с участниками
- **GET /api/sfera/[id]** - детали Sfera с messages/members
- **POST /api/sfera/[id]/messages** - создание сообщения с AI detection
- **POST /api/sfera/[id]/fork** - форк Sfera от сообщения
- **POST /api/sfera/[id]/members** - добавление участников

### AI Agent Flow
1. Detect mentions в сообщении (`@avrora`)
2. Create empty message с `isGenerating: true`
3. Check rate limits
4. Auto-add agent as member если нужно
5. Start async streaming response
6. Update message с AI content

### Migration Workflow
1. Edit `lib/db/schema.ts`
2. Run `pnpm db:generate` → creates SQL в `lib/db/migrations/`
3. Run `pnpm db:migrate` → applies migration
4. Verify в `pnpm db:studio`

### Idempotency Pattern
- Client sends `X-Idempotency-Key` header
- Server checks `IdempotencyLog` table
- If exists → return existing message
- If new → create message, log key (24h TTL)
- Prevents duplicate messages from retries

## Security Practices
- Validate inputs с Zod
- Check authentication в server actions/API routes
- NextAuth session management
- Rate limiting на public endpoints (Redis)
- Sanitize user-generated content

## Performance Considerations
- React Server Components для data fetching
- Loading states и skeletons
- Next.js Image optimization
- SWR для client-side caching
- Rate limiting на API routes

---

*This guide is a living document. Update it as the project evolves.*
