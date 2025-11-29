# Design Document

## Overview

Архитектурное улучшение Sfera API с переходом на webhook-based модель для AI-агентов, добавлением пагинации, улучшенной валидации и оптимизации производительности. Ключевое изменение — AI-агенты становятся независимыми сервисами, получающими уведомления через webhook и отправляющими ответы через API.

## Architecture

### High-Level Architecture

```
┌─────────────────┐
│   Client App    │
│  (WebSocket +   │
│   HTTP API)     │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────────────┐
│         Sfera API Server                │
│  ┌──────────────────────────────────┐   │
│  │   API Routes Layer               │   │
│  │  - Validation (Zod)              │   │
│  │  - Rate Limiting (Redis)         │   │
│  │  - Authentication                │   │
│  └──────────┬───────────────────────┘   │
│             │                            │
│  ┌──────────▼───────────────────────┐   │
│  │   Business Logic Layer           │   │
│  │  - Sfera Service                 │   │
│  │  - Message Service               │   │
│  │  - Agent Registry Service        │   │
│  │  - Notification Service          │   │
│  └──────────┬───────────────────────┘   │
│             │                            │
│  ┌──────────▼───────────────────────┐   │
│  │   Data Access Layer              │   │
│  │  - Drizzle ORM                   │   │
│  │  - Transaction Manager           │   │
│  │  - Query Optimizer               │   │
│  └──────────┬───────────────────────┘   │
└─────────────┼───────────────────────────┘
              │
    ┌─────────┴─────────┐
    │                   │
    ▼                   ▼
┌─────────┐      ┌──────────────┐
│PostgreSQL│      │    Redis     │
│         │      │ - Rate Limits│
│         │      │ - Cache      │
└─────────┘      └──────────────┘
    │
    │ Webhook HTTP POST
    ▼
┌─────────────────────────────────┐
│   AI Agent Services             │
│  ┌──────────────────────────┐   │
│  │  Avrora Service          │   │
│  │  - Webhook Endpoint      │   │
│  │  - Response Generator    │   │
│  │  - API Client            │   │
│  └──────────────────────────┘   │
│  ┌──────────────────────────┐   │
│  │  Kristina Service        │   │
│  │  - Webhook Endpoint      │   │
│  │  - Response Generator    │   │
│  │  - API Client            │   │
│  └──────────────────────────┘   │
└─────────────────────────────────┘
```

### Component Interaction Flow

**Message Creation with Agent Mention:**

1. User sends message with @avrora mention
2. API validates request (Zod schema)
3. Rate limiter checks user limits
4. Message created in DB with transaction
5. Notification Service detects agent mention
6. Webhook sent to Avrora Service with HMAC signature
7. Avrora Service validates signature
8. Avrora generates response
9. Avrora sends POST/PATCH to Sfera API
10. API validates agent token and membership
11. Message updated in DB
12. WebSocket event sent to connected clients

## Components and Interfaces

### 1. API Routes Layer

**Validation Middleware**
```typescript
// lib/api/validation.ts
import { z } from 'zod';

export const createMessageSchema = z.object({
  content: z.string().min(1).max(10000).optional(),
  parentMessageId: z.string().uuid().optional(),
  attachments: z.array(z.object({
    name: z.string(),
    url: z.string().url(),
    contentType: z.string()
  })).optional(),
  idempotencyKey: z.string().uuid().optional()
}).refine(
  data => data.content || (data.attachments && data.attachments.length > 0),
  { message: "Either content or attachments required" }
);

export const paginationSchema = z.object({
  cursor: z.string().optional(),
  limit: z.number().min(1).max(100).default(50)
});

export const messageFilterSchema = z.object({
  userId: z.string().uuid().optional(),
  messageType: z.enum(['user', 'agent', 'system']).optional(),
  hasAttachments: z.boolean().optional(),
  isForked: z.boolean().optional(),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional()
});
```

