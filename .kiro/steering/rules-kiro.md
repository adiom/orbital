---
inclusion: always
---


# Rules 1: Пиши на русском

- **Всегда пиши на русском языке**: пиши лаконично и мало

# Rules 2: никогда не делай git push

- **Всегда пиши на английском языке**: пиши лаконично и мало

# Avrora Area Development Guidelines

## Code Philosophy

- **Function over class**: Prefer composition over inheritance
- **Meaning over syntax**: Form serves perception, code as narrative
- **Minimal implementations**: Write only essential code, avoid verbosity
- **Type safety**: Leverage TypeScript strict mode, avoid `any`

## File & Naming Conventions

- **Files**: kebab-case (`orbit-message.tsx`, `use-orbit-zoom.ts`)
- **Components**: PascalCase, one per file
- **Hooks**: Prefix with `use-`
- **Server actions**: `actions.ts` in route directories
- **API routes**: `route.ts` in API directories
- **Prefer named exports** over default exports

## Import Patterns

```typescript
// Order: external → internal → relative
import { useState } from 'react'
import { streamText } from 'ai'
import { db } from '@/lib/db'
import { OrbitMessage } from './orbit-message'
```

Use `@/*` path alias for root imports.

## React & Next.js Patterns

- **Server Components by default**: Only add `"use client"` when needed (hooks, events, browser APIs)
- **Server Actions**: Use for mutations, prefix with `"use server"`
- **Streaming**: Leverage AI SDK streaming for real-time responses
- **Error boundaries**: Handle errors gracefully with try-catch and error states

## Database Patterns

- **UUIDs**: All primary keys use `defaultRandom()`
- **Timestamps**: Include `createdAt`, `updatedAt` where applicable
- **JSONB**: Use for flexible data (attachments, tool results, permissions)
- **Cascade deletes**: Set on foreign keys where appropriate
- **Drizzle ORM**: Define schema in `lib/db/schema.ts`, queries in `lib/db/queries.ts`

## AI Integration Guidelines

- **Agent detection**: Use mention parser for `@avrora`, `@kristina` detection
- **Streaming responses**: Always use `streamText` or `streamObject` for AI responses
- **Tool definitions**: Define in `lib/ai/tools/`, register in agent configuration
- **Prompts**: Centralize in `lib/ai/prompts/`, separate by concern (core, artifacts, tools, sfera)
- **Multi-provider**: Support multiple AI providers via AI SDK

## Sfera & Orbit Concepts

- **Sfera**: Collaborative discussion space with forking/branching
- **Messages**: Can have parent messages (threading) and fork to new Sferas
- **Artifacts**: Generated content tied to messages (text, code, image, sheet, mini-app, chart, game)
- **Permissions**: Role-based (owner, admin, member, viewer) with DAO support

## Component Organization

- `components/ui/` - Base primitives (Radix + Tailwind)
- `components/orbit/` - Orbit-specific visualization components
- `components/elements/` - Reusable chat/message elements
- `components/` (root) - Feature components

## Common Patterns

**Server Action Example:**
```typescript
'use server'
export async function createSfera(data: CreateSferaInput) {
  const session = await auth()
  if (!session?.user?.id) throw new Error('Unauthorized')
  // Implementation
}
```

**Client Hook Example:**
```typescript
'use client'
export function useOrbitZoom() {
  const [zoom, setZoom] = useState(1)
  // Implementation
  return { zoom, setZoom }
}
```

**AI Tool Definition:**
```typescript
export const myTool = tool({
  description: 'Clear description for AI',
  parameters: z.object({ /* zod schema */ }),
  execute: async (params) => { /* implementation */ }
})
```

## Testing & Quality

- Use Playwright for E2E tests
- Run `pnpm lint` before commits (ultracite/biome)
- Check diagnostics with `getDiagnostics` tool
- Validate with Zod schemas at API boundaries

## Performance Considerations

- Use React Server Components for data fetching
- Implement proper loading states and skeletons
- Optimize images with Next.js Image component
- Use SWR for client-side caching where appropriate
- Implement rate limiting on API routes (Redis-based)

## Security Practices

- Validate all inputs with Zod
- Check authentication in server actions and API routes
- Use NextAuth session management
- Implement rate limiting on public endpoints
- Sanitize user-generated content before rendering