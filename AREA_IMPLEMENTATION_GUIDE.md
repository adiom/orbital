# Area Feature Implementation Guide for Avrora

This guide provides a complete implementation blueprint for the Area feature based on the working implementation in the current Avrora codebase. Use this guide to implement Areas in another Avrora project.

## Executive Summary

**Area** is a collaborative workspace feature that extends Avrora's chat capabilities with:
- Persistent knowledge spaces with fork/merge workflows (Git-inspired)
- Multi-agent AI hierarchy (lightweight agents → supervisors → GPT-5)
- Group chat with @avrora mention detection
- Role-based access control (owner, admin, member, viewer)
- DAO governance support (token-based voting)
- Document management and semantic search (RAG)
- Real-time collaboration via WebSocket

## Phase 1: Database Schema Implementation

### Step 1.1: Core Area Table

Add to `lib/db/schema.ts`:

```typescript
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
```

### Step 1.2: Area Membership

```typescript
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
```

### Step 1.3: Update Chat Table for Area Support

Modify existing `chat` table:

```typescript
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

  // ADD THESE FIELDS:
  areaId: uuid("areaId").references(() => area.id),
  chatType: varchar("chatType", { enum: ["personal", "group"] })
    .notNull()
    .default("personal"),
});
```

### Step 1.4: Chat Membership for Group Chats

```typescript
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
```

### Step 1.5: Update Message Table for Author Tracking

Modify existing `message` table:

```typescript
export const message = pgTable("Message_v2", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  chatId: uuid("chatId")
    .notNull()
    .references(() => chat.id),
  role: varchar("role").notNull(),

  // ADD THIS FIELD:
  userId: uuid("userId").references(() => user.id),

  parts: json("parts").notNull(),
  attachments: json("attachments").notNull(),
  createdAt: timestamp("createdAt").notNull(),
});
```

### Step 1.6: Mention Tracking

```typescript
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
```

### Step 1.7: Area Documents

```typescript
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
```

### Step 1.8: Merge Proposals

```typescript
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
```

### Step 1.9: Generate and Run Migration

```bash
# Generate migration file
pnpm db:generate

# Review the generated SQL in drizzle/migrations/
# Then apply migration
pnpm db:migrate
```

## Phase 2: Mention Detection System

### Step 2.1: Create Mention Parser

Create `lib/mentions/parser.ts`:

```typescript
export type Mention = {
  type: "user" | "avrora";
  userId?: string;
  username?: string;
  start: number;
  end: number;
  text: string;
};

// Regex constants for performance
const MENTION_REGEX = /@([\w-]+)/g;
const AVRORA_MENTION_REGEX = /@avrora\b/i;

/**
 * Parse mentions from message text
 * Supports:
 * - @avrora - AI assistant mention
 * - @username - user mention (future)
 */
export function parseMentions(text: string): Mention[] {
  const mentions: Mention[] = [];

  const mentionRegex = new RegExp(MENTION_REGEX.source, MENTION_REGEX.flags);
  let match: RegExpExecArray | null = mentionRegex.exec(text);

  while (match !== null) {
    const username = match[1];
    const start = match.index;
    const end = start + match[0].length;

    if (username.toLowerCase() === "avrora") {
      mentions.push({
        type: "avrora",
        username: "avrora",
        start,
        end,
        text: match[0],
      });
    } else {
      mentions.push({
        type: "user",
        username,
        start,
        end,
        text: match[0],
      });
    }

    match = mentionRegex.exec(text);
  }

  return mentions;
}

/**
 * Check if message contains Avrora mention
 */
export function hasAvroraMention(text: string): boolean {
  return AVRORA_MENTION_REGEX.test(text);
}

/**
 * Extract user mentions from text
 */
export function extractUserMentions(text: string): string[] {
  const mentions = parseMentions(text);
  return mentions
    .filter((m) => m.type === "user" && m.username)
    .map((m) => m.username as string);
}

/**
 * Remove mention from text (useful for intent detection)
 */
export function removeMentions(text: string): string {
  return text.replace(/@[\w-]+/g, "").trim();
}
```

### Step 2.2: Create Intent Detection

Create `lib/mentions/intent-detection.ts`:

