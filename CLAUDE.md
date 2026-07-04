# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## Project Overview

**Orbital** is an AI-enhanced collaboration and knowledge platform built with **Next.js (App Router)**, **React 19**, **TypeScript**, **PostgreSQL + Drizzle ORM**, **Redis**, and **Vercel AI SDK**.

The old name **Avrora Area** was a prototype name and must not be used as the public product name. The product is **Orbital**. **Avrora** may remain as the AI agent/persona inside the product, but not as the platform name.

Orbital is not intended to feel like another chat app, file explorer, board, UML graph, mind map, or diagram editor. The product direction is:

```text
Orbital is where conversations become knowledge.
```

The core product idea is that users create something that may become an idea, discussion, note, research thread, project, document, hypothesis, decision log, or knowledge cell. The UI should not force one universal noun on this object. Internally the code still uses historical terms like `orbit`, `sfera`, `Sfera`, and routes such as `/orbit/[id]` and `/api/sfera`; do not rename those casually. Public UI language should avoid exposing these internal names unless there is no reasonable alternative.

Orbital supports:

- **Living knowledge cells** – internally still represented by Sfera/Orbit models, but publicly unnamed and user-defined.
- **AI agents** – Avrora AI, Claude Code, and multi-provider agents (Anthropic, OpenAI, Google, xAI).
- **Message threading and branching** – conversations can branch into new related cells.
- **Artifacts** – generated content types (text, code, images, charts, mini-apps, games, sheets).
- **Magic-link authentication** – passwordless sign-in via email tokens.
- **MCP (Model Context Protocol) integration** – external tools (Claude Desktop, Claude Code clients) can read/write Orbital data.

The system is organized into a clear separation of concerns: UI components, core business logic (`lib/`), database layer, AI integration, and real-time WebSocket services.

---

## Current Development Direction

The active product work is a redesign of Orbital from a chat/container interface into a **living knowledge universe**.

### Product Language

- Public product name: **Orbital**.
- Prototype name **Avrora Area** is deprecated and should not appear in user-facing copy.
- AI name/persona: **Avrora**.
- The main user-created object should not have a fixed public noun like Orbit, Sfera, Space, Board, Folder, or Chat.
- Prefer verbs and states in UI copy: `Создать...`, `Открыть`, `Продолжить`, `Развить`, `Настройки`, `Удалить`, `живет`, `созревает`, `тихо`.
- Primary create CTA should be mysterious and open-ended: `Создать...`.
- Avoid public labels like `Create Orbit`, `New Orbit`, `All Orbits`, `Orbit Settings`, `Sfera`, `Forked from`.
- For branching language, prefer `Продолжение:` or action-oriented wording over `Forked from:`.

### Living Map

The main page (`/`) now points to the new living map experience from `app/(orbit)/orbits/new_home/page.tsx`.

The map should feel like a calm, premium, organic constellation of active thoughts:

- Encourage exploration rather than navigation.
- Feel like walking through ideas, not browsing folders.
- Use white/off-white space intentionally.
- Avoid diagram-editor aesthetics: no Miro, draw.io, XMind, UML, org charts, Trello, file explorers.
- Take inspiration from Apple Freeform, Figma canvas, Arc Browser, Linear, Notion, and modern macOS UI.
- Cards should feel lightweight and floating, with soft depth and subtle motion.
- Connections should feel like natural growth, not engineering arrows.
- Motion should be slow, elegant, and meaningful.

Current implementation details:

- `components/orbit/new-home/orbit-network-timeline.tsx` uses React Flow for rendering but hides diagram affordances.
- `components/orbit/new-home/orbit-node.tsx` renders the new floating living object UI.
- Layout is a custom compact constellation layout, not a strict DAG/org chart.
- Public graph objects show life signals from available data: state (`живет`, `созревает`, `тихо`), density bar, fork gravity, recency/activity label, glow, and subtle floating animation.
- Future data slots already exist conceptually for participants, AI insights, lifecycle, decisions, summaries, and knowledge state. Do not fake those data in UI; show them only when real data exists.
- `app/globals.css` contains `orbital-*` animation classes for slow floating/drift behavior.

### Knowledge Model Direction

The desired future model is not just messages. Messages are raw material for knowledge. Orbital should evolve toward semantic objects and events:

- Ideas
- Decisions
- Discoveries
- Mistakes
- Hypotheses
- Experiments
- Documents
- Knowledge

The long-term search direction is semantic search over thoughts, not raw message search. A query should return decisions, ideas, hypotheses, mistakes, documents, and knowledge with source messages as evidence.

The desired lifecycle for ideas:

```text
appeared -> discussing -> validated -> implementing -> implemented -> knowledge
```

The desired event stream direction:

```text
message -> idea_created -> document_created -> related_discussion_found -> experiment_started -> decision_made -> knowledge_promoted
```

Do not implement broad schema changes without checking current DB constraints and migration workflow. For now, keep UI changes compatible with existing Sfera/Orbit tables unless explicitly asked to add migrations.

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
