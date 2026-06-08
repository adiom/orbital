# Avrora Area — AGENTS.md

## Quick start

```bash
pnpm install           # pnpm 9.12.3 required (not npm/yarn)
pnpm dev               # next dev --turbo (port 3000 by default)
pnpm dev:ws            # separate WebSocket server (required for real-time features)
pnpm build             # runs drizzle migration THEN next build
```

## Commands

| Category | Command | Notes |
|---|---|---|
| Lint | `pnpm lint` | Uses `npx ultracite@latest check` (Biome + Ultracite config) |
| Format | `pnpm format` | Uses `npx ultracite@latest fix` |
| Unit test | `pnpm test:unit` | Vitest — property-based tests (fast-check) |
| Unit watch | `pnpm test:unit:watch` | |
| E2E test | `pnpm test` | Playwright — requires `PLAYWRIGHT=True` env; starts dev server automatically |
| DB migrate | `pnpm db:migrate` | Drizzle — reads `POSTGRES_URL` from `.env.local` |
| DB generate | `pnpm db:generate` | Creates migration files from schema changes |
| DB studio | `pnpm db:studio` | Drizzle Studio GUI |
| DB push | `pnpm db:push` | Push schema directly (dev only) |
| MCP CLI | `pnpm mcp` | Node.js MCP stdio client (`scripts/mcp-cli.js`) |
| shadcn update | `pnpm shadcn:update` | Bash script (`scripts/update-shadcn.sh`) |

**Order for safe changes:** `pnpm lint && pnpm test:unit && pnpm build` (no CI exists — no `.github/`).

## Architecture

- **Route groups**: `(auth)`, `(chat)`, `(orbit)`, `(sfera)` — see `app/` directory.
- **AI agents**: Avrora (`@avrora`/`@аврора`) and Kristina (`@kristina`/`@кристина`) — defined in `lib/ai/agents/instances/`.
- **AI models**: Both OpenAI and Claude chat models route through `MEGALLM_API_KEY` via MegaLLM proxy at `OPENAI_URL` (default `https://ai.megallm.io/v1`). Gemini used separately for image generation (`GOOGLE_GENERATIVE_AI_API_KEY`).
- **MCP API**: JSON-RPC 2.0 at `POST /api/mcp`, Bearer token auth (key prefix `avr_live_`/`avr_test_`).
- **WebSocket**: Standalone server at `lib/websocket/server.ts` — run `pnpm dev:ws` alongside dev server.
- **Sfera**: Discussion spaces with members, messages, AI agent invocation, forking. DB tables: `Sfera`, `SferaMember`, `SferaMessage`, `SferaForkedSfera`, `SferaArtifact`.
- **DB**: PostgreSQL + Drizzle ORM. Schema at `lib/db/schema.ts`, migrations in `lib/db/migrations/`. Reads `.env.local`.
- **Auth**: NextAuth.js v5 beta (`next-auth`). Magic tokens and credentials. Guest users match `/^guest-\d+$/` (limited to 20 msgs/day, 2 models).
- **Orbit**: Visual message trajectory UI — routes under `/(orbit)/` with canvas/interaction hooks in `hooks/use-orbit-*`.
- **Usage tracking**: `AiUsageLog` table records every AI call with token counts, cost estimation, and daily budget caps ($10/day).
- **Idempotency**: `SferaMessage.idempotencyKey` prevents duplicate sends.

## Conventions

- **`@/*`** imports resolve to project root (tsconfig `paths`).
- **`components/ui/`** are shadcn/ui — do NOT edit directly. Run `pnpm shadcn:update` to sync.
- **`lib/utils.ts`** and **`hooks/use-mobile.ts`** excluded from lint check — do not modify.
- **Property-based testing** (fast-check + vitest) in `lib/api/validation.test.ts` — follow this pattern for validation schemas.
- **Guest users** (email matches `/^guest-\d+$/`) get limited entitlements. Respect `lib/ai/entitlements.ts`.
- **`.env.local`** for local dev — copy from `.env.example` (requires POSTGRES_URL, AUTH_SECRET, MEGALLM_API_KEY).

## Legacy code constraint

All existing pages/components under `app/(auth)/`, `app/(chat)/`, `app/(orbit)/`, `app/(sfera)/` are **LEGACY**. New code MUST go in `app/v2/`. Do not extend legacy route groups or their components.

## Existing instruction sources

- `.kiro/steering/` — 6 "always included" files covering code rules, tech stack, structure, product, docs, OpenMemory
- `.kiro/specs/` — 5 feature specifications with design docs, requirements, tasks (authorization, design system, orbit page, sfera API, sfera chat)
- `.cursor/rules/openmemory.mdc` — OpenMemory MCP integration rules (always applied)
- `docs/MCP_API.md` — Full MCP API reference
- `docs/CLAUDE_CODE_INTEGRATION.md` — Claude Code integration guide
- `openmemory.md` — Detailed project guide (version 3.1.0)

## Deploy

PM2 via `deploy/ecosystem.config.json` — runs `pnpm start` with `NODE_ENV=production`, single fork, 1GB max memory. Nginx config at `deploy/nginx-avrora.click.conf`. The Vercel template (`vercel-template.json`) provisions Neon (Postgres), Upstash (Redis), and Vercel Blob.

## Key env vars

| Variable | Purpose |
|---|---|
| `POSTGRES_URL` | Database DSN |
| `AUTH_SECRET` | NextAuth secret (also `NEXTAUTH_SECRET`) |
| `MEGALLM_API_KEY` | Powers ALL OpenAI-compatible + Claude models |
| `GOOGLE_GENERATIVE_AI_API_KEY` | Gemini/Imagen image generation |
| `TAVILY_API_KEY` | Web search tool (Tavily) |
| `REPLICATE_API_KEY` | Music/video generation |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob Storage |
| `REDIS_URL` | Redis for rate limiting + caching |
| `SPEECH_TO_TEXT_API_URL` | External Python transcription service |
