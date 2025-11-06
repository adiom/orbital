import type { InferSelectModel } from "drizzle-orm";
import {
  boolean,
  foreignKey,
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

// ============ AVRORA: Area Support (declared before Chat) ============

export const area = pgTable(
  "Area",
  {
    id: uuid("id").primaryKey().notNull().defaultRandom(),
    createdAt: timestamp("createdAt").notNull(),
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

    // DAO governance
    daoTokenAddress: text("daoTokenAddress"),

    // Fork/Merge support - self-reference
    parentAreaId: uuid("parentAreaId"),
    inheritedSummary: text("inheritedSummary"),
    forkedAt: timestamp("forkedAt"),
    mergeStatus: varchar("mergeStatus", {
      enum: ["independent", "synced", "diverged", "merge_proposed"],
    }).default("independent"),
  },
  (table) => ({
    // Self-referencing foreign key
    parentRef: foreignKey({
      columns: [table.parentAreaId],
      foreignColumns: [table.id],
    }),
  })
);

export type Area = InferSelectModel<typeof area>;

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

  // AVRORA: Area & Group Chat Support
  areaId: uuid("areaId").references(() => area.id),
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

// DEPRECATED: The following schema is deprecated and will be removed in the future.
// Read the migration guide at https://chat-sdk.dev/docs/migration-guides/message-parts
export const voteDeprecated = pgTable(
  "Vote",
  {
    chatId: uuid("chatId")
      .notNull()
      .references(() => chat.id),
    messageId: uuid("messageId")
      .notNull()
      .references(() => messageDeprecated.id),
    isUpvoted: boolean("isUpvoted").notNull(),
  },
  (table) => {
    return {
      pk: primaryKey({ columns: [table.chatId, table.messageId] }),
    };
  }
);

export type VoteDeprecated = InferSelectModel<typeof voteDeprecated>;

export const vote = pgTable(
  "Vote_v2",
  {
    chatId: uuid("chatId")
      .notNull()
      .references(() => chat.id),
    messageId: uuid("messageId")
      .notNull()
      .references(() => message.id),
    isUpvoted: boolean("isUpvoted").notNull(),
  },
  (table) => {
    return {
      pk: primaryKey({ columns: [table.chatId, table.messageId] }),
    };
  }
);

export type Vote = InferSelectModel<typeof vote>;

export const document = pgTable(
  "Document",
  {
    id: uuid("id").notNull().defaultRandom(),
    createdAt: timestamp("createdAt").notNull(),
    title: text("title").notNull(),
    content: text("content"),
    kind: varchar("text", { enum: ["text", "code", "image", "sheet"] })
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

export const areaMember = pgTable(
  "AreaMember",
  {
    areaId: uuid("areaId")
      .notNull()
      .references(() => area.id),
    userId: uuid("userId")
      .notNull()
      .references(() => user.id),
    role: varchar("role", { enum: ["owner", "admin", "member", "viewer"] })
      .notNull()
      .default("member"),
    joinedAt: timestamp("joinedAt").notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.areaId, table.userId] }),
  })
);

export type AreaMember = InferSelectModel<typeof areaMember>;

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

export const areaDocument = pgTable(
  "AreaDocument",
  {
    areaId: uuid("areaId")
      .notNull()
      .references(() => area.id),
    documentId: uuid("documentId").notNull(),
    documentCreatedAt: timestamp("documentCreatedAt").notNull(),
    addedAt: timestamp("addedAt").notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.areaId, table.documentId] }),
    documentRef: foreignKey({
      columns: [table.documentId, table.documentCreatedAt],
      foreignColumns: [document.id, document.createdAt],
    }),
  })
);

export type AreaDocument = InferSelectModel<typeof areaDocument>;

export const areaMergeProposal = pgTable("AreaMergeProposal", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  sourceAreaId: uuid("sourceAreaId")
    .notNull()
    .references(() => area.id),
  targetAreaId: uuid("targetAreaId")
    .notNull()
    .references(() => area.id),
  createdBy: uuid("createdBy")
    .notNull()
    .references(() => user.id),
  createdAt: timestamp("createdAt").notNull(),

  title: text("title").notNull(),
  description: text("description"),
  changesSummary: text("changesSummary"),

  status: varchar("status", {
    enum: ["open", "approved", "rejected", "merged"],
  })
    .notNull()
    .default("open"),

  reviewedBy: uuid("reviewedBy").references(() => user.id),
  reviewedAt: timestamp("reviewedAt"),
});

export type AreaMergeProposal = InferSelectModel<typeof areaMergeProposal>;

export const messageMention = pgTable("MessageMention", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  messageId: uuid("messageId")
    .notNull()
    .references(() => message.id),
  mentionedUserId: uuid("mentionedUserId").references(() => user.id),
  mentionType: varchar("mentionType", { enum: ["user", "avrora"] }).notNull(),
  mentionText: text("mentionText").notNull(),
  createdAt: timestamp("createdAt").notNull(),
});

export type MessageMention = InferSelectModel<typeof messageMention>;
