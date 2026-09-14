# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Orbital (package `avrora-area`) — an AI-powered "living knowledge universe": conversations happen inside **Sferas**, rendered on the frontend as **Orbits** (frosted-glass cards on a force-laid-out canvas). The UI language is **Russian**; UI copy must speak in verbs and states (`Создать...`, `Открыть`, `Продолжить`, `живет`, `созревает`), never force a product noun like "Create Orbit". `DESIGN.md` is the design authority — read it before frontend/UI work.

## Commands

Toolchain: Node 26 / pnpm 11 via mise (`.mise.toml`).

```bash
pnpm dev          # starts Postgres (Postgres.app) + Redis (brew) if down, then `next dev` (scripts/dev-next.sh)
pnpm dev:ws       # separate WebSocket server (lib/websocket/server.ts), needed for realtime features
pnpm build        # runs db:migrate, then next build
pnpm lint         # eslint
pnpm format       # eslint --fix

pnpm test         # Playwright e2e (tests/e2e/**, tests/routes/**) — boots its own dev server via webServer config
pnpm test:unit    # Vitest unit tests
pnpm exec vitest --run test/orbit-settings-visibility.test.ts   # single unit test
pnpm exec playwright test tests/e2e/foo.test.ts                 # single e2e test

pnpm db:generate  # drizzle-kit generate (schema → SQL migration in lib/db/migrations)
pnpm db:migrate   # apply migrations (tsx lib/db/migrate.ts)
pnpm db:studio    # drizzle studio
pnpm mcp          # avrora-mcp CLI (scripts/mcp-cli.js)
```

Env: copy `.env.example` → `.env.local`. Required for dev: `POSTGRES_URL`, `AUTH_SECRET`, `REDIS_URL`, plus AI provider keys (`AI_GATEWAY_API_KEY`, `BANITA_API_KEY`, `REPLICATE_API_KEY`, …).

## Architecture

Next.js App Router + AI SDK (`ai` v7) + Drizzle ORM (PostgreSQL) + Redis + Vercel Blob. Tailwind + shadcn/radix components (`components/ui`).

### Sfera vs Orbit naming (important)

One domain entity, two vocabularies:
- **Backend/DB/API**: `Sfera` — tables `sfera`, `sferaMember`, `sferaMessage`, `sferaForkedSfera`; API routes `app/api/sfera/...`; pages `app/(sfera)/sfera/[id]`.
- **Frontend/UI**: `orbit` — components in `components/orbit/`, hooks and layout logic in `lib/orbit/` (force layout, cluster detection, demo data).

Forks are "Продолжения" (`sferaForkedSfera` parent/child links). Sfera visibility is `"private" | "public" | "dao"` (options in `components/orbit/orbit-settings.tsx`).

### Two chat lineages

- Legacy AI SDK template chat: `Chat`/`Message_v2` tables, `app/(chat)`, `components/chat` — not the product focus.
- **Sfera chat** (the product): `app/(sfera)/sfera/[id]` pages, `components/orbit/orbit-chat.tsx`, message/members/fork logic in `app/api/sfera/[id]/*` (`ai-stream`, `chat`, `messages`, `panel-chat`, `fork`, `members`, `capabilities`, `claude-code`).

### AI agents

`lib/ai/agents/` — registry-based multi-agent system:
- `instances/` — built-in agents: `avrora` (fixed UUID `00000000-0000-0000-0000-000000000001`, mention `@avrora`), `kristina`, `cf-kristina` (external MCP-backed), `onboarding`.
- `detector.ts` — routes a user message to agent(s) via mention patterns; `base-streamer.ts` / `external-mcp-streamer.ts` stream responses.
- System users (agents) are defined in `lib/constants/system-users.ts`. **BANITA** is the image-capable agent — capability logic in `lib/capabilities/banita.ts`, with intent detection in `image-intent.ts`.
- AI tools live in `lib/ai/tools/`; prompts in `lib/ai/prompts*`.
- Agent configs/prompt versions are also persisted (`AgentRegistry`, `AgentConfig`, `AgentPromptVersion` tables, `lib/services/agent-registry.ts`).

### MCP API

`app/api/mcp/route.ts` exposes the product over MCP (JSON-RPC 2.0, single endpoint) for external clients like Claude Desktop. Auth via `Authorization: Bearer avr_live_...` API keys (`ApiKey` table, managed in settings). Rate limiting in `lib/mcp/rate-limit.ts`, audit in `McpAuditLog`. Protocol docs: `docs/MCP_API.md` — but the official MCP TypeScript SDK docs are the implementation authority.

### Database

Single schema: `lib/db/schema.ts` (24 tables, PascalCase table names, camelCase columns). Queries in `lib/db/queries.ts`, helpers in `lib/db/helpers/`. Migrations in `lib/db/migrations/` — never edit applied migrations; generate new ones with `pnpm db:generate`.

### Realtime

WebSocket is a **separate process** (`pnpm dev:ws`, `lib/websocket/server.ts`), with connection management in `manager.ts` and the client hook `use-websocket.ts`.

### Internal Next.js docs rule

Per `docs/nextjs-rules.md`: before any Next.js work, read the relevant docs in `node_modules/next/dist/docs/` — they are the source of truth, preferred over training knowledge.
