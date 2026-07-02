# CLAUDE.md

<!-- BEGIN:nextjs-agent-rules -->

# Next.js: ALWAYS read docs before coding

Before any Next.js work, find and read the relevant doc in `node_modules/next/dist/docs/`. Your training data is outdated — the docs are the source of truth.

<!-- END:nextjs-agent-rules -->


This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
pnpm install              # pnpm 9.12.3 (required — not npm/yarn)
pnpm dev                  # next dev --turbo (port 3000)
pnpm dev:ws               # WebSocket server (required for real-time features)
pnpm start                # next start (production server)
pnpm build                # runs drizzle migration THEN next build
pnpm lint                 # ultracite check (Biome-based)
pnpm format               # ultracite fix
pnpm test:unit            # vitest --run
pnpm test:unit:watch      # vitest in watch mode
pnpm test                 # Playwright E2E (sets PLAYWRIGHT=True, starts dev server)
pnpm db:generate          # create migration from schema changes
pnpm db:migrate           # apply migrations (reads POSTGRES_URL from .env.local)
pnpm db:push              # push schema directly (dev only)
pnpm db:pull              # pull schema from database
pnpm db:check             # check schema for consistency
pnpm db:up                # up migrations
pnpm db:studio            # Drizzle Studio GUI
pnpm shadcn:update        # regenerate shadcn/ui components (scripts/update-shadcn.sh)
pnpm mcp                  # run the Avrora MCP CLI (scripts/mcp-cli.js)
```

**Validation order:** `pnpm lint && pnpm test:unit && pnpm build`

No CI pipeline exists — no `.github/` directory.

## Architecture

**Avrora Area** is an AI collaboration platform (Next.js 15 canary, React 19 RC, App Router, PPR enabled).

### Route groups

- `app/(auth)/` — login, registration, magic-link auth (NextAuth v5 beta)
- `app/(chat)/` — personal/group chat with AI agents
- `app/(orbit)/` — visual message trajectory canvas (Orbit UI)
- `app/(sfera)/` — collaborative discussion spaces (Sfera)
- `app/v2/` — **new code goes here** (see Legacy constraint below)
- `app/api/` — REST + MCP endpoints

### AI system

- All LLM calls route through MegaLLM proxy (`MEGALLM_API_KEY` + `OPENAI_URL`) using OpenAI-compatible SDK
- Model aliases defined in `lib/ai/providers.ts` (chat-model, chat-model-reasoning, poetic, etc.)
- Agent instances (Avrora, Kristina) in `lib/ai/agents/instances/`
- Agent registry + detection: `lib/ai/agents/registry.ts`, `detector.ts`
- Entitlements (guest vs regular): `lib/ai/entitlements.ts`
- Usage tracking: `AiUsageLog` table, $10/day budget cap
- Prompts split by concern: `lib/ai/prompts/{core,artifacts,sfera,tools}.ts` (plus `index.ts` barrel). A legacy `lib/ai/prompts.ts` also exists on the level above.

### Sfera (collaboration spaces)

DB tables: `Sfera`, `SferaMember`, `SferaMessage`, `SferaForkedSfera`, `SferaArtifact`. API under `app/api/sfera/`. Supports forking, @-mentioning agents, idempotent message sends (`idempotencyKey`).

### MCP API

JSON-RPC 2.0 at `POST /api/mcp`. Bearer token auth (prefix `avr_live_`/`avr_test_`). Rate-limited via Redis. Implementation: `lib/mcp/`.

### Artifacts

Generated content types: text, code, image, sheet, chart, game, mini-app. Each has `client.tsx` (render) and optionally `server.ts` (generation). Located in `artifacts/`.

### Database

PostgreSQL + Drizzle ORM. Schema: `lib/db/schema.ts`. Migrations: `lib/db/migrations/`. Config reads `.env.local`.

### Other `lib/` directories

- `lib/ai/` — providers, models, agents, prompts, tools, entitlements, usage-logger
- `lib/api/` — REST helpers (pagination, validation, rate-limit middleware)
- `lib/auth/` — API key management (`api-keys.ts`)
- `lib/blob/` — media storage (`media-storage.ts`, Vercel Blob)
- `lib/claude-code/` — Claude Code integration logger
- `lib/constants/` — system users and app constants
- `lib/editor/` — ProseMirror rich-text editor config/renderers
- `lib/mentions/` — @-mention intent detection, parser, processor
- `lib/mcp/` — MCP JSON-RPC server (auth, resources, tools, rate-limit, logger)
- `lib/redis/` — Redis client + rate limiter
- `lib/services/` — agent registry, idempotency, message service
- `lib/websocket/` — WS server, manager, client hook

### WebSocket

Standalone server at `lib/websocket/server.ts` — must run separately (`pnpm dev:ws`).

### Deployment

PM2 via `deploy/ecosystem.config.json` (single fork, 1GB max, reads `.env.local`). Nginx config at `deploy/nginx-avrora.click.conf`.

## Conventions

- `@/*` path alias resolves to project root
- `components/ui/` are shadcn/ui — do NOT edit manually; use `pnpm shadcn:update`
- `lib/utils.ts` and `hooks/use-mobile.ts` excluded from lint — do not modify
- Property-based testing with fast-check + vitest (see `lib/api/validation.test.ts`)
- Guest users: email matches `/^guest-\d+$/`, limited to 20 msgs/day, 2 models
- Philosophy: function over class, composition over inheritance

## Legacy code constraint

All pages/components under `app/(auth)/`, `app/(chat)/`, `app/(orbit)/`, `app/(sfera)/` are **LEGACY**. New code MUST go in `app/v2/`. Do not extend legacy route groups or their components.

> Note: `app/v2/` currently exists but is empty — no code has been migrated there yet. The directive still applies for all new work.

## Lint rules (Biome via Ultracite)

- `useExhaustiveDependencies`: error
- `noExplicitAny`: off (needs work)
- `noConsole`: off
- Excludes: `components/ui/`, `lib/utils.ts`, `hooks/use-mobile.ts`

## Key env vars

Copy `.env.example` → `.env.local`. Required: `POSTGRES_URL`, `AUTH_SECRET`, `MEGALLM_API_KEY`, `OPENAI_URL` (MegaLLM proxy base URL, used in `lib/ai/providers.ts`). See `.env.example` for the full list.

## Project Architecture

### Router type

App Router only. No `pages/` directory. PPR (`experimental.ppr`) is enabled.

### Pages

| Route | File | Notes |
|---|---|---|
| `/login` | `app/(auth)/login/page.tsx` | Magic link + code entry |
| `/` | `app/page.tsx` | Root redirect |
| `/settings/api-keys` | `app/(chat)/settings/api-keys/page.tsx` | Manage MCP API keys |
| `/home` | `app/(orbit)/home/page.tsx` | Orbit home |
| `/orbits` | `app/(orbit)/orbits/page.tsx` | Orbits list |
| `/orbits/new` | `app/(orbit)/orbits/new/page.tsx` | Create orbit |
| `/orbits/new_home` | `app/(orbit)/orbits/new_home/page.tsx` | New orbit home |
| `/orbit/[id]` | `app/(orbit)/orbit/[id]/page.tsx` | Orbit canvas |
| `/orbit/[id]/test-chat` | `app/(orbit)/orbit/[id]/test-chat/page.tsx` | Test chat in orbit |
| `/m/[uuid]` | `app/(orbit)/m/[uuid]/page.tsx` | Public message view (intended no-auth; see middleware note) |
| `/sfera/[id]/chat` | `app/(sfera)/sfera/[id]/chat/page.tsx` | Sfera chat |
| `/docs` | `app/docs/page.tsx` | Scalar API reference (public) |
| `/test-artifact` | `app/test-artifact/page.tsx` | Artifact sandbox |

### API routes

| Method | Path | Purpose |
|---|---|---|
| `GET/POST` | `/api/auth/[...nextauth]` | NextAuth.js handlers |
| `POST` | `/api/auth/verify-magic-token` | Verify magic link JWT token |
| `POST` | `/api/auth/verify-code-direct` | Verify 8-digit numeric code |
| `GET` | `/api/docs` | OpenAPI spec (served to Scalar) |
| `POST` | `/api/files/upload` | Upload file to Vercel Blob |
| `GET/POST/DELETE` | `/api/keys` | List/create/revoke MCP API keys |
| `DELETE` | `/api/keys/[id]` | Delete specific API key |
| `POST/OPTIONS` | `/api/mcp` | MCP JSON-RPC 2.0 endpoint (Bearer auth) |
| `GET/POST` | `/api/sfera` | List user's Sferas / create Sfera |
| `GET/PUT/DELETE` | `/api/sfera/[id]` | Get/update/delete Sfera |
| `POST` | `/api/sfera/[id]/chat` | Streaming AI chat (Vercel AI SDK) |
| `POST` | `/api/sfera/[id]/fork` | Fork Sfera from a message |
| `POST/DELETE` | `/api/sfera/[id]/members` | Add/remove Sfera members |
| `POST` | `/api/sfera/[id]/messages` | Send message to Sfera |
| `PATCH/DELETE` | `/api/sfera/[id]/messages/[messageId]` | Edit/delete message |
| `GET/PATCH` | `/api/sfera/message/[messageId]` | Get/update message (cross-Sfera) |
| — | `/api/sfera/[id]/claude-code/` | Directory exists but is empty (stub, no route handler) |

### Component tree (key)

```
app/layout.tsx                    — SessionProvider + Toaster (root)
├── components/app-sidebar.tsx    — Nav sidebar
│   ├── sidebar-history.tsx       — Chat history list
│   ├── sidebar-history-item.tsx
│   └── sidebar-user-nav.tsx      — User menu + sign out
│
├── components/artifact.tsx       — Artifact panel wrapper
│   └── artifacts/*/client.tsx    — text, code, image, sheet, chart, game, mini-app
│
├── components/elements/          — shadcn/ai primitives
│   ├── message.tsx / response.tsx / prompt-input.tsx
│   ├── reasoning.tsx             — Chain-of-thought display
│   ├── tool.tsx                  — Tool call display
│   ├── code-block.tsx, inline-citation.tsx, source.tsx
│   ├── actions.tsx, branch.tsx, context.tsx, conversation.tsx
│   ├── image.tsx, loader.tsx, suggestion.tsx, task.tsx, web-preview.tsx
│
├── components/sfera/             — Sfera-specific UI
│   ├── sfera-chat-client.tsx     — Main Sfera chat wrapper
│   ├── sfera-group-chat.tsx      — Group message list
│   ├── sfera-message.tsx         — Single Sfera message
│   ├── sfera-prompt-input.tsx    — Input with @mention support
│   └── sfera-mention-button.tsx
│
└── components/orbit/             — Orbit canvas UI
    ├── orbit-container.tsx       — Canvas host
    ├── orbit-network.tsx         — D3-style node graph
    ├── orbit-chat.tsx            — Inline chat in orbit
    ├── orbit-constellation-view.tsx, orbit-list-view.tsx
    ├── orbit-message.tsx, orbit-input.tsx, orbit-settings.tsx
    ├── orbit-toolbar.tsx, orbit-zoom-controls.tsx, orbit-page-header.tsx
    ├── orbit-error-state.tsx, orbit-skeleton.tsx
    ├── parent-message-indicators.tsx, tool-result-display.tsx, tool-result-types.ts
    ├── chart-artifact.tsx, mini-app-artifact.tsx
    └── new-home/