```typescript
// Regex patterns for performance
const QUESTION_PATTERNS = [
  /^(what|when|where|who|why|how|which|whose|whom)\b/i,
  /\?$/,
  /можешь|можете|как|что|когда|где|почему|зачем/i,
];

const COMMAND_PATTERNS = [
  /^(create|make|generate|build|write|add|remove|delete|update|change|modify)\b/i,
  /^(создай|сделай|напиши|добавь|удали|измени|обнови)\b/i,
];

const GREETING_PATTERNS = [
  /^(hi|hello|hey|greetings|good morning|good afternoon|good evening)\b/i,
  /^(привет|здравствуй|добрый день|добрый вечер|доброе утро)\b/i,
];

export type IntentType = "question" | "command" | "greeting" | "statement";

export function detectIntent(text: string): IntentType {
  const cleanText = text.trim();

  // Check for questions
  for (const pattern of QUESTION_PATTERNS) {
    if (pattern.test(cleanText)) {
      return "question";
    }
  }

  // Check for commands
  for (const pattern of COMMAND_PATTERNS) {
    if (pattern.test(cleanText)) {
      return "command";
    }
  }

  // Check for greetings
  for (const pattern of GREETING_PATTERNS) {
    if (pattern.test(cleanText)) {
      return "greeting";
    }
  }

  return "statement";
}
```

## Phase 3: Group Chat Logic in Chat API

### Step 3.1: Update Chat API Route

Modify `app/(chat)/api/chat/route.ts`:

```typescript
import { hasAvroraMention } from "@/lib/mentions/parser";

// Add regex constant at top of file
const AVRORA_MENTION_REGEX = /@avrora|@аврора/i;

// Inside POST handler, after fetching chat and before streaming:

export async function POST(request: Request) {
  // ... existing code to get chat, user, messages ...

  // GROUP CHAT LOGIC - Check for @avrora mention
  if (chat?.chatType === "group") {
    // Extract text from the last user message
    const lastUserMessage = uiMessages
      .filter((m) => m.role === "user")
      .pop();

    if (lastUserMessage) {
      const messageText = lastUserMessage.parts
        .filter((part): part is { type: "text"; text: string } => part.type === "text")
        .map((part) => part.text)
        .join(" ");

      const mentionsAvrora = AVRORA_MENTION_REGEX.test(messageText);

      if (!mentionsAvrora) {
        // Save the user message without AI response
        const newMessage = await saveMessages({
          messages: [
            {
              chatId: id,
              role: "user",
              content: lastUserMessage.parts,
              userId: user.id, // Track author
            },
          ],
        });

        return new Response(
          JSON.stringify({
            message: "Message saved without AI response",
            messageId: newMessage[0].id
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      // If @avrora mentioned, limit context to last 20 messages
      const last20Messages = uiMessages.slice(-20);
      uiMessages.length = 0;
      uiMessages.push(...last20Messages);
    }
  }

  // ... continue with existing streaming logic ...
}
```

### Step 3.2: Update Save Messages Function

Ensure messages are saved with `userId` for group chats:

```typescript
async function saveMessages({
  messages,
}: {
  messages: Array<{
    chatId: string;
    role: string;
    content: Array<unknown>;
    userId?: string; // Add optional userId
  }>;
}) {
  return await db
    .insert(message)
    .values(
      messages.map((msg) => ({
        id: generateUUID(),
        chatId: msg.chatId,
        role: msg.role,
        userId: msg.userId || null, // Save userId if provided
        parts: msg.content,
        attachments: [],
        createdAt: new Date(),
      }))
    )
    .returning();
}
```

## Phase 4: Area API Routes

### Step 4.1: Create Area List API

Create `app/(area)/api/areas/route.ts`:

```typescript
import { auth } from "@/app/(auth)/auth";
import { db } from "@/lib/db";
import { area, areaMember } from "@/lib/db/schema";
import { eq, or, and } from "drizzle-orm";

export async function GET() {
  const session = await auth();

  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  // Fetch areas where user is owner or member
  const userAreas = await db
    .select({
      id: area.id,
      title: area.title,
      description: area.description,
      visibility: area.visibility,
      createdAt: area.createdAt,
      ownerId: area.ownerId,
      role: areaMember.role,
    })
    .from(area)
    .leftJoin(areaMember, eq(area.id, areaMember.areaId))
    .where(
      or(
        eq(area.ownerId, session.user.id),
        and(
          eq(areaMember.userId, session.user.id),
          eq(area.visibility, "public")
        )
      )
    );

  return Response.json(userAreas);
}

export async function POST(request: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { title, description, visibility } = await request.json();

  const [newArea] = await db
    .insert(area)
    .values({
      title,
      description,
      visibility: visibility || "private",
      ownerId: session.user.id,
      createdAt: new Date(),
    })
    .returning();

  // Add owner as area member
  await db.insert(areaMember).values({
    areaId: newArea.id,
    userId: session.user.id,
    role: "owner",
    joinedAt: new Date(),
  });

  return Response.json(newArea);
}
```

### Step 4.2: Create Single Area API