**Rate Limiting Middleware**
```typescript
// lib/api/rate-limit.ts
import { Redis } from '@/lib/redis/client';

export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  keyPrefix: string;
}

export async function checkRateLimit(
  userId: string,
  config: RateLimitConfig
): Promise<{ allowed: boolean; remaining: number; resetAt: Date }> {
  const key = `${config.keyPrefix}:${userId}`;
  const now = Date.now();
  const windowStart = now - config.windowMs;
  
  // Use Redis sorted set for sliding window
  const redis = await Redis.getInstance();
  
  // Remove old entries
  await redis.zremrangebyscore(key, 0, windowStart);
  
  // Count current requests
  const count = await redis.zcard(key);
  
  if (count >= config.maxRequests) {
    const oldestEntry = await redis.zrange(key, 0, 0, 'WITHSCORES');
    const resetAt = new Date(Number(oldestEntry[1]) + config.windowMs);
    
    return {
      allowed: false,
      remaining: 0,
      resetAt
    };
  }
  
  // Add current request
  await redis.zadd(key, now, `${now}-${Math.random()}`);
  await redis.expire(key, Math.ceil(config.windowMs / 1000));
  
  return {
    allowed: true,
    remaining: config.maxRequests - count - 1,
    resetAt: new Date(now + config.windowMs)
  };
}
```

### 2. Business Logic Layer

**Agent Registry Service**
```typescript
// lib/services/agent-registry.ts
export interface AgentConfig {
  id: string;
  name: string;
  userId: string;
  email: string;
  webhookUrl: string;
  webhookSecret: string;
  authToken: string;
  metadata: {
    model?: string;
    temperature?: number;
    maxTokens?: number;
  };
  healthStatus: 'healthy' | 'unhealthy' | 'unknown';
  lastHealthCheck?: Date;
  failedWebhookCount: number;
}

export class AgentRegistryService {
  async registerAgent(config: Omit<AgentConfig, 'healthStatus' | 'failedWebhookCount'>): Promise<AgentConfig>;
  async updateAgent(agentId: string, updates: Partial<AgentConfig>): Promise<AgentConfig>;
  async deleteAgent(agentId: string): Promise<void>;
  async getAgent(agentId: string): Promise<AgentConfig | null>;
  async listActiveAgents(): Promise<AgentConfig[]>;
  async validateWebhook(webhookUrl: string): Promise<boolean>;
  async updateHealthStatus(agentId: string, status: 'healthy' | 'unhealthy'): Promise<void>;
  async incrementFailedWebhooks(agentId: string): Promise<number>;
  async resetFailedWebhooks(agentId: string): Promise<void>;
}
```

**Notification Service**
```typescript
// lib/services/notification.ts
export interface WebhookPayload {
  event: 'agent.mentioned';
  idempotencyKey: string;
  priority: 'high' | 'normal' | 'low';
  timestamp: string;
  sfera: {
    id: string;
    title: string;
    description: string;
  };
  triggerMessage: {
    id: string;
    content: string;
    userId: string;
    userEmail: string;
    parentMessageId?: string;
    createdAt: string;
  };
  context: {
    recentMessages: Array<{
      id: string;
      content: string;
      userId: string;
      userEmail: string;
      messageType: 'user' | 'agent' | 'system';
      createdAt: string;
    }>;
    threadMessages?: Array<{...}>;
    artifacts?: Array<{
      documentId: string;
      type: string;
      url: string;
    }>;
  };
  agent: {
    id: string;
    name: string;
  };
}

export class NotificationService {
  async sendWebhook(
    agent: AgentConfig,
    payload: WebhookPayload
  ): Promise<{ success: boolean; error?: string }>;
  
  async sendWebhookWithRetry(
    agent: AgentConfig,
    payload: WebhookPayload,
    maxRetries: number = 3
  ): Promise<void>;
  
  async signPayload(payload: WebhookPayload, secret: string): string;
  
  async determinePriority(
    sferaId: string,
    messageId: string,
    agentId: string
  ): Promise<'high' | 'normal' | 'low'>;
}
```

