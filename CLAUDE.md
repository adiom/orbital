# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## Project Overview

**Avrora Area** is an AI‑enhanced collaboration platform built with **Next.js (App Router)**, **React 19**, **TypeScript**, **PostgreSQL + Drizzle ORM**, **Redis**, and **Vercel AI SDK**.  It supports:

- **Sfera spaces** – public, private and DAO‑style collaborative workspaces with role‑based access.
- **AI agents** – Avrora AI, Claude Code, and multi‑provider agents (Anthropic, OpenAI, Google, xAI).
- **Message threading & forking** – conversations can be branched into new Sferas.
- **Artifacts** – generated content types (text, code, images, charts, mini‑apps, games, sheets).
- **Magic‑link authentication** – password‑less sign‑in via email tokens.
- **MCP (Model Context Protocol) integration** – external tools (Claude Desktop) can read/write Sferas.

The system is organized into a clear separation of concerns: UI components, core business logic (`lib/`), database layer, AI integration, and real‑time WebSocket services.

---

## High‑Level Architecture

```
avrora-area/
├── app/                     # Next.js App Router – routes and pages
│   ├── (auth)/              # Authentication (NextAuth magic‑link)
│   ├── (chat)/              # Personal / group chat UI
│   ├── (orbit)/             # Orbit view – visual network of Sferas
│   └── api/                 # Server‑side API endpoints
├── components/              # React UI components
│   ├── ui/                  # Radix UI primitives + Tailwind styling
│   ├── orbit/               # Orbit‑specific visual components
│   └── elements/            # Reusable chat/message elements
├── lib/                     # Core application logic
│   ├── ai/                  # AI agents, prompts, tools, MCP glue
│   ├── db/                  # Drizzle schema, migrations, DB helpers
│   ├── mcp/                 # Model Context Protocol server proxy
│   ├── mentions/            # @‑mention parsing & handling
│   └── websocket/           # Real‑time WebSocket server
├── artifacts/               # Implementations of generated artifact types
├── hooks/                   # Custom React hooks (messages, chat, orbit, etc.)
├── public/                  # Static assets (images, favicons)
├── scripts/                 # Dev helpers (dev.sh, MCP CLI, migration helpers)
└── docs/                    # Integration docs (Claude, MCP, etc.)
```

### Core Layers

- **Frontend** – Radix UI + Tailwind, CodeMirror editor, ProseMirror for rich text, Recharts & data‑grid for visual artefacts, SWR for data fetching.
- **Backend** – Next.js API routes, server actions, WebSocket server (`lib/websocket/server.ts`), rate limiting (`lib/redis/rate-limit.ts`).
- **Database** – PostgreSQL accessed via Drizzle ORM (`lib/db/schema.ts`).  Core tables include `User`, `Sfera`, `SferaMessage`, `SferaMember`, `Artifact`, `AgentRegistry`, `ToolExecution`, etc.
- **AI Integration** – Vercel AI SDK streams responses (`streamText`, `streamObject`), provider‑agnostic SDK (`@ai-sdk/*`), and custom tools under `lib/ai/tools/`.
- **MCP** – Model Context Protocol endpoint (`app/api/mcp/route.ts`) exposing JSON‑RPC for external Claude Code clients.

---

## Common Development Commands

Run all commands from the repository root.

| Task | Command | Notes |
|------|---------|-------|
| **Start dev environment** | `pnpm dev` | Starts Next.js dev server (Turbo). |
| **Start WebSocket server** | `pnpm dev:ws` | Runs the real‑time WS server in a separate terminal. |
| **Full dev stack (incl. PostgreSQL & Redis)** | `./scripts/dev.sh` | Boots Postgres (via Postgres.app) and Redis (brew), then runs both servers. |
| **Build for production** | `pnpm build` | Runs DB migrations then creates a Next.js production build. |
| **Run production server** | `pnpm start` | Serves the built app. |
| **Lint** | `pnpm lint` | Runs Ultracite (Bioma) static analysis. |
| **Auto‑format** | `pnpm format` | Fixes lintable issues automatically. |
| **Run unit tests** | `pnpm test:unit` | Vitest test runner. |
| **Run unit tests in watch mode** | `pnpm test:unit:watch` | Continuous testing during development. |
| **Run end‑to‑end tests** | `pnpm test` | Executes Playwright test suite (requires `PLAYWRIGHT=True`). |
| **Database migration** | `pnpm db:migrate` | Applies pending Drizzle migrations. |
| **Generate migration files** | `pnpm db:generate` | Scans schema changes and creates new migration SQL. |
| **Open Drizzle Studio** | `pnpm db:studio` | GUI for inspecting DB schema & data. |
| **Push schema without migrations** | `pnpm db:push` | Directly syncs schema to Postgres (use with caution). |
| **Check migration status** | `pnpm db:check` | Validates migration consistency. |
| **MCP CLI** | `pnpm mcp` | Helper for interacting with the MCP proxy (`scripts/mcp-cli.js`). |
| **Update shadcn components** | `pnpm shadcn:update` | Runs the shadcn update script. |

