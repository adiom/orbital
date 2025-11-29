---
inclusion: fileMatch
fileMatchPattern: ['**/api/sfera/**/*.ts', '**/lib/db/schema.ts', '**/(orbit)/**/*.ts', '**/components/orbit/**/*.tsx']
---

# Sfera API Guidelines

Sfera — collaborative discussion spaces with forking, threading, and AI agent integration.

## Core Concepts

- **Sfera**: Collaborative space with members, messages, and artifacts
- **Messages**: Can have parent messages (threading) and spawn forks
- **Forking**: Create new Sfera from any message, preserving context
- **Roles**: owner, admin, member, viewer (hierarchical permissions)
- **Visibility**: public, private, dao

## Database Schema

### Key Tables

**sfera** - Main Sfera entity
- `id` (uuid), `title`, `description`, `ownerId`, `visibility`
- `createdAt`, `updatedAt`

**sferaMember** - Membership with roles
- Composite PK: `(sferaId, userId)`
- `role`: owner | admin | member | viewer
- `joinedAt`

**sferaMessage** - Messages with threading
- `id`, `sferaId`, `userId`, `content`
- `parentMessageId` (nullable, for threading)
- `attachments` (JSONB array)
- `toolResults` (JSONB array for AI-generated content)
- `isForked`, `forkCount`, `isGenerating`

**sferaForkedSfera** - Fork relationships
- `parentSferaId`, `parentMessageId`, `forkedSferaId`
- `createdById`, `createdAt`

**sferaArtifact** - Links documents to Sferas
- Composite PK: `(sferaId, documentId)`
- `createdByMessageId`, `documentCreatedAt`

## API Endpoints

### GET /api/sfera
List all Sferas for current user with fork relationships.

**Response:**
```typescript
{
  sferas: Array<Sfera & { role: string }>,
  forkRelationships: Array<{
    parentSferaId: string,
    forkedSferaId: string,
    createdAt: Date
  }>
}
```

### POST /api/sfera
Create new Sfera.

**Body:**
```typescript
{
  title: string,
  description?: string,
  visibility?: 'public' | 'private' | 'dao',
  memberIds?: string[],
  memberEmails?: string[]
}
```

**Rules:**
- At least one member required (besides owner)
- Default member `avrora@avrora.click` auto-added
- Owner automatically added with `owner` role
- Returns created Sfera

### GET /api/sfera/[id]
Get Sfera details with messages, members, and parent info.

**Response:**
```typescript
{
  sfera: Sfera,
  parentSfera: { id: string, title: string } | null,
  members: Array<{ userId, role, joinedAt, email }>,
  messages: Array<Message & { forkedSferaId?: string }>
}
```

**Rules:**
- Requires membership
- Messages limited to 50 most recent
- Includes fork information per message

### PUT /api/sfera/[id]
Update Sfera (owner/admin only).

**Body:**
```typescript
{
  title?: string,
  description?: string,
  visibility?: 'public' | 'private' | 'dao'
}
```

### DELETE /api/sfera/[id]
Delete Sfera (owner only). Cascade deletes members, messages, forks.

### POST /api/sfera/[id]/messages
Create message in Sfera.

**Body:**
```typescript
{
  content?: string,
  parentMessageId?: string,
  attachments?: Array<{
    name: string,
    url: string,
    contentType: string
  }>
}
```

**Rules:**
- Requires either `content` or `attachments`
- Detects AI agent mentions (`@avrora`, `@kristina`)
- Creates empty messages for mentioned agents with `isGenerating: true`
- Starts async streaming responses for agents
- Checks rate limits per agent
- Auto-adds agents as members if not present
- Returns `{ message, agentMessages: [{ agentId, messageId }] }`

### PATCH /api/sfera/[id]/messages/[messageId]
Update message (author or moderator).

**Body:**
```typescript
{
  content?: string,
  attachments?: Array<{...}>
}
```

