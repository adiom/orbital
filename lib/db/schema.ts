import type { InferSelectModel } from "drizzle-orm";
import {
  boolean,
  foreignKey,
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

export const sferaMessage = pgTable("SferaMessage", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  sferaId: uuid("sferaId")
    .notNull()
    .references(() => sfera.id, { onDelete: "cascade" }),
  userId: uuid("userId")
    .notNull()
    .references(() => user.id),
  content: text("content").notNull(),

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

  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
});

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