---

## Testing Strategy

- **Unit tests** – Located under `test/` or alongside modules, executed with Vitest (`pnpm test:unit`).
- **End‑to‑end tests** – Playwright test suite in `tests/` (or as defined by `playwright.config.ts`). Run via `pnpm test` which sets `PLAYWRIGHT=True`.
- **CI** – The project’s CI (GitHub Actions) runs both Vitest and Playwright on push/PR.

---

## Linting & Formatting

- **Linter** – Ultracite (extends Biome) configured in `eslint.config.mjs`. Run with `pnpm lint`.
- **Formatter** – Biome / ESLint `--fix` via `pnpm format`.
- **Ignored paths** – `.next`, `out`, `build`, `node_modules`, generated files, and UI primitives are excluded in `eslint.config.mjs`.

---

## Database Workflow

1. **Edit schema** – `lib/db/schema.ts`.
2. **Generate migration** – `pnpm db:generate` (creates a file in `lib/db/migrations/`).
3. **Apply migration** – `pnpm db:migrate`.
4. **Verify** – `pnpm db:studio` or `pnpm db:check`.

---

## MCP / Claude Code Integration

- **MCP server** – Exposed at `/api/mcp` (`app/api/mcp/route.ts`).  Uses JSON‑RPC 2.0.
- **Configuration** – Add your API key to `.env.local` (`CLAUDE_CODE_API_KEY`).  See `docs/CLAUDE_CODE_INTEGRATION.md` for desktop client setup.
- **Common MCP actions** – List resources, create Sferas, send messages, invoke Avrora AI.  Use the `pnpm mcp` CLI for quick local testing.

---

## OpenMemory & Memory‑First Development (⦿ .cursor/rules/openmemory.mdc)

Claude Code is expected to follow a **three‑phase memory workflow** for any code change:

1. **Initial Search** – Run 2‑3 searches (project facts, user preferences, patterns) before writing code.
2. **Continuous Search** – Search at each checkpoint (file creation, function implementation, naming decisions, error handling, testing).
3. **Completion** – Store at least one memory entry (component, implementation, debug, or preference) and verify no missed search steps.

The `openmemory.mdc` file also defines the required memory‑type metadata (component, implementation, debug, user_preference, etc.) and enforces security checks to avoid storing secrets.

---

## Key Component Groups (high‑level, not an exhaustive list)

- **Core UI** – `components/ui/*` (Radix primitives), `components/orbit/*` (network visualization), `components/elements/*` (chat/message rendering).
- **Editors** – `components/code-editor.tsx` (CodeMirror), `components/text-editor.tsx` (ProseMirror), `components/image-editor.tsx`.
- **AI Tools** – Implemented under `lib/ai/tools/` (e.g., generative image/video, mini‑apps, analytics).
- **Database Layer** – `lib/db/*` (schema, migrations, helper utilities).
- **WebSocket** – Real‑time channel for AI streaming (`lib/websocket/*`).
- **Authentication** – NextAuth magic‑link flow (`app/(auth)/*`).
- **MCP Glue** – `lib/mcp/*` and API route `app/api/mcp/route.ts`.

---

## Important Configuration Files

- `next.config.ts` – Next.js server configuration, custom rewrites, and experimental flags.
- `tailwind.config.js` – Tailwind CSS with `tailwind-merge` and `tailwindcss-animate`.
- `postcss.config.mjs` – PostCSS plugins (Tailwind, typography).
- `drizzle.config.ts` – Drizzle ORM database connection settings.
- `.env.example` – Template for required environment variables (Postgres DSN, Redis URL, NextAuth secret, CLAUDE_CODE_API_KEY, etc.).

---

## Security & Best Practices

- **Never commit secrets** – `.env.local` is ignored; any secret must be stored in environment variables.
- **Input validation** – Zod schemas are used throughout API routes (`lib/api/validation.ts`).
- **Rate limiting** – Redis‑backed limiter (`lib/redis/rate-limit.ts`) protects public endpoints.
- **Idempotency** – `X-Idempotency-Key` header prevents duplicate message creation.
- **Memory storage** – The OpenMemory system enforces secret‑scanning before persisting any memory entry.

---

## Getting Started Quick Checklist

1. **Copy `.env.example` → `.env.local`** and fill required values (Postgres, Redis, NextAuth secret, `CLAUDE_CODE_API_KEY`).
2. **Install dependencies** – `pnpm install`.
3. **Launch dev stack** – `./scripts/dev.sh` (or run `pnpm dev` + `pnpm dev:ws` separately).
4. **Open http://localhost:3000** to view the app.
5. **Run tests** – `pnpm test` (E2E) and `pnpm test:unit` (unit).
6. **Use MCP** – `pnpm mcp` or configure Claude Desktop per `docs/CLAUDE_CODE_INTEGRATION.md`.

---

*This CLAUDE.md file is intended for Claude Code to quickly understand project layout, common commands, and the required memory workflow.  Keep it up‑to‑date as the architecture evolves.*