**Rules:**
- Author can edit own messages
- Owner/admin can edit any message
- Requires either content or attachments

### DELETE /api/sfera/[id]/messages/[messageId]
Delete message (author or moderator).

**Rules:**
- Cannot delete if message has spawned a fork
- Author can delete own messages
- Owner/admin can delete any message

### POST /api/sfera/[id]/members
Add member to Sfera (owner/admin only).

**Body:**
```typescript
{
  userId?: string,
  email?: string,
  role?: 'admin' | 'member' | 'viewer'
}
```

**Rules:**
- Provide either `userId` or `email`
- Email resolved to userId automatically
- Cannot add duplicate members

### DELETE /api/sfera/[id]/members
Remove member (owner/admin only).

**Body:**
```typescript
{
  userId: string
}
```

**Rules:**
- Cannot remove owner
- Only owner/admin can remove members

### POST /api/sfera/[id]/fork
Fork Sfera from a message.

**Body:**
```typescript
{
  messageId: string
}
```

**Rules:**
- Creates new Sfera with auto-generated title (first 50 chars of message)
- Copies original message to new Sfera
- Copies all members from parent Sfera
- Creator becomes owner of forked Sfera
- Marks parent message as `isForked: true`
- Cannot fork same message twice
- Returns `{ forkedSfera, sfera }`

## Permission Patterns

```typescript
// Check membership
const [membership] = await db
  .select()
  .from(sferaMember)
  .where(and(
    eq(sferaMember.sferaId, sferaId),
    eq(sferaMember.userId, userId)
  ))
  .limit(1);

if (!membership) {
  return Response.json({ error: "Forbidden" }, { status: 403 });
}

// Check moderator role
const MODERATOR_ROLES = ['owner', 'admin'] as const;
const canModerate = MODERATOR_ROLES.includes(membership.role);
```

## AI Agent Integration

**Agent Detection:**
```typescript
import { detectMentionedAgents } from '@/lib/ai/agents/detector';

const mentionedAgents = detectMentionedAgents(content);
// Returns: Array<{ id, name, email, userId, rateLimit? }>
```

**Streaming Response:**
```typescript
import { streamAgentResponse } from '@/lib/ai/agents/base-streamer';

await streamAgentResponse({
  sferaId,
  triggerMessageId,
  targetMessageId,
  requestingUserId,
  agent
});
```

**Rate Limiting:**
```typescript
import { checkAvroraRateLimit } from '@/lib/redis/rate-limiter';

const rateLimitResult = await checkAvroraRateLimit(userId, sferaId);
if (!rateLimitResult.allowed) {
  // Post rate limit message
}
```

## Common Patterns

**Update Sfera timestamp:**
```typescript
await db
  .update(sfera)
  .set({ updatedAt: new Date() })
  .where(eq(sfera.id, sferaId));
```

**Ensure agent user exists:**
```typescript
const [agentUser] = await db
  .select()
  .from(user)
  .where(eq(user.id, agent.userId))
  .limit(1);

if (!agentUser) {
  await db.insert(user).values({
    id: agent.userId,
    email: agent.email,
  });
}
```

**Add agent as member:**
```typescript
await db.insert(sferaMember).values({
  sferaId,
  userId: agent.userId,
  role: 'member',
  joinedAt: new Date(),
});
```

## Error Handling

- **401 Unauthorized**: No session or invalid auth
- **403 Forbidden**: Not a member or insufficient permissions
- **404 Not Found**: Sfera/message doesn't exist
- **400 Bad Request**: Invalid input or business logic violation
- **500 Internal Server Error**: Unexpected errors (log to console)

## Best Practices

- Always check membership before operations
- Use transactions for multi-step operations (fork creation)
- Update `sfera.updatedAt` on any message change
- Validate input with Zod schemas at boundaries
- Log agent interactions for debugging
- Handle rate limits gracefully with user-friendly messages
- Use cascade deletes in schema for cleanup
- Return minimal data needed by client
- Use `limit(1)` for single-record queries