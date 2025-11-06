# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Avrora is a Next.js 15+ AI-powered chat application with collaborative features. It extends the base Chat SDK template with advanced group chat functionality, area-based collaboration spaces, and a custom AI integration using MegaLLM API.

## Key Technologies

- **Framework**: Next.js 15.3.0-canary with App Router and React 19 RC
- **Database**: PostgreSQL with Drizzle ORM
- **AI Provider**: Custom MegaLLM API (gpt-5 models) via modified OpenAI SDK
- **Authentication**: Auth.js (NextAuth 5.0 beta)
- **UI Components**: shadcn/ui with Radix UI primitives
- **Styling**: Tailwind CSS v4
- **Real-time**: WebSocket server support (lib/websocket/)
- **File Storage**: Vercel Blob
- **Testing**: Playwright

## Development Commands

```bash
# Install dependencies
pnpm install

# Run development server
pnpm dev                # Next.js dev server with Turbo
pnpm dev:ws            # WebSocket server (separate process)

# Database operations
pnpm db:migrate        # Apply database migrations
pnpm db:generate       # Generate migration files from schema changes
pnpm db:studio         # Open Drizzle Studio for database inspection
pnpm db:push          # Push schema changes directly (dev only)

# Build and production
pnpm build            # Runs migration then builds Next.js
pnpm start            # Start production server

# Code quality
pnpm lint             # Run ultracite linter
pnpm format           # Auto-fix formatting issues

# Testing
pnpm test             # Run Playwright tests
```

## Architecture Overview

### AI Integration
The application uses a custom MegaLLM API integration instead of standard providers:
- **Provider Configuration**: `lib/ai/providers.ts` - Configured to use MegaLLM endpoint (https://ai.megallm.io/v1)
- **Models**: "gpt-5" for chat, "gpt-5-mini" for reasoning/titles
- **Image Support**: Custom implementation in `lib/ai/megallm-direct.ts` for handling multimodal inputs
- **Streaming**: Custom parser in `lib/ai/megallm-stream-parser.ts`

### Database Schema (Drizzle ORM)
Located in `lib/db/schema.ts`:

**Core Tables**:
- `User`: Authentication and user profiles
- `Chat`: Individual and group chat sessions (with `chatType` field)
- `Message_v2`: Chat messages with author tracking for groups
- `Area`: Collaborative spaces with fork/merge support
- `Document`: Shared documents within areas

**Collaboration Tables**:
- `AreaMember`: Membership and roles in areas
- `ChatMember`: Participants in group chats
- `AreaDocument`: Documents associated with areas
- `AreaMergeProposal`: Fork/merge workflow support
- `MessageMention`: @mentions tracking (including @avrora)

### Routing Structure

**Area Routes** (`app/(area)/`):
- `/areas` - List all areas
- `/area/[id]` - Individual area view
- `/area/[id]/chat/[chatId]` - Chat within an area

**Chat Routes** (`app/(chat)/`):
- `/chat/[id]` - Individual chat view
- API: `/api/chat` - Main chat endpoint with group chat logic

**API Routes**:
- `/api/areas/*` - Area management APIs
- `/api/ws` - WebSocket connection endpoint
- `/api/auth/*` - Authentication endpoints

### Group Chat Features

The application implements sophisticated group chat logic:
1. **@Avrora Mentions**: AI only responds when mentioned in group chats
2. **Context Limiting**: Uses last 20 messages as context for group conversations
3. **Message Attribution**: Tracks `userId` for each message in groups
4. **Access Control**: Group chats are open to all members, personal chats are private

### Environment Configuration

Required environment variables (see `.env.example`):
```bash
AUTH_SECRET           # Auth.js secret
POSTGRES_URL         # PostgreSQL connection string
BLOB_READ_WRITE_TOKEN # Vercel Blob storage
REDIS_URL           # Redis for resumable streams (optional)
MEGALLM_API_KEY     # MegaLLM API key for AI models
```

## Important Implementation Details

### AI Response Flow
1. Messages are processed in `/app/(chat)/api/chat/route.ts`
2. For group chats, checks for @avrora mention before AI response
3. Images trigger custom MegaLLM handler (`callMegaLLMWithImages`)
4. Text-only uses standard AI SDK streaming

### WebSocket Support
- Server implementation in `lib/websocket/server.ts`
- Run separately with `pnpm dev:ws`
- API route at `/api/ws`

### Database Migrations
- Schema changes go in `lib/db/schema.ts`
- Generate migrations: `pnpm db:generate`
- Apply migrations: `pnpm db:migrate`
- Migrations auto-run on build

### Authentication
- Guest access supported via `/api/auth/guest`
- User types: guest, regular, pro
- Entitlements defined in `lib/ai/entitlements.ts`

### Error Handling
- Custom error class: `ChatSDKError` in `lib/errors.ts`
- Consistent error responses across API routes
- Rate limiting based on user type

## Testing Approach

- Playwright tests in repository
- Set `PLAYWRIGHT=True` environment variable when testing
- Tests can be run with `pnpm test`

## Areas of Caution

1. **React 19 RC**: Using release candidate - may have breaking changes
2. **Database Migrations**: Always backup before running migrations in production
3. **AI Gateway**: Different configuration for Vercel vs non-Vercel deployments
4. **Group Chat Context**: Limited to 20 messages to prevent token overflow
5. **Image Processing**: Custom MegaLLM implementation bypasses standard AI SDK