```

`components/ui/` — shadcn/ui primitives (Radix-based). Do not edit directly.  
`components/ui/shadcn-io/ai/` — shadcn/ui AI chat components (also do not edit).  
`components/elements/` — thin wrappers over `components/ui/shadcn-io/ai/` with project-specific bindings.

### Data flow

```
Browser
  │
  ├─ SWR (client fetching) → REST API routes → Drizzle ORM → PostgreSQL
  │
  ├─ useChat / AI SDK streaming → POST /api/sfera/[id]/chat
  │     └─ detectMentionedAgents() → streamAgentResponse()
  │           └─ myProvider (customProvider) → MegaLLM proxy (OpenAI-compat)
  │                 ├─ chat-model / chat-model-reasoning  (OpenAI-OSS models)
  │                 └─ poetic / poetic-reasoning          (Claude via proxy)
  │
  ├─ AI tools (called by agent during streaming):
  │     ├─ generateImage / generateImageReplicate → Google Imagen / Replicate FLUX
  │     ├─ generateMusic / generateVideo          → Replicate
  │     ├─ speechToText                           → external Python service
  │     ├─ webSearch                              → Tavily API
  │     └─ createMiniApp / createChart / createGame → LLM tokens only
  │
  ├─ File uploads → POST /api/files/upload → Vercel Blob
  │
  ├─ MCP clients (Claude Code, external) → POST /api/mcp (JSON-RPC 2.0)
  │     └─ Bearer token auth → Redis rate-limit → resources/tools handlers
  │
  └─ WebSocket (port 3001, pnpm dev:ws) → lib/websocket/server.ts
        └─ Redis pub/sub for real-time message delivery
```

All usage (tokens, tool costs) is written to `AiUsageLog` after each AI call. Daily budget cap is $10/day enforced in `lib/ai/usage-logger.ts`.

### Auth flow

1. User submits email → `createMagicLink` server action → generates 8-digit numeric code → stores in `MagicToken` table (15 min TTL) → returns magic link URL
2. In dev: token printed to console. In prod: link would be emailed (email sending not yet implemented — link returned directly)
3. Two verification paths:
   - **Link click**: `/login?magic_token=XXX` → NextAuth Credentials provider validates token, marks `used=true`, finds/creates user → JWT cookie
   - **Code entry**: `POST /api/auth/verify-code-direct` → same DB check → then `signIn("credentials", { token })`
4. **Guest access**: `signIn("guest")` creates a row in `User` with email `guest-<timestamp>`, no password
5. JWT stored in cookie (`secureCookie: shouldUseSecureCookies`). Session exposes `user.id` and `user.type` (`"guest" | "regular"`)
6. Middleware (`middleware.ts`) runs on all routes. It short-circuits with `NextResponse.next()` for public paths (`/ping`, `/docs`, `/api/docs`, `/api/mcp`, `/api/auth/**`, `/orbit/message/**`) and for `/login` + `/register`. For all other paths it still resolves `next()` after reading the JWT — it does **not** block unauthenticated requests (no real route protection). The only enforced redirect: authenticated non-guest users hitting `/login` or `/register` are sent to `/`. ⚠️ The whitelist entry `/orbit/message/**` is stale — the actual public message page is `/m/[uuid]`, which is **not** whitelisted and therefore currently requires auth.
7. Rate limiting for magic link requests: 3 attempts per 15 min per email (in-memory via `lib/rate-limit.ts`)
8. `/register` is referenced in middleware but no `app/(auth)/register/` page exists (dead reference).

### DB schema (tables)

Core: `User`, `Chat`, `Message_v2`, `Document`, `Suggestion`, `Stream`, `ChatMember`, `MagicToken`, `MessageMention`

Sfera: `Sfera`, `SferaMember`, `SferaMessage`, `SferaForkedSfera`, `SferaArtifact`, `ToolExecution`

Platform: `AiUsageLog`, `ApiKey`, `AgentRegistry`, `IdempotencyLog`, `McpAuditLog`

### Key dependencies and their role

| Package | Role |
|---|---|
| `next` 15 canary | Framework — App Router, RSC, PPR, Server Actions |
| `ai` v5 (Vercel AI SDK) | Streaming text, `useChat`, tool-call protocol, `customProvider` |
| `next-auth` v5 beta | Session management, JWT cookies, Credentials provider |
| `drizzle-orm` | Type-safe SQL queries and migrations |
| `@ai-sdk/openai` | OpenAI-compatible adapter (used for MegaLLM proxy AND Claude proxy) |
| `@ai-sdk/anthropic` / `@ai-sdk/google` / `@ai-sdk/xai` | Direct Anthropic, Gemini (Imagen), xAI adapters |
| `@ai-sdk/gateway` | Vercel AI Gateway adapter |
| `@modelcontextprotocol/sdk` | MCP server primitives |
| `prosemirror-*` | Rich text editor (ProseMirror) for document artifacts |
| `codemirror` v6 | Code editor for code artifacts |
| `recharts` | Charts in chart artifacts |
| `react-data-grid` | Spreadsheet in sheet artifacts |
| `framer-motion` | UI animations |
| `swr` | Client-side data fetching with cache invalidation |
| `redis` | Rate limiting for Avrora AI calls |
| `@vercel/blob` | File and image upload storage |
| `@vercel/otel` | OpenTelemetry tracing (service name: `ai-chatbot`) |
| `ultracite` + `@biomejs/biome` | Lint + format (Biome-based, extended by Ultracite) |
| `vitest` + `fast-check` | Unit + property-based tests |
| `playwright` | E2E browser tests |