Create `app/(area)/api/areas/[id]/route.ts`:

```typescript
import { auth } from "@/app/(auth)/auth";
import { db } from "@/lib/db";
import { area, areaMember, chat } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  const { id } = await params;

  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  // Fetch area with membership check
  const [areaData] = await db
    .select({
      area,
      memberRole: areaMember.role,
    })
    .from(area)
    .leftJoin(
      areaMember,
      and(
        eq(area.id, areaMember.areaId),
        eq(areaMember.userId, session.user.id)
      )
    )
    .where(eq(area.id, id));

  if (!areaData) {
    return new Response("Area not found", { status: 404 });
  }

  // Check access
  const hasAccess =
    areaData.area.ownerId === session.user.id ||
    areaData.memberRole !== null ||
    areaData.area.visibility === "public";

  if (!hasAccess) {
    return new Response("Forbidden", { status: 403 });
  }

  // Fetch area chats
  const areaChats = await db
    .select()
    .from(chat)
    .where(eq(chat.areaId, id));

  return Response.json({
    ...areaData.area,
    role: areaData.memberRole,
    chats: areaChats,
  });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  const { id } = await params;

  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { title, description, visibility } = await request.json();

  // Check if user has admin/owner access
  const [member] = await db
    .select()
    .from(areaMember)
    .where(
      and(
        eq(areaMember.areaId, id),
        eq(areaMember.userId, session.user.id)
      )
    );

  if (!member || !["owner", "admin"].includes(member.role)) {
    return new Response("Forbidden", { status: 403 });
  }

  const [updatedArea] = await db
    .update(area)
    .set({ title, description, visibility })
    .where(eq(area.id, id))
    .returning();

  return Response.json(updatedArea);
}
```

### Step 4.3: Create Area Members API

Create `app/(area)/api/areas/[id]/members/route.ts`:

```typescript
import { auth } from "@/app/(auth)/auth";
import { db } from "@/lib/db";
import { areaMember, user } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  const { id } = await params;

  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  const members = await db
    .select({
      userId: areaMember.userId,
      role: areaMember.role,
      joinedAt: areaMember.joinedAt,
      email: user.email,
    })
    .from(areaMember)
    .innerJoin(user, eq(areaMember.userId, user.id))
    .where(eq(areaMember.areaId, id));

  return Response.json(members);
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  const { id } = await params;

  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { userId, role } = await request.json();

  // Check if requester has admin/owner access
  const [requester] = await db
    .select()
    .from(areaMember)
    .where(
      eq(areaMember.areaId, id),
      eq(areaMember.userId, session.user.id)
    );

  if (!requester || !["owner", "admin"].includes(requester.role)) {
    return new Response("Forbidden", { status: 403 });
  }

  const [newMember] = await db
    .insert(areaMember)
    .values({
      areaId: id,
      userId,
      role: role || "member",
      joinedAt: new Date(),
    })
    .returning();

  return Response.json(newMember);
}
```

## Phase 5: UI Components

### Step 5.1: Area List Page

Create `app/(area)/areas/page.tsx`:

```typescript
import { auth } from "@/app/(auth)/auth";
import { db } from "@/lib/db";
import { area, areaMember } from "@/lib/db/schema";
import { eq, or } from "drizzle-orm";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function AreasPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  const userAreas = await db
    .select({
      id: area.id,
      title: area.title,
      description: area.description,
      visibility: area.visibility,
      createdAt: area.createdAt,
      role: areaMember.role,
    })
    .from(area)
    .leftJoin(areaMember, eq(area.id, areaMember.areaId))
    .where(
      or(
        eq(area.ownerId, session.user.id),
        eq(areaMember.userId, session.user.id)
      )
    );

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-bold">Areas</h1>
        <Link
          className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
          href="/areas/new"
        >
          Create Area
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {userAreas.map((a) => (
          <Link
            key={a.id}
            className="rounded-lg border border-gray-200 p-4 hover:bg-gray-50"
            href={`/area/${a.id}`}
          >
            <h2 className="text-xl font-semibold">{a.title}</h2>
            {a.description && (
              <p className="mt-2 text-gray-600">{a.description}</p>
            )}
            <div className="mt-4 flex items-center gap-2">
              <span className="rounded bg-gray-100 px-2 py-1 text-xs">
                {a.role || "viewer"}
              </span>
              <span className="rounded bg-gray-100 px-2 py-1 text-xs">
                {a.visibility}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
```

### Step 5.2: Single Area Page

Create `app/(area)/area/[id]/page.tsx`:

```typescript
import { auth } from "@/app/(auth)/auth";
import { db } from "@/lib/db";
import { area, areaMember, chat } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function AreaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  const { id } = await params;

  if (!session?.user?.id) {
    redirect("/login");
  }

  const [areaData] = await db
    .select({
      area,
      memberRole: areaMember.role,
    })
    .from(area)
    .leftJoin(
      areaMember,
      and(
        eq(area.id, areaMember.areaId),
        eq(areaMember.userId, session.user.id)
      )
    )
    .where(eq(area.id, id));

  if (!areaData) {
    return <div>Area not found</div>;
  }

  const hasAccess =
    areaData.area.ownerId === session.user.id ||
    areaData.memberRole !== null ||
    areaData.area.visibility === "public";

  if (!hasAccess) {
    return <div>Access denied</div>;
  }

  const areaChats = await db
    .select()
    .from(chat)
    .where(eq(chat.areaId, id));

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">{areaData.area.title}</h1>
        {areaData.area.description && (
          <p className="mt-2 text-gray-600">{areaData.area.description}</p>
        )}
      </div>

      <div className="mb-6">
        <h2 className="mb-4 text-2xl font-semibold">Chats</h2>
        <div className="grid gap-4">
          {areaChats.map((c) => (
            <Link
              key={c.id}
              className="rounded-lg border border-gray-200 p-4 hover:bg-gray-50"
              href={`/area/${id}/chat/${c.id}`}
            >
              <h3 className="font-semibold">{c.title}</h3>
              <span className="text-sm text-gray-500">
                {c.chatType === "group" ? "Group Chat" : "Personal Chat"}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
```

### Step 5.3: Area Tree Visualization

Create `components/area-tree.tsx`:

```typescript
"use client";

import { useRouter } from "next/navigation";

export type AreaNode = {
  id: string;
  title: string;
  children: AreaNode[];
  hasAccess: boolean;
};

type AreaTreeProps = {
  nodes: AreaNode[];
  level?: number;
};

export function AreaTree({ nodes, level = 0 }: AreaTreeProps) {
  const router = useRouter();

  return (
    <div className="space-y-1">
      {nodes.map((node) => (
        <div key={node.id} style={{ paddingLeft: `${level * 16}px` }}>
          <button
            className="flex w-full cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-left hover:bg-gray-100"
            onClick={() => {
              if (node.hasAccess) {
                router.push(`/area/${node.id}`);
              }
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                if (node.hasAccess) {
                  router.push(`/area/${node.id}`);
                }
              }
            }}
            type="button"
          >
            <span className={node.hasAccess ? "" : "text-gray-400"}>
              {node.title}
            </span>
          </button>

          {node.children.length > 0 && (
            <AreaTree nodes={node.children} level={level + 1} />
          )}
        </div>
      ))}
    </div>
  );
}
```

## Phase 6: WebSocket Integration (Optional)

### Step 6.1: Update WebSocket Hook

Modify `lib/websocket/use-websocket.ts` to support area-specific connections:

```typescript
import { useCallback, useEffect, useRef, useState } from "react";

export type WebSocketMessage = {
  type: string;
  payload: unknown;
};

type UseWebSocketOptions = {
  chatId?: string;
  areaId?: string; // Add area support
  token?: string;
  onConnect?: () => void;
  onMessage?: (message: WebSocketMessage) => void;
  onDisconnect?: () => void;
  onError?: (error: Error) => void;
  autoReconnect?: boolean;
  reconnectInterval?: number;
};

export function useWebSocket({
  chatId,
  areaId,
  token,
  onConnect,
  onMessage,
  onDisconnect,
  onError,
  autoReconnect = true,
  reconnectInterval = 5000,
}: UseWebSocketOptions) {
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();

  const connect = useCallback(() => {
    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:3001";
    const url = new URL(wsUrl);

    if (chatId) url.searchParams.set("chatId", chatId);
    if (areaId) url.searchParams.set("areaId", areaId);
    if (token) url.searchParams.set("token", token);

    const ws = new WebSocket(url.toString());

    ws.onopen = () => {
      setIsConnected(true);
      onConnect?.();
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data) as WebSocketMessage;
        onMessage?.(message);
      } catch {
        onError?.(new Error("Failed to parse WebSocket message"));
      }
    };

    ws.onclose = () => {
      setIsConnected(false);
      onDisconnect?.();

      if (autoReconnect) {
        reconnectTimeoutRef.current = setTimeout(() => {
          connect();
        }, reconnectInterval);
      }
    };

    ws.onerror = () => {
      onError?.(new Error("WebSocket error"));
    };

    wsRef.current = ws;
  }, [chatId, areaId, token, onConnect, onMessage, onDisconnect, onError, autoReconnect, reconnectInterval]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    wsRef.current?.close();
  }, []);

  const sendMessage = useCallback((message: Record<string, unknown>) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    }
  }, []);

  useEffect(() => {
    connect();
    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  return {
    isConnected,
    sendMessage,
    disconnect,
  };
}
```