**Message Service**
```typescript
// lib/services/message.ts
export interface CreateMessageInput {
  sferaId: string;
  userId: string;
  content?: string;
  parentMessageId?: string;
  attachments?: Array<{
    name: string;
    url: string;
    contentType: string;
  }>;
  messageType?: 'user' | 'agent' | 'system';
  idempotencyKey?: string;
}

export interface PaginatedMessages {
  messages: Message[];
  nextCursor?: string;
  hasMore: boolean;
  total: number;
}

export class MessageService {
  async createMessage(input: CreateMessageInput): Promise<Message>;
  
  async updateMessage(
    messageId: string,
    userId: string,
    updates: { content?: string; attachments?: any[] }
  ): Promise<Message>;
  
  async getMessages(
    sferaId: string,
    options: {
      cursor?: string;
      limit?: number;
      filters?: MessageFilters;
    }
  ): Promise<PaginatedMessages>;
  
  async searchMessages(
    sferaId: string,
    query: string,
    options: { cursor?: string; limit?: number }
  ): Promise<PaginatedMessages>;
  
  async checkIdempotency(
    idempotencyKey: string
  ): Promise<Message | null>;
  
  async detectMentionedAgents(content: string): Promise<AgentConfig[]>;
}
```

### 3. Data Access Layer

**Database Schema Extensions**
```typescript
// lib/db/schema.ts additions

export const agentRegistry = pgTable('agent_registry', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  userId: uuid('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  email: varchar('email', { length: 255 }).notNull(),
  webhookUrl: text('webhook_url').notNull(),
  webhookSecret: text('webhook_secret').notNull(),
  authToken: text('auth_token').notNull(),
  metadata: jsonb('metadata').$type<{
    model?: string;
    temperature?: number;
    maxTokens?: number;
  }>(),
  healthStatus: varchar('health_status', { length: 20 })
    .$type<'healthy' | 'unhealthy' | 'unknown'>()
    .default('unknown'),
  lastHealthCheck: timestamp('last_health_check'),
  failedWebhookCount: integer('failed_webhook_count').default(0),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const sferaMessage = pgTable('sfera_message', {
  // ... existing fields ...
  messageType: varchar('message_type', { length: 20 })
    .$type<'user' | 'agent' | 'system'>()
    .default('user'),
  idempotencyKey: varchar('idempotency_key', { length: 255 }),
  // ... rest of fields ...
});

export const idempotencyLog = pgTable('idempotency_log', {
  key: varchar('key', { length: 255 }).primaryKey(),
  messageId: uuid('message_id').notNull().references(() => sferaMessage.id),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  expiresAt: timestamp('expires_at').notNull(),
});

// Indexes for performance
export const sferaMessageIndexes = {
  sferaIdCreatedAt: index('sfera_message_sfera_id_created_at_idx')
    .on(sferaMessage.sferaId, sferaMessage.createdAt),
  messageType: index('sfera_message_type_idx')
    .on(sferaMessage.messageType),
  idempotencyKey: index('sfera_message_idempotency_key_idx')
    .on(sferaMessage.idempotencyKey),
  contentFullText: index('sfera_message_content_fulltext_idx')
    .using('gin', sql`to_tsvector('russian', ${sferaMessage.content})`),
};
```

## Data Models

### Message Model
```typescript
export interface Message {
  id: string;
  sferaId: string;
  userId: string;
  content: string;
  messageType: 'user' | 'agent' | 'system';
  parentMessageId?: string;
  attachments?: Array<{
    name: string;
    url: string;
    contentType: string;
  }>;
  toolResults?: Array<{
    toolName: string;
    result: any;
  }>;
  isForked: boolean;
  forkCount: number;
  isGenerating: boolean;
  idempotencyKey?: string;
  createdAt: Date;
  updatedAt: Date;
}
```

### Agent Model
```typescript
export interface Agent {
  id: string;
  name: string;
  userId: string;
  email: string;
  webhookUrl: string;
  webhookSecret: string;
  authToken: string;
  metadata: {
    model?: string;
    temperature?: number;
    maxTokens?: number;
  };
  healthStatus: 'healthy' | 'unhealthy' | 'unknown';
  lastHealthCheck?: Date;
  failedWebhookCount: number;
  createdAt: Date;
  updatedAt: Date;
}
```

