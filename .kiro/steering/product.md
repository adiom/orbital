---
inclusion: always
---

# Product Overview

# Kiro Agent

- ВСЕГДА ГОВОРИ НА РУССКОМ  ЯЗЫКЕ

**Avrora Area** is an AI collaboration platform centered on **Sfera** (collaborative conversation spaces) and **Orbit** (visual message trajectory views).

## Core Concepts

**Sfera**: A conversation space where users and AI agents interact. Each Sfera has:
- Visibility: `public`, `private`, or `dao` (DAO-governed)
- Members with roles: `owner`, `admin`, `member`, `viewer`
- Messages that can be replied to (threading) or forked into new Sferas
- Associated artifacts (generated content)

**Orbit**: A visualization mode showing message relationships as a network graph, revealing conversation trajectories and branches.

**Artifacts**: AI-generated content types tied to messages:
- `text` - Rich text documents (ProseMirror)
- `code` - Code snippets with syntax highlighting
- `image` - Generated images (Replicate, Imagen)
- `sheet` - Spreadsheets (react-data-grid)
- `mini-app` - Interactive React components
- `chart` - Data visualizations (Recharts)
- `game` - Simple interactive games

## AI Agents

**Avrora AI**: Primary conversational assistant with tool access (web search, image generation, analytics)

**Kristina**: Specialized agent (see `lib/ai/agents/instances/kristina.ts`)

**Claude Code**: Code-focused assistant (integration in progress)

Agents are detected via mentions (`@avrora`, `@kristina`) or intent detection. See `lib/ai/agents/` for implementation.

## Authentication & Authorization

- Magic link authentication (NextAuth.js) - no passwords
- API key support for programmatic access (`lib/auth/api-keys.ts`)
- Sfera membership controls access to messages and artifacts
- System users (Avrora, Kristina) have special UUIDs (see `lib/constants/system-users.ts`)

## Message Threading & Forking

- Messages can have `parentMessageId` for threading
- Forking creates a new Sfera with selected message as starting point
- Orbit view visualizes these relationships as a graph

## MCP (Model Context Protocol)

- Extends AI capabilities with external tools
- Configured via API endpoints (`app/api/mcp/route.ts`)
- Tools and resources defined in `lib/mcp/`
- Rate-limited per user

## Development Principles

When working on this codebase:

1. **Composition over inheritance** - Use hooks and utility functions, avoid class hierarchies
2. **Server actions for mutations** - Use Next.js server actions in `actions.ts` files, not API routes
3. **Type safety** - Leverage Drizzle schema types, use Zod for validation
4. **Streaming AI responses** - Use Vercel AI SDK streaming patterns with `streamText`
5. **Real-time updates** - WebSocket server (`lib/websocket/`) for live collaboration
6. **Artifact isolation** - Each artifact type is self-contained in `artifacts/[type]/`
7. **Agent modularity** - Agents are registered in `lib/ai/agents/registry.ts` with consistent interfaces

## User Experience Patterns

- Artifacts open in side panels, not modals
- Messages show tool usage and reasoning when available
- Orbit view allows zooming, filtering, and layout switching
- Mentions trigger AI responses automatically
- File attachments stored in Vercel Blob, referenced in message JSONB
