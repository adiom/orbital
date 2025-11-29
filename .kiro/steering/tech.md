# Tech Stack

## Core Technologies

**Framework**: Next.js 15.3.0-canary with App Router and React 19 RC  
**Language**: TypeScript 5.6+ with strict mode enabled  
**Package Manager**: pnpm 9.12.3+  
**Database**: PostgreSQL with Drizzle ORM 0.34  
**Cache/Real-time**: Redis for rate limiting and WebSocket support  
**Storage**: Vercel Blob for file uploads  
**Authentication**: NextAuth.js 5.0 (magic link based)

## Frontend Stack

- **UI Components**: Radix UI primitives with Tailwind CSS 4.x
- **Styling**: Tailwind CSS with custom HSL color system, tailwindcss-animate
- **Rich Text**: ProseMirror for document editing
- **Code Editor**: CodeMirror 6 with JavaScript/Python support
- **Animations**: Framer Motion
- **Data Fetching**: SWR for client-side state
- **Charts**: Recharts for data visualization
- **Spreadsheets**: react-data-grid

## AI Integration

- **AI SDK**: Vercel AI SDK 5.0.26 with streaming support
- **Providers**: 
  - `@ai-sdk/anthropic` (Claude)
  - `@ai-sdk/openai` (GPT-4, GPT-4o)
  - `@ai-sdk/google` (Gemini)
  - `@ai-sdk/xai` (Grok)
  - Custom MegaLLM provider
- **MCP**: Model Context Protocol SDK 1.0.4
- **Tools**: Tavily (web search), Replicate (media generation), Google Generative AI (Imagen)

## Code Quality

- **Linter**: Ultracite 5.3.9 (extends Biome)
- **Formatter**: Biome 2.2.2
- **Testing**: Playwright for E2E tests

## Common Commands

```bash
# Development
pnpm dev              # Start Next.js dev server with Turbo
pnpm dev:ws           # Start WebSocket server (separate terminal)

# Database
pnpm db:generate      # Generate Drizzle migrations
pnpm db:migrate       # Run migrations
pnpm db:studio        # Open Drizzle Studio GUI
pnpm db:push          # Push schema without migrations

# Build & Deploy
pnpm build            # Production build (runs migrations first)
pnpm start            # Start production server

# Code Quality
pnpm lint             # Check code with ultracite
pnpm format           # Auto-fix formatting issues

# Testing
pnpm test             # Run Playwright tests

# Tools
pnpm mcp              # MCP CLI tool
pnpm shadcn:update    # Update shadcn components
```

## Environment Requirements

- Node.js 18+
- PostgreSQL database
- Redis (optional but recommended)
- Required API keys: AI providers, Vercel Blob, Tavily, Replicate

## Key Dependencies

- `ai` 5.0.26 - Vercel AI SDK
- `drizzle-orm` 0.34 - Type-safe ORM
- `next-auth` 5.0.0-beta.25 - Authentication
- `prosemirror-*` - Rich text editing
- `codemirror` 6.0 - Code editing
- `ws` 8.18 - WebSocket server
- `zod` 3.25 - Schema validation

## Documentation

- [Next.js](http://nextjs.org/docs)
- [Vercel AI SDK](https://ai-sdk.dev/docs/introduction)

