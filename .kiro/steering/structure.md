---
inclusion: always
---

# Project Structure

## Directory Organization

```
avrora-area/
├── app/                    # Next.js App Router (routes & pages)
├── components/             # React components
├── lib/                    # Core business logic & utilities
├── hooks/                  # React hooks
├── artifacts/              # Artifact type implementations
├── docs/                   # Documentation
├── scripts/                # Utility scripts
└── public/                 # Static assets
```

## App Router Structure

**app/(auth)/** - Authentication routes and logic
- `login/` - Login page
- `auth.ts` - NextAuth configuration
- `actions.ts` - Server actions for auth

**app/(chat)/** - Personal and group chat interface
- `settings/api-keys/` - API key management UI

**app/(orbit)/** - Orbit UI for Sfera visualization
- `home/` - Home dashboard
- `orbit/[id]/` - Individual Sfera view
- `orbits/` - Sfera list and creation
- `m/[uuid]/` - Message-specific views
- `layout.tsx` - Orbit-specific layout

**app/api/** - API endpoints
- `auth/` - Authentication endpoints
- `sfera/` - Sfera CRUD and message operations
- `keys/` - API key management
- `mcp/` - Model Context Protocol endpoints
- `files/upload/` - File upload handling
- `docs/` - API documentation (Scalar)

## Components Organization

**components/ui/** - Base UI primitives (Radix-based)
- Buttons, inputs, dialogs, dropdowns, etc.
- `shadcn-io/ai/` - AI-specific UI components from shadcn

**components/orbit/** - Orbit-specific components
- `orbit-message.tsx` - Message display in Orbit
- `orbit-network.tsx` - Network visualization
- `orbit-chat.tsx` - Chat interface
- `parent-message-indicators.tsx` - Threading indicators
- `tool-result-display.tsx` - AI tool result rendering

**components/elements/** - Reusable chat/message elements
- `message.tsx`, `response.tsx`, `conversation.tsx`
- `code-block.tsx`, `image.tsx`, `tool.tsx`
- `reasoning.tsx` - AI reasoning display

**components/** (root) - Feature components
- `artifact.tsx` - Artifact container
- `auth-form.tsx` - Authentication forms
- `chat-header.tsx` - Chat UI header
- `*-editor.tsx` - Various editors (code, text, image, sheet)

## Library Structure

**lib/ai/** - AI integration core
- `agents/` - AI agent implementations (Avrora, Kristina)
- `prompts/` - System prompts (core, artifacts, tools, sfera)
- `tools/` - AI tool implementations
  - `generative/` - Image, music, video, speech generation
  - `mini-apps/` - Chart, game, mini-app creation
  - `analytics/` - Discussion summarization
  - `integrations/` - Web search, external APIs
- `models.ts` - Model definitions
- `providers.ts` - AI provider configuration
- `sfera-avrora.ts` - Avrora AI for Sfera
- `sfera-tools.ts` - Sfera-specific tools

**lib/db/** - Database layer
- `schema.ts` - Drizzle ORM schema (all tables)
- `queries.ts` - Database queries
- `migrations/` - SQL migrations
- `migrate.ts` - Migration runner

**lib/mcp/** - Model Context Protocol
- `auth.ts` - MCP authentication
- `tools.ts` - MCP tool definitions
- `resources.ts` - MCP resource handlers
- `rate-limit.ts` - Rate limiting

**lib/mentions/** - Mention system (@user, @avrora)
- `parser.ts` - Parse mentions from text
- `process.ts` - Process mention logic
- `intent-detection.ts` - Detect AI invocation intent

**lib/websocket/** - WebSocket server
- `server.ts` - WebSocket server implementation
- `manager.ts` - Connection management
- `use-websocket.ts` - Client hook

**lib/** (other)
- `auth/` - API key utilities
- `blob/` - Media storage helpers
- `redis/` - Redis client and rate limiter
- `editor/` - Editor utilities (diff, suggestions)
- `constants.ts` - App-wide constants
- `types.ts` - Shared TypeScript types
- `utils.ts` - General utilities

## Artifacts Structure

Each artifact type has its own directory:
- `artifacts/text/` - Text documents
- `artifacts/code/` - Code snippets
- `artifacts/image/` - Image generation
- `artifacts/sheet/` - Spreadsheets
- `artifacts/mini-app/` - Interactive mini-apps
- `artifacts/chart/` - Data visualizations
- `artifacts/game/` - Simple games

Each contains `client.tsx` (React component) and optionally `server.ts` (server actions).

## Naming Conventions

- **Files**: kebab-case for all files (`orbit-message.tsx`, `use-orbit-zoom.ts`)
- **Components**: PascalCase for React components
- **Hooks**: Prefix with `use-` (`useOrbit`, `useMessages`)
- **Server Actions**: `actions.ts` in route directories
- **API Routes**: `route.ts` in API directories
- **Types**: Inferred from Drizzle schema or defined in `types.ts`

## Import Patterns

- Use `@/*` path alias for imports from root
- Server-only code: Import from `server-only` package
- Client components: Use `"use client"` directive
- Prefer named exports over default exports
- Group imports: external → internal → relative

## Database Schema Patterns

- All tables use UUID primary keys with `defaultRandom()`
- Timestamps: `createdAt`, `updatedAt` (where applicable)
- Foreign keys with cascade deletes where appropriate
- JSONB for flexible data (attachments, tool results, permissions)
- Enums via varchar with enum constraint
- Composite primary keys for junction tables