### Webhook Event Model
```typescript
export interface WebhookEvent {
  event: 'agent.mentioned';
  idempotencyKey: string;
  priority: 'high' | 'normal' | 'low';
  timestamp: string;
  signature: string;
  sfera: SferaContext;
  triggerMessage: MessageContext;
  context: ConversationContext;
  agent: AgentContext;
}
```

## Error Handling

### Error Types
```typescript
export class ValidationError extends Error {
  constructor(public field: string, message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class RateLimitError extends Error {
  constructor(
    public retryAfter: Date,
    public limit: number
  ) {
    super('Rate limit exceeded');
    this.name = 'RateLimitError';
  }
}

export class WebhookError extends Error {
  constructor(
    public agentId: string,
    public statusCode?: number,
    message?: string
  ) {
    super(message || 'Webhook delivery failed');
    this.name = 'WebhookError';
  }
}

export class IdempotencyError extends Error {
  constructor(public existingMessageId: string) {
    super('Duplicate request detected');
    this.name = 'IdempotencyError';
  }
}
```

### Error Response Format
```typescript
export interface ErrorResponse {
  error: {
    code: string;
    message: string;
    details?: Record<string, any>;
    retryAfter?: string;
  };
}
```

## Testing Strategy

### Unit Tests
- Validation schemas (Zod)
- Rate limiting logic
- HMAC signature generation/verification
- Idempotency key checking
- Message type detection
- Priority calculation

### Integration Tests
- API endpoint flows
- Database transactions
- Webhook delivery
- WebSocket events
- Agent registration/updates

### Property-Based Tests
Will be defined after prework analysis.


## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Acceptance Criteria Testing Prework

**1.1** WHEN пользователь запрашивает сообщения Sfera, THE Sfera System SHALL возвращать результаты с пагинацией по 50 элементов
- Thoughts: Это правило о том, что по умолчанию должно возвращаться 50 элементов. Можно тестировать генерируя случайные Sfera с разным количеством сообщений и проверяя что первая страница всегда содержит максимум 50 элементов.
- Testable: yes - property

**1.2** WHEN пользователь запрашивает следующую страницу, THE Sfera System SHALL использовать cursor-based пагинацию для эффективной загрузки
- Thoughts: Это о механизме пагинации. Можно проверить что cursor корректно работает - загрузить первую страницу, взять cursor, загрузить вторую страницу и убедиться что нет дубликатов и нет пропусков.
- Testable: yes - property

**1.3** WHEN запрос содержит параметр limit, THE Sfera System SHALL ограничивать результаты указанным значением от 1 до 100
- Thoughts: Это валидация границ. Можно тестировать что любое значение limit от 1 до 100 возвращает правильное количество элементов, а значения вне диапазона отклоняются.
- Testable: yes - property

**1.4** WHEN достигнут конец списка, THE Sfera System SHALL возвращать hasMore равным false
- Thoughts: Это инвариант о состоянии пагинации. Можно проверить что когда мы дошли до конца, hasMore всегда false.
- Testable: yes - property

**2.1** WHEN API получает запрос, THE Validation Layer SHALL проверять все входные параметры через Zod схемы
- Thoughts: Это о том что валидация должна происходить. Можно генерировать случайные невалидные входные данные и проверять что они отклоняются.
- Testable: yes - property

**2.2** WHEN валидация не проходит, THE Sfera System SHALL возвращать ошибку 400 с детальным описанием проблемы
- Thoughts: Это о формате ответа при ошибке. Можно проверить что любая невалидная входная данные возвращает 400 с описанием.
- Testable: yes - property

**9.6** WHEN отправляется webhook, THE Notification System SHALL подписывать payload через HMAC-SHA256 с секретом агента
- Thoughts: Это о криптографической подписи. Это round-trip property - можно сгенерировать payload, подписать его, затем проверить подпись и убедиться что она валидна.
- Testable: yes - property

