import type { InferSelectModel } from "drizzle-orm";
import { sql } from "drizzle-orm";
import {
  boolean,
  foreignKey,
  index,
  integer,
  json,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import type { AppUsage } from "../usage";

export const user = pgTable("User", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  email: varchar("email", { length: 64 }).notNull(),
  password: varchar("password", { length: 64 }),

  // Profile fields
  name: varchar("name", { length: 255 }), // Full name like "Иван Петров"
  displayName: varchar("displayName", { length: 100 }), // Public display name like "@ivan"
  avatarUrl: text("avatarUrl"), // Profile avatar URL
  bio: text("bio"), // User bio/description

  // MCP settings
  mcpEnabled: boolean("mcpEnabled").notNull().default(false), // MCP access flag
  mcpQuota: jsonb("mcpQuota").$type<{
    requestsPerHour: number;
    requestsPerDay: number;
    tier: "free" | "pro" | "enterprise";
  }>(), // MCP rate limit quotas

  // User preferences
  settings: jsonb("settings").$type<{
    autoArchive?: boolean;
  }>().default({}),

  // Timestamps
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
});

export type User = InferSelectModel<typeof user>;

export const chat = pgTable("Chat", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  createdAt: timestamp("createdAt").notNull(),
  title: text("title").notNull(),
  userId: uuid("userId")
    .notNull()
    .references(() => user.id),
  visibility: varchar("visibility", { enum: ["public", "private"] })
    .notNull()
    .default("private"),
  lastContext: jsonb("lastContext").$type<AppUsage | null>(),

  // AVRORA: Group Chat Support
  chatType: varchar("chatType", { enum: ["personal", "group"] })
    .notNull()
    .default("personal"),
});

export type Chat = InferSelectModel<typeof chat>;

// DEPRECATED: The following schema is deprecated and will be removed in the future.
// Read the migration guide at https://chat-sdk.dev/docs/migration-guides/message-parts
export const messageDeprecated = pgTable("Message", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  chatId: uuid("chatId")
    .notNull()
    .references(() => chat.id),
  role: varchar("role").notNull(),
  content: json("content").notNull(),
  createdAt: timestamp("createdAt").notNull(),
});

export type MessageDeprecated = InferSelectModel<typeof messageDeprecated>;

export const message = pgTable("Message_v2", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  chatId: uuid("chatId")
    .notNull()
    .references(() => chat.id),
  role: varchar("role").notNull(),
  // AVRORA: Author tracking for group chats
  userId: uuid("userId").references(() => user.id),
  parts: json("parts").notNull(),
  attachments: json("attachments").notNull(),
  createdAt: timestamp("createdAt").notNull(),
});

export type DBMessage = InferSelectModel<typeof message>;

export const document = pgTable(
  "Document",
  {
    id: uuid("id").notNull().defaultRandom(),
    createdAt: timestamp("createdAt").notNull(),
    title: text("title").notNull(),
    content: text("content"),
    kind: varchar("text", {
      enum: ["text", "code", "image", "sheet", "mini-app", "chart", "game"],
    })
      .notNull()
      .default("text"),
    userId: uuid("userId")
      .notNull()
      .references(() => user.id),
  },
  (table) => {
    return {
      pk: primaryKey({ columns: [table.id, table.createdAt] }),
    };
  }
);

export type Document = InferSelectModel<typeof document>;

export const suggestion = pgTable(
  "Suggestion",
  {
    id: uuid("id").notNull().defaultRandom(),
    documentId: uuid("documentId").notNull(),
    documentCreatedAt: timestamp("documentCreatedAt").notNull(),
    originalText: text("originalText").notNull(),
    suggestedText: text("suggestedText").notNull(),
    description: text("description"),
    isResolved: boolean("isResolved").notNull().default(false),
    userId: uuid("userId")
      .notNull()
      .references(() => user.id),
    createdAt: timestamp("createdAt").notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.id] }),
    documentRef: foreignKey({
      columns: [table.documentId, table.documentCreatedAt],
      foreignColumns: [document.id, document.createdAt],
    }),
  })
);

export type Suggestion = InferSelectModel<typeof suggestion>;

export const stream = pgTable(
  "Stream",
  {
    id: uuid("id").notNull().defaultRandom(),
    chatId: uuid("chatId").notNull(),
    createdAt: timestamp("createdAt").notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.id] }),
    chatRef: foreignKey({
      columns: [table.chatId],
      foreignColumns: [chat.id],
    }),
  })
);

