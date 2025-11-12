# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Avrora-Area** is a Next.js 15 AI chatbot platform featuring collaborative discussion spaces (Sferas) with an AI assistant named "Avrora". The platform combines traditional chat functionality with a unique "Orbit" visualization system for exploring conversations spatially.

### Core Technologies
- **Framework**: Next.js 15 (App Router with PPR enabled)
- **AI SDK**: Vercel AI SDK 5.0 with multiple provider support
- **Database**: PostgreSQL with Drizzle ORM
- **WebSocket**: Standalone WS server for real-time communication
- **Auth**: NextAuth v5
- **UI**: React 19, Tailwind CSS 4, Radix UI components

## Development Commands

### Essential Commands
```bash
# Development (requires 2 terminals)
pnpm run dev           # Next.js dev server (http://localhost:3000)
pnpm run dev:ws        # WebSocket server (ws://localhost:3001)

# Build & Production
pnpm run build         # Runs db:migrate then next build
pnpm start            # Production server

# Code Quality
pnpm run lint         # Run Ultracite linter (Biome-based)
pnpm run format       # Auto-fix formatting issues

# Database
pnpm run db:generate  # Generate migration from schema changes
pnpm run db:migrate   # Apply migrations
pnpm run db:studio    # Open Drizzle Studio (http://localhost:4983)
pnpm run db:push      # Push schema directly (dev only)

# Testing
pnpm run test         # Run Playwright tests
```

### Development Workflow
1. Always run **both** `pnpm run dev` and `pnpm run dev:ws` for full functionality
2. The WebSocket server is essential for real-time features in Sferas/Orbits
3. Use `db:generate` → `db:migrate` workflow for schema changes (never `db:push` in production)

## Architecture Overview

### 1. **Sfera System** (Collaborative Discussion Spaces)

**Core Concept**: Sferas are collaborative discussion spaces where users and Avrora AI interact.

**Database Schema** (`lib/db/schema.ts`):
- `sfera` - Discussion space metadata (title, description, owner, visibility)
- `sferaMember` - Member roles (owner/admin/member/viewer)
- `sferaMessage` - Messages with AI tool results and threading support

**Key Features**:
- **AI Integration**: Mention `@avrora` to trigger AI responses
- **Tool Execution**: AI can automatically invoke tools (image generation, web search, etc.)
- **Smart Context**: Uses token budgeting to prioritize recent messages and @avrora mentions
- **Fork Support**: Messages can be forked (tracked via `isForked`/`forkCount`)

**Critical Files**:
- `lib/ai/sfera-avrora.ts` - Main AI response generator
  - `generateAvroraResponse()` - Core function (handles context, tools, responses)
  - `selectSmartContext()` - Reduces ~7000 to ~2000 tokens intelligently
  - `AVRORA_USER_ID` - Fixed UUID: `00000000-0000-0000-0000-000000000001`

- `lib/ai/sfera-tools.ts` - Tool registry
  - Categories: Generative, Analytics, Integrations, Mini-Apps
  - Tools auto-mapped to AI SDK format in `sfera-avrora.ts:218-273`

**API Routes** (`app/api/sfera/`):
- `POST /api/sfera` - Create Sfera
- `GET /api/sfera/[id]` - Get Sfera details
- `POST /api/sfera/[id]/fork` - Fork a Sfera
- `GET /api/sfera/[id]/messages` - Get messages
- `POST /api/sfera/[id]/messages` - Send message (triggers @avrora if mentioned)
- `GET /api/sfera/[id]/members` - Get members
- `POST /api/sfera/[id]/members` - Add member

### 2. **Orbit Visualization System**

**Core Concept**: Visual, spatial representation of conversations where messages are nodes in 3D/2D space.

**Components** (`components/orbit/`):
- `orbit-chat.tsx` - Main container (15KB+, handles canvas/chat split)
- `orbit-message.tsx` - Individual message nodes with positioning
- `orbit-input.tsx` - Message input with @mention support (23KB+)
- `tool-result-display.tsx` - Renders AI tool outputs (images, charts, mini-apps)

**Hooks** (`hooks/`):
- `use-orbit-canvas.ts` - Canvas rendering logic
- `use-orbit-interactions.ts` - Drag, zoom, selection
- `use-orbit-layout.ts` - Node positioning algorithms
- `use-orbit-zoom.ts` - Zoom controls

**Routes**:
- `/orbit/[id]` - Orbit view for a chat
- `/orbit/message/[messageId]` - Public message view (no auth required)
- `/orbits` - List all orbits

### 3. **AI Provider Architecture**

**Provider Setup** (`lib/ai/providers.ts`):
- Uses **OpenAI-compatible API** via `MEGALLM_API_KEY` for both OpenAI and Claude models
- Base URL: `process.env.OPENAI_URL`
- Models configured as centralized constants:
  - `chat-model` → `gpt-5-mini` (main model with tools)
  - `chat-model-mini` → `gpt-4o-mini`
  - `poetic` → `claude-sonnet-4-5-20250929`

**Important**: Provider uses custom `myProvider` from AI SDK's `customProvider()` API.

**Model Selection**:
- Sfera AI always uses `chat-model` (full model with tools)
- Title generation: `title-model`
- Artifacts: `artifact-model`
- Reasoning models available with `extractReasoningMiddleware`

### 4. **WebSocket Real-time System**

**Server**: `lib/websocket/server.ts`
- Standalone server on port 3001 (configurable via `WS_PORT`)
- Token-based auth (dev mode: `dev_{userId}`)
- Connection format: `ws://localhost:3001?chatId={id}&token={token}`

**Manager**: `lib/websocket/manager.ts`
- `wsManager` singleton for broadcast/connection management
- Handles typing indicators, message delivery, presence