**15.2** WHEN агент отправляет ответ с idempotency key, THE Sfera System SHALL проверять что сообщение с таким ключом не существует
- Thoughts: Это идемпотентность. Можно отправить один и тот же запрос дважды с одним idempotency key и проверить что создано только одно сообщение.
- Testable: yes - property

**15.3** WHEN обнаружен дубликат запроса, THE Sfera System SHALL возвращать 200 OK с существующим сообщением
- Thoughts: Это продолжение идемпотентности. При повторном запросе должно вернуться то же сообщение.
- Testable: yes - property

**16.2** WHEN AI-агент создаёт сообщение, THE Sfera System SHALL автоматически устанавливать messageType в agent
- Thoughts: Это инвариант о типе сообщения. Для любого сообщения от агента, messageType должен быть agent.
- Testable: yes - property

**17.1** WHEN агент не отвечает на webhook, THE Agent Registry SHALL помечать агент как unhealthy после 3 неудачных попыток
- Thoughts: Это о подсчёте неудачных попыток. Можно симулировать 3 неудачных webhook и проверить что статус меняется на unhealthy.
- Testable: yes - property

**5.1** WHEN выполняется fork операция, THE Transaction Manager SHALL выполнять все шаги в одной транзакции
- Thoughts: Это о транзакционности. Можно проверить что либо все шаги fork выполнены, либо ничего не изменилось (atomicity).
- Testable: yes - property

**7.1** WHEN указан фильтр по автору, THE Sfera System SHALL возвращать только сообщения указанного пользователя
- Thoughts: Это о фильтрации. Для любого userId, все возвращённые сообщения должны иметь этот userId.
- Testable: yes - property

### Property Reflection

Reviewing all testable properties:
- **1.1-1.4**: Пагинация - все 4 свойства уникальны и проверяют разные аспекты
- **2.1-2.2**: Валидация - можно объединить в одно свойство о валидации и формате ошибок
- **9.6**: HMAC подпись - уникальное свойство
- **15.2-15.3**: Идемпотентность - можно объединить в одно свойство о идемпотентности
- **16.2**: Тип сообщения агента - уникальное свойство
- **17.1**: Health monitoring - уникальное свойство
- **5.1**: Транзакционность - уникальное свойство
- **7.1**: Фильтрация - уникальное свойство

### Properties

**Property 1: Pagination default limit**
*For any* Sfera with messages, when requesting the first page without limit parameter, the response should contain at most 50 messages
**Validates: Requirements 1.1**

**Property 2: Cursor-based pagination consistency**
*For any* Sfera with messages, when paginating through all pages using cursors, all messages should be returned exactly once without duplicates or gaps
**Validates: Requirements 1.2**

**Property 3: Limit parameter bounds**
*For any* pagination request with limit parameter, if limit is between 1 and 100, the response should contain at most that many messages; if limit is outside this range, the request should be rejected with 400 error
**Validates: Requirements 1.3**

**Property 4: End of pagination indicator**
*For any* Sfera, when the last page of messages is reached, hasMore should be false and nextCursor should be null
**Validates: Requirements 1.4**

**Property 5: Validation and error response**
*For any* invalid API request, the system should return 400 status code with error details describing which fields failed validation
**Validates: Requirements 2.1, 2.2**

**Property 6: HMAC signature round-trip**
*For any* webhook payload and secret, signing the payload and then verifying the signature should always succeed
**Validates: Requirements 9.6**

**Property 7: Idempotency key uniqueness**
*For any* message creation request with idempotency key, sending the same request twice should result in only one message being created, and the second request should return the same message with 200 status
**Validates: Requirements 15.2, 15.3**

**Property 8: Agent message type invariant**
*For any* message created by an AI agent user, the messageType field should always be set to 'agent'
**Validates: Requirements 16.2**

**Property 9: Health status transition**
*For any* agent, after exactly 3 consecutive failed webhook deliveries, the healthStatus should transition from 'healthy' to 'unhealthy'
**Validates: Requirements 17.1**