export type Stream = InferSelectModel<typeof stream>;

// ============ AVRORA: Additional Tables for Group Chats & Collaboration ============

export const chatMember = pgTable(
  "ChatMember",
  {
    chatId: uuid("chatId")
      .notNull()
      .references(() => chat.id),
    userId: uuid("userId")
      .notNull()
      .references(() => user.id),
    role: varchar("role", { enum: ["admin", "member"] })
      .notNull()
      .default("member"),
    joinedAt: timestamp("joinedAt").notNull(),
    lastReadAt: timestamp("lastReadAt"),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.chatId, table.userId] }),
  })
);

export type ChatMember = InferSelectModel<typeof chatMember>;

export const magicToken = pgTable("MagicToken", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  token: varchar("token", { length: 64 }).notNull().unique(),
  email: varchar("email", { length: 64 }).notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
  used: boolean("used").notNull().default(false),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
});

export type MagicToken = InferSelectModel<typeof magicToken>;

export const messageMention = pgTable(
  "MessageMention",
  {
    messageId: uuid("messageId")
      .notNull()
      .references(() => message.id),
    mentionedUserId: uuid("mentionedUserId").references(() => user.id),
    isAiMention: boolean("isAiMention").notNull().default(false),
    createdAt: timestamp("createdAt").notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.messageId, table.mentionedUserId] }),
  })
);

export type MessageMention = InferSelectModel<typeof messageMention>;

// ============ AVRORA: Sfera (Collaborative Discussion Spaces) ============

export const sfera = pgTable("Sfera", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  title: text("title").notNull(),
  description: text("description"),
  ownerId: uuid("ownerId")
    .notNull()
    .references(() => user.id),
  visibility: varchar("visibility", {
    enum: ["public", "private", "dao"],
  })
    .notNull()
    .default("private"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
});

export type Sfera = InferSelectModel<typeof sfera>;

export const sferaMember = pgTable(
  "SferaMember",
  {
    sferaId: uuid("sferaId")
      .notNull()
      .references(() => sfera.id, { onDelete: "cascade" }),
    userId: uuid("userId")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    role: varchar("role", { enum: ["owner", "admin", "member", "viewer"] })
      .notNull()
      .default("member"),
    joinedAt: timestamp("joinedAt").notNull().defaultNow(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.sferaId, table.userId] }),
  })
);

export type SferaMember = InferSelectModel<typeof sferaMember>;

export const sferaMessage = pgTable(
  "SferaMessage",
  {
    id: uuid("id").primaryKey().notNull().defaultRandom(),
    sferaId: uuid("sferaId")
      .notNull()
      .references(() => sfera.id, { onDelete: "cascade" }),
    userId: uuid("userId")
      .notNull()
      .references(() => user.id),
    content: text("content").notNull(),

    // Message type (user, agent, system)
    messageType: varchar("messageType", { enum: ["user", "agent", "system"] })
      .notNull()
      .default("user"),

    // Idempotency key for duplicate prevention
    idempotencyKey: varchar("idempotencyKey", { length: 255 }),

    // Attachments (photos, files, etc.)
    attachments: json("attachments")
      .$type<
        Array<{
          name: string;
          url: string;
          contentType: string;
        }>
      >()
      .notNull()
      .default([]),

    // AI Tool execution results (for generative content)
    toolResults: json("toolResults")
      .$type<
        Array<{
          toolName: string;
          success: boolean;
          error?: string;
          imageUrl?: string;
          audioUrl?: string;
          videoUrl?: string;
          prompt?: string;
          duration?: number;
          aspectRatio?: string;
          message?: string;
          [key: string]: unknown;
        }>
      >()
      .notNull()
      .default([]),

    // TODO: Determine if nested threads are needed (replies to messages within Sfera)
    // If yes, this field allows threading like Reddit/Slack
    // If no, all messages are root-level only
    parentMessageId: uuid("parentMessageId"),

    // Fork tracking
    isForked: boolean("isForked").notNull().default(false),
    forkCount: integer("forkCount").notNull().default(0),

    // AI generation status
    isGenerating: boolean("isGenerating").notNull().default(false),

    createdAt: timestamp("createdAt").notNull().defaultNow(),
    updatedAt: timestamp("updatedAt").notNull().defaultNow(),
  },
  (table) => ({
    // Composite index for pagination
    sferaIdCreatedAtIdx: index("sfera_message_sfera_id_created_at_idx").on(
      table.sferaId,
      table.createdAt
    ),
    // Index for filtering by message type
    messageTypeIdx: index("sfera_message_type_idx").on(table.messageType),
    // Index for filtering by author
    userIdIdx: index("sfera_message_user_id_idx").on(table.userId),
    // Index for idempotency key lookups
    idempotencyKeyIdx: index("sfera_message_idempotency_key_idx").on(
      table.idempotencyKey
    ),
    // GIN index for full-text search on content (Russian language)
    contentFullTextIdx: index("sfera_message_content_fulltext_idx").using(
      "gin",
      sql`to_tsvector('russian', ${table.content})`
    ),
  })
);