## Phase 7: Testing

### Step 7.1: Create Test Area

Create a test script or use API routes to create a test area:

```bash
curl -X POST http://localhost:3000/api/areas \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test Area",
    "description": "Testing area functionality",
    "visibility": "private"
  }'
```

### Step 7.2: Test Group Chat with @avrora Mention

1. Create a group chat within the area
2. Send a message without @avrora - verify AI doesn't respond
3. Send a message with @avrora - verify AI responds
4. Check that only last 20 messages are used as context

### Step 7.3: Test Access Control

1. Create an area as user A
2. Try to access as user B (should be forbidden for private areas)
3. Add user B as member
4. Verify user B can now access the area

## Phase 8: Advanced Features (Future)

### Multi-Agent Hierarchy
Implement lightweight agents (Gemma 2B/Phi-4 Mini) that route to GPT-5:

```typescript
// lib/ai/agent-router.ts
export async function routeToAgent(
  message: string,
  context: AreaContext
): Promise<AgentResponse> {
  // Use lightweight model for intent detection
  const intent = await detectIntentWithLightweightModel(message);

  if (intent.confidence > 0.8 && intent.type === "simple_query") {
    // Handle with lightweight agent
    return await lightweightAgent.process(message, context);
  }

  // Route to GPT-5 for complex queries
  return await gpt5Agent.process(message, context);
}
```

### RAG Integration
Add vector embeddings for semantic search:

```typescript
// lib/rag/embeddings.ts
export async function indexAreaDocuments(areaId: string) {
  const documents = await getAreaDocuments(areaId);

  for (const doc of documents) {
    const embedding = await generateEmbedding(doc.content);
    await storeEmbedding(doc.id, embedding);
  }
}

export async function semanticSearch(
  query: string,
  areaId: string
): Promise<Document[]> {
  const queryEmbedding = await generateEmbedding(query);
  return await findSimilarDocuments(queryEmbedding, areaId);
}
```

### Fork/Merge Implementation
Add UI and logic for forking areas:

```typescript
// app/(area)/api/areas/[id]/fork/route.ts
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  const { id } = await params;

  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  const [parentArea] = await db
    .select()
    .from(area)
    .where(eq(area.id, id));

  const [forkedArea] = await db
    .insert(area)
    .values({
      title: `${parentArea.title} (Fork)`,
      description: parentArea.description,
      ownerId: session.user.id,
      parentAreaId: id,
      inheritedSummary: await generateAreaSummary(id),
      forkedAt: new Date(),
      createdAt: new Date(),
    })
    .returning();

  return Response.json(forkedArea);
}
```

## Environment Variables

Add to `.env` file:

```bash
# Existing variables...

# WebSocket server (if using separate WS server)
NEXT_PUBLIC_WS_URL=ws://localhost:3001

# Optional: Vector database for RAG
PINECONE_API_KEY=your_key_here
PINECONE_ENVIRONMENT=us-west1-gcp

# Optional: DAO integration
WEB3_RPC_URL=https://mainnet.infura.io/v3/YOUR_KEY
```

## Migration Checklist

- [ ] Run database migrations
- [ ] Create mention parser utilities
- [ ] Update chat API with group chat logic
- [ ] Create area API routes
- [ ] Build area UI pages
- [ ] Add area tree component
- [ ] Test @avrora mention detection
- [ ] Test access control
- [ ] Add WebSocket support (optional)
- [ ] Document new API endpoints
- [ ] Update CLAUDE.md with area architecture

## Key Implementation Notes

1. **Group Chat Context**: Limited to 20 messages to prevent token overflow
2. **Mention Detection**: Uses regex for performance, compiled at module level
3. **Access Control**: Three-tier system (public, private, DAO)
4. **Fork/Merge**: Self-referencing foreign key in Area table
5. **Real-time**: WebSocket optional, can use polling initially
6. **Multi-agent**: Phase 2 feature, start with single GPT-5 model

## Support & References

- Current implementation: `/Users/adiom/Canfly/2026/avrora`
- Schema reference: [lib/db/schema.ts](lib/db/schema.ts)
- Chat logic: [app/(chat)/api/chat/route.ts](app/(chat)/api/chat/route.ts)
- Mention parser: [lib/mentions/parser.ts](lib/mentions/parser.ts)
- Vision document: [docs.md/area.md](docs.md/area.md)