**Property 10: Fork operation atomicity**
*For any* fork operation, either all steps complete successfully (new Sfera created, message copied, members copied, parent marked as forked) or no changes are persisted to the database
**Validates: Requirements 5.1**

**Property 11: Author filter correctness**
*For any* message query with userId filter, all returned messages should have userId matching the filter value
**Validates: Requirements 7.1**

**Property 12: Rate limit enforcement**
*For any* user making requests, when the rate limit is exceeded, the system should return 429 status with retry-after header, and subsequent requests within the window should also be rejected
**Validates: Requirements 3.2**

**Property 13: WebSocket event delivery**
*For any* new message created in a Sfera, all connected members of that Sfera should receive a WebSocket event containing the message data
**Validates: Requirements 13.1**

**Property 14: Webhook context completeness**
*For any* webhook sent to an agent, the payload should include the trigger message, Sfera details, and at least the most recent messages (up to 30) from the Sfera
**Validates: Requirements 14.1**

**Property 15: Priority ordering**
*For any* set of pending webhooks, high priority webhooks should be delivered before normal priority, and normal before low priority
**Validates: Requirements 18.4**


## API Endpoints

### Enhanced Message Endpoints

**GET /api/sfera/[id]/messages**
```typescript
Query Parameters:
- cursor?: string
- limit?: number (1-100, default 50)
- userId?: string (filter by author)
- messageType?: 'user' | 'agent' | 'system'
- hasAttachments?: boolean
- isForked?: boolean
- dateFrom?: ISO8601 string
- dateTo?: ISO8601 string
- search?: string (full-text search)

Response:
{
  messages: Message[],
  nextCursor?: string,
  hasMore: boolean,
  total: number
}
```

**POST /api/sfera/[id]/messages**
```typescript
Headers:
- Authorization: Bearer <token>
- X-Idempotency-Key?: string

Body:
{
  content?: string,
  parentMessageId?: string,
  attachments?: Array<{
    name: string,
    url: string,
    contentType: string
  }>
}

Response:
{
  message: Message,
  agentWebhooks?: Array<{
    agentId: string,
    webhookId: string,
    status: 'queued' | 'sent' | 'failed'
  }>
}
```

**PATCH /api/sfera/[id]/messages/[messageId]**
```typescript
Headers:
- Authorization: Bearer <token>
- X-Idempotency-Key?: string

Body:
{
  content?: string,
  isGenerating?: boolean,
  toolResults?: Array<{
    toolName: string,
    result: any
  }>
}

Response:
{
  message: Message
}
```

### Agent Registry Endpoints

**POST /api/agents**
```typescript
Headers:
- Authorization: Bearer <admin-token>

Body:
{
  name: string,
  email: string,
  webhookUrl: string,
  webhookSecret: string,
  metadata?: {
    model?: string,
    temperature?: number,
    maxTokens?: number
  }
}

Response:
{
  agent: Agent,
  authToken: string
}
```

**GET /api/agents**
```typescript
Query Parameters:
- includeUnhealthy?: boolean (default false)

Response:
{
  agents: Array<{
    id: string,
    name: string,
    email: string,
    healthStatus: 'healthy' | 'unhealthy' | 'unknown',
    lastHealthCheck?: string,
    failedWebhookCount: number
  }>
}
```

**PATCH /api/agents/[id]**
```typescript
Headers:
- Authorization: Bearer <admin-token>

Body:
{
  webhookUrl?: string,
  webhookSecret?: string,
  metadata?: object
}

Response:
{
  agent: Agent
}
```

**DELETE /api/agents/[id]**
```typescript
Headers:
- Authorization: Bearer <admin-token>

Response:
{
  success: boolean
}
```

### Webhook Payload Format