export type SferaMessage = InferSelectModel<typeof sferaMessage>;

export const sferaForkedSfera = pgTable("SferaForkedSfera", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  parentSferaId: uuid("parentSferaId")
    .notNull()
    .references(() => sfera.id, { onDelete: "cascade" }),
  parentMessageId: uuid("parentMessageId")
    .notNull()
    .references(() => sferaMessage.id, { onDelete: "cascade" }),

  // Reference to the forked Sfera (new Sfera created from message)
  forkedSferaId: uuid("forkedSferaId")
    .notNull()
    .unique()
    .references(() => sfera.id, { onDelete: "cascade" }),

  createdById: uuid("createdById")
    .notNull()
    .references(() => user.id),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
});

export type SferaForkedSfera = InferSelectModel<typeof sferaForkedSfera>;

// ============ AVRORA: AI Tools Execution Tracking ============

export const toolExecution = pgTable("ToolExecution", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  toolName: varchar("toolName", { length: 255 }).notNull(),
  sferaId: uuid("sferaId").references(() => sfera.id, { onDelete: "cascade" }),
  chatId: uuid("chatId").references(() => chat.id, { onDelete: "cascade" }),
  userId: uuid("userId")
    .notNull()
    .references(() => user.id),
  input: jsonb("input").notNull(),
  output: jsonb("output"),
  status: varchar("status", {
    enum: ["pending", "success", "error"],
  })
    .notNull()
    .default("pending"),
  errorMessage: text("errorMessage"),
  executedAt: timestamp("executedAt").notNull().defaultNow(),
});

export type ToolExecution = InferSelectModel<typeof toolExecution>;

// ============ AVRORA: Sfera Artifacts (связь артефактов с Sfera) ============

export const sferaArtifact = pgTable(
  "SferaArtifact",
  {
    sferaId: uuid("sferaId")
      .notNull()
      .references(() => sfera.id, { onDelete: "cascade" }),
    documentId: uuid("documentId").notNull(),
    documentCreatedAt: timestamp("documentCreatedAt").notNull(),
    createdByMessageId: uuid("createdByMessageId")
      .notNull()
      .references(() => sferaMessage.id, { onDelete: "cascade" }),
    createdAt: timestamp("createdAt").notNull().defaultNow(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.sferaId, table.documentId] }),
    documentRef: foreignKey({
      columns: [table.documentId, table.documentCreatedAt],
      foreignColumns: [document.id, document.createdAt],
    }),
  })
);

export type SferaArtifact = InferSelectModel<typeof sferaArtifact>;

// AI Usage Log - Track AI requests for billing and monitoring
export const aiUsageLog = pgTable("AiUsageLog", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  userId: uuid("userId")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  sferaId: uuid("sferaId").references(() => sfera.id, { onDelete: "cascade" }),
  messageId: uuid("messageId").references(() => sferaMessage.id, {
    onDelete: "set null",
  }),

  // Model information
  modelUsed: varchar("modelUsed", { length: 100 }).notNull(),
  provider: varchar("provider", { length: 50 }).notNull().default("openai"),

  // Token usage
  inputTokens: integer("inputTokens").notNull().default(0),
  outputTokens: integer("outputTokens").notNull().default(0),
  totalTokens: integer("totalTokens").notNull().default(0),

  // Tool information
  toolName: varchar("toolName", { length: 100 }),
  toolParameters: json("toolParameters"),
  toolExecutionTimeMs: integer("toolExecutionTimeMs"),

  // Cost tracking (in USD)
  estimatedCost: integer("estimatedCost").notNull().default(0), // Stored as cents

  // Status
  status: varchar("status", { enum: ["success", "error", "rate_limited"] })
    .notNull()
    .default("success"),
  errorMessage: text("errorMessage"),

  // Metadata
  contextSize: integer("contextSize").notNull().default(0), // Number of messages in context
  createdAt: timestamp("createdAt").notNull().defaultNow(),
});