**Client Integration**:
- Components connect via WebSocket for real-time updates
- Used in both traditional chats and Orbit views

### 5. **Database Schema Patterns**

**Key Tables**:
- `User` - Basic user info (id, email, password)
- `Chat` - Personal/group chats (has `chatType`, `lastContext`)
- `Message_v2` - New message format with parts/attachments
- `ChatMember` - Group chat membership
- `Document` - Artifacts (text/code/image/sheet/mini-app/chart/game)
- `Sfera*` tables - Collaborative discussion spaces

**Important Notes**:
- `Message` table is **DEPRECATED** (use `Message_v2`)
- All Sfera tables use cascade deletion
- UUIDs used for all primary keys
- Timestamps: `createdAt`, `updatedAt` pattern

**Migration Workflow**:
1. Edit `lib/db/schema.ts`
2. Run `pnpm run db:generate` (creates migration in `lib/db/migrations/`)
3. Run `pnpm run db:migrate` (applies migration)
4. Migrations auto-run during `pnpm run build`

## AI Tools System

### Tool Categories
1. **Generative**: `generateImage`, `generateImageReplicate`, `generateMusic`, `generateVideo`, `speechToText`
2. **Analytics**: `summarizeDiscussion`
3. **Integrations**: `webSearch` (Tavily API)
4. **Mini-Apps**: `createMiniApp`, `editMiniApp`, `createChart`, `createGame`

### Tool Execution Flow
1. User mentions `@avrora` in Sfera message
2. `generateAvroraResponse()` called with trigger message
3. AI SDK automatically decides which tools to use (no pattern matching)
4. Tool results stored in `sferaMessage.toolResults` JSON array
5. Frontend renders tool results via `tool-result-display.tsx`

### Adding New Tools
- Create tool in `lib/ai/tools/{category}/`
- Export from appropriate category file
- Add to `getSferaTools()` in `lib/ai/sfera-tools.ts`
- Tool name mapping happens automatically in `sfera-avrora.ts:218-273`

## Authentication & Authorization

**Auth Provider**: NextAuth v5
- Config: `app/(auth)/auth.config.ts` and `app/(auth)/auth.ts`
- Middleware: `middleware.ts` (handles route protection)

**Public Routes** (no auth):
- `/api/auth/*`
- `/docs`, `/api/docs` (API documentation)
- `/orbit/message/{id}` (public message view)
- `/ping` (health check for Playwright)

**Magic Link Support**: Uses `magicToken` table for passwordless login

## Environment Variables

### Required
```bash
AUTH_SECRET=***                    # NextAuth secret
POSTGRES_URL=***                   # PostgreSQL connection
MEGALLM_API_KEY=***               # Main AI provider key
OPENAI_URL=***                    # Base URL for OpenAI-compatible API
```

### Optional (AI Tools)
```bash
GOOGLE_GENERATIVE_AI_API_KEY=***  # Gemini/Imagen
TAVILY_API_KEY=***                # Web search
REPLICATE_API_KEY=***             # Music/video generation
SPEECH_TO_TEXT_API_URL=***        # Transcription service
REDIS_URL=***                     # Rate limiting
BLOB_READ_WRITE_TOKEN=***         # Vercel Blob storage
AI_GATEWAY_API_KEY=***            # Vercel AI Gateway
```

### WebSocket
```bash
WS_PORT=3001                       # WebSocket server port (default: 3001)
```

## Code Patterns & Conventions

### Linting
- Uses **Ultracite** (wrapper around Biome)
- Config: `biome.jsonc`
- Automatically formats on `pnpm run format`
- Ignore inline issues: `// biome-ignore lint: Reason`

### File Organization
- **Route groups**: `app/(auth)`, `app/(chat)`, `app/(orbit)`
- **Server actions**: Named `actions.ts` in route folders
- **API routes**: Follow Next.js App Router conventions (`route.ts`)
- **Components**: Organized by feature (`components/orbit/`, `components/chat/`)

### TypeScript
- Strict mode enabled
- Database types auto-generated via Drizzle: `InferSelectModel<typeof table>`
- Avoid `any` except for tool results (DB compatibility)

### React Server Components
- Use `"use client"` only when necessary (interactivity, hooks, browser APIs)
- Prefer server components for data fetching
- `server-only` package enforces server-side code boundaries

## Testing

**Framework**: Playwright
- Config: `playwright.config.ts`
- Tests require `PLAYWRIGHT=True` env var
- Run: `pnpm run test`

**Health Check**: `/ping` endpoint for test readiness

## API Documentation

**Scalar API Reference**: Available at `/docs`
- Config: `app/docs/page.tsx` uses `@scalar/nextjs-api-reference`
- Auto-generates docs from OpenAPI spec

## Common Gotchas

1. **Always run WebSocket server**: Many features silently fail without `pnpm run dev:ws`
2. **Avrora user ID**: Hardcoded as `00000000-0000-0000-0000-000000000001` - never change
3. **Tool name mapping**: Tools are auto-mapped by description in `sfera-avrora.ts` - update mapping when adding tools
4. **Message schema**: Use `Message_v2`, not deprecated `Message` table
5. **Token budget**: Smart context selection targets ~2000 tokens - don't increase without testing
6. **Provider config**: All models route through single `MEGALLM_API_KEY` - not separate OpenAI/Anthropic keys
7. **Middleware auth**: Remember to add new public routes to `middleware.ts` allowlist

## Project-Specific Terminology

- **Sfera** (Russian: sphere) - Collaborative discussion space
- **Orbit** - Visual/spatial chat representation
- **Avrora** - AI assistant name (Russian: aurora)
- **Fork** - Create child discussion from message/Sfera
- **Tool Results** - AI-generated content (images, charts, etc.) embedded in messages
- **Mini-App** - Interactive React component generated by AI