**POST <agent.webhookUrl>**
```typescript
Headers:
- X-Webhook-Signature: HMAC-SHA256 signature
- X-Idempotency-Key: unique key
- X-Priority: 'high' | 'normal' | 'low'

Body:
{
  event: 'agent.mentioned',
  idempotencyKey: string,
  priority: 'high' | 'normal' | 'low',
  timestamp: string,
  sfera: {
    id: string,
    title: string,
    description: string,
    visibility: 'public' | 'private' | 'dao'
  },
  triggerMessage: {
    id: string,
    content: string,
    userId: string,
    userEmail: string,
    parentMessageId?: string,
    createdAt: string
  },
  context: {
    recentMessages: Array<{
      id: string,
      content: string,
      userId: string,
      userEmail: string,
      messageType: 'user' | 'agent' | 'system',
      createdAt: string
    }>,
    threadMessages?: Array<{...}>,
    artifacts?: Array<{
      documentId: string,
      type: string,
      url: string
    }>
  },
  agent: {
    id: string,
    name: string
  }
}
```

## Implementation Details

### Webhook Signature Verification

```typescript
// lib/webhooks/signature.ts
import crypto from 'crypto';

export function signWebhookPayload(
  payload: object,
  secret: string
): string {
  const payloadString = JSON.stringify(payload);
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(payloadString);
  return hmac.digest('hex');
}

export function verifyWebhookSignature(
  payload: object,
  signature: string,
  secret: string
): boolean {
  const expectedSignature = signWebhookPayload(payload, secret);
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}
```

### Idempotency Implementation

```typescript
// lib/services/idempotency.ts
export class IdempotencyService {
  async checkAndStore(
    key: string,
    operation: () => Promise<Message>
  ): Promise<Message> {
    // Check if key exists
    const existing = await db
      .select()
      .from(idempotencyLog)
      .where(eq(idempotencyLog.key, key))
      .limit(1);
    
    if (existing.length > 0) {
      // Check if expired
      if (existing[0].expiresAt < new Date()) {
        // Expired, delete and allow new operation
        await db
          .delete(idempotencyLog)
          .where(eq(idempotencyLog.key, key));
      } else {
        // Return existing message
        const [message] = await db
          .select()
          .from(sferaMessage)
          .where(eq(sferaMessage.id, existing[0].messageId))
          .limit(1);
        return message;
      }
    }
    
    // Execute operation
    const message = await operation();
    
    // Store idempotency key
    await db.insert(idempotencyLog).values({
      key,
      messageId: message.id,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
    });
    
    return message;
  }
}
```

### Webhook Retry Logic

```typescript
// lib/webhooks/retry.ts
export async function sendWebhookWithRetry(
  url: string,
  payload: object,
  signature: string,
  maxRetries: number = 3
): Promise<{ success: boolean; error?: string }> {
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Signature': signature,
          'X-Idempotency-Key': payload.idempotencyKey,
          'X-Priority': payload.priority
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(30000) // 30s timeout
      });
      
      if (response.ok) {
        return { success: true };
      }
      
      lastError = new Error(`HTTP ${response.status}: ${response.statusText}`);
    } catch (error) {
      lastError = error as Error;
    }
    
    // Exponential backoff: 1s, 2s, 4s
    if (attempt < maxRetries - 1) {
      await new Promise(resolve => 
        setTimeout(resolve, Math.pow(2, attempt) * 1000)
      );
    }
  }
  
  return {
    success: false,
    error: lastError?.message || 'Unknown error'
  };
}
```

### Priority Queue for Webhooks

```typescript
// lib/webhooks/queue.ts
export class WebhookQueue {
  private highPriority: WebhookJob[] = [];
  private normalPriority: WebhookJob[] = [];
  private lowPriority: WebhookJob[] = [];
  private processing = false;
  
  async enqueue(job: WebhookJob): Promise<void> {
    switch (job.priority) {
      case 'high':
        this.highPriority.push(job);
        break;
      case 'normal':
        this.normalPriority.push(job);
        break;
      case 'low':
        this.lowPriority.push(job);
        break;
    }
    
    if (!this.processing) {
      this.processQueue();
    }
  }
  
  private async processQueue(): Promise<void> {
    this.processing = true;
    
    while (
      this.highPriority.length > 0 ||
      this.normalPriority.length > 0 ||
      this.lowPriority.length > 0
    ) {
      let job: WebhookJob | undefined;
      
      if (this.highPriority.length > 0) {
        job = this.highPriority.shift();
      } else if (this.normalPriority.length > 0) {
        job = this.normalPriority.shift();
      } else {
        job = this.lowPriority.shift();
      }
      
      if (job) {
        await this.processJob(job);
      }
    }
    
    this.processing = false;
  }
  
  private async processJob(job: WebhookJob): Promise<void> {
    // Implementation
  }
}
```