export type AiUsageLog = InferSelectModel<typeof aiUsageLog>;

// ============ MCP API Keys & Authentication ============

export const apiKey = pgTable("ApiKey", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  userId: uuid("userId")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),

  // Key identification
  name: varchar("name", { length: 255 }).notNull(), // "Production", "Development", etc.
  keyHash: varchar("keyHash", { length: 255 }).notNull().unique(), // bcrypt hash of the key
  prefix: varchar("prefix", { length: 32 }).notNull(), // "avr_live_abcd" for identification

  // Permissions
  permissions: jsonb("permissions")
    .$type<{
      resources: boolean; // Read access to Sferas
      tools: boolean; // Execute actions (send messages, etc.)
      admin: boolean; // Administrative operations
    }>()
    .notNull()
    .default({ resources: true, tools: false, admin: false }),

  // Usage tracking
  lastUsedAt: timestamp("lastUsedAt"),
  lastUsedIp: varchar("lastUsedIp", { length: 45 }), // IPv6 support
  usageCount: integer("usageCount").notNull().default(0),

  // Lifecycle
  expiresAt: timestamp("expiresAt"), // Optional expiration
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  revokedAt: timestamp("revokedAt"), // Soft delete
});

export type ApiKey = InferSelectModel<typeof apiKey>;

// ============ AVRORA: Agent Registry for Webhook-based AI Agents ============

export const agentRegistry = pgTable("AgentRegistry", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  name: varchar("name", { length: 255 }).notNull(),
  userId: uuid("userId")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  email: varchar("email", { length: 255 }).notNull(),
  webhookUrl: text("webhookUrl").notNull(),
  webhookSecret: text("webhookSecret").notNull(),
  authToken: text("authToken").notNull(),
  metadata: jsonb("metadata").$type<{
    model?: string;
    temperature?: number;
    maxTokens?: number;
  }>(),
  healthStatus: varchar("healthStatus", { length: 20 })
    .$type<"healthy" | "unhealthy" | "unknown">()
    .notNull()
    .default("unknown"),
  lastHealthCheck: timestamp("lastHealthCheck"),
  failedWebhookCount: integer("failedWebhookCount").notNull().default(0),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
});

export type AgentRegistry = InferSelectModel<typeof agentRegistry>;

// ============ AVRORA: Idempotency Log for Duplicate Prevention ============

export const idempotencyLog = pgTable(
  "IdempotencyLog",
  {
    key: varchar("key", { length: 255 }).primaryKey().notNull(),
    messageId: uuid("messageId")
      .notNull()
      .references(() => sferaMessage.id, { onDelete: "cascade" }),
    createdAt: timestamp("createdAt").notNull().defaultNow(),
    expiresAt: timestamp("expiresAt").notNull(),
  },
  (table) => ({
    // Index for cleanup queries
    expiresAtIdx: index("idempotency_log_expires_at_idx").on(table.expiresAt),
  })
);

export type IdempotencyLog = InferSelectModel<typeof idempotencyLog>;

// Audit log for MCP API calls
export const mcpAuditLog = pgTable("McpAuditLog", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  apiKeyId: uuid("apiKeyId")
    .notNull()
    .references(() => apiKey.id, { onDelete: "cascade" }),
  userId: uuid("userId")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),

  // Request details
  method: varchar("method", { length: 100 }).notNull(), // JSON-RPC method name
  resourceUri: text("resourceUri"), // sfera://list, sfera://123/messages, etc.
  toolName: varchar("toolName", { length: 100 }), // Tool name if applicable
  params: jsonb("params"), // Request parameters

  // Response details
  statusCode: integer("statusCode").notNull(), // HTTP status code
  responseTimeMs: integer("responseTimeMs").notNull(), // Response time in milliseconds
  errorMessage: text("errorMessage"), // Error message if failed

  // Metadata
  ipAddress: varchar("ipAddress", { length: 45 }).notNull(),
  userAgent: text("userAgent"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
});

export type McpAuditLog = InferSelectModel<typeof mcpAuditLog>;