### Database Indexes

```sql
-- Performance indexes
CREATE INDEX CONCURRENTLY idx_sfera_message_sfera_created 
  ON sfera_message(sfera_id, created_at DESC);

CREATE INDEX CONCURRENTLY idx_sfera_message_type 
  ON sfera_message(message_type);

CREATE INDEX CONCURRENTLY idx_sfera_message_user 
  ON sfera_message(user_id);

CREATE INDEX CONCURRENTLY idx_sfera_message_idempotency 
  ON sfera_message(idempotency_key) 
  WHERE idempotency_key IS NOT NULL;

-- Full-text search index
CREATE INDEX CONCURRENTLY idx_sfera_message_content_fts 
  ON sfera_message 
  USING gin(to_tsvector('russian', content));

-- Agent registry indexes
CREATE INDEX CONCURRENTLY idx_agent_registry_health 
  ON agent_registry(health_status);

CREATE INDEX CONCURRENTLY idx_agent_registry_user 
  ON agent_registry(user_id);

-- Idempotency log index
CREATE INDEX CONCURRENTLY idx_idempotency_log_expires 
  ON idempotency_log(expires_at);
```

## Security Considerations

1. **Webhook Signature Verification**: All webhooks must be signed with HMAC-SHA256
2. **Rate Limiting**: Separate limits for users, agents, and admins
3. **Token Rotation**: Agent auth tokens should be rotatable
4. **Input Validation**: All inputs validated with Zod schemas
5. **SQL Injection Prevention**: Use parameterized queries via Drizzle ORM
6. **Sensitive Data**: Exclude webhook secrets and auth tokens from logs
7. **CORS**: Restrict API access to authorized origins
8. **Idempotency**: Prevent duplicate operations with idempotency keys

## Performance Optimizations

1. **Database Connection Pooling**: Use pgBouncer or Drizzle connection pool
2. **Redis Caching**: Cache frequently accessed data (agent configs, permissions)
3. **Cursor-based Pagination**: More efficient than offset-based for large datasets
4. **Selective Field Loading**: Only load requested fields
5. **Batch Operations**: Group multiple DB operations in transactions
6. **Index Usage**: Ensure all queries use appropriate indexes
7. **WebSocket Connection Management**: Limit connections per user
8. **Webhook Queue**: Process webhooks asynchronously with priority queue

## Monitoring and Observability

### Metrics to Track

- API request latency (p50, p95, p99)
- Rate limit hits per endpoint
- Webhook delivery success rate
- Webhook delivery latency
- Agent health status changes
- Database query performance
- WebSocket connection count
- Message creation rate
- Idempotency key collision rate

### Logging Strategy

```typescript
// Structured logging format
{
  timestamp: ISO8601,
  level: 'info' | 'warn' | 'error',
  service: 'sfera-api',
  operation: string,
  userId?: string,
  sferaId?: string,
  agentId?: string,
  duration?: number,
  error?: {
    message: string,
    stack: string,
    code: string
  },
  metadata?: object
}
```

### Health Check Endpoint

**GET /api/health**
```typescript
Response:
{
  status: 'healthy' | 'degraded' | 'unhealthy',
  timestamp: string,
  services: {
    database: 'up' | 'down',
    redis: 'up' | 'down',
    websocket: 'up' | 'down'
  },
  agents: {
    total: number,
    healthy: number,
    unhealthy: number
  }
}
```

