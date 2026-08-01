/**
 * Shared Message Type for Orbital Chat
 *
 * Unified type used by orbit-chat.tsx and orbit-chat-panel.tsx
 */

export type Attachment = {
  name: string;
  url: string;
  contentType: string;
};

export type ToolResult = {
  toolName: string;
  success?: boolean;
  error?: string;
  imageUrl?: string;
  prompt?: string;
  aspectRatio?: string;
  audioUrl?: string;
  duration?: number;
  videoUrl?: string;
  fps?: number;
  summary?: string;
  summaryLength?: string;
  chartType?: "line" | "bar" | "pie" | "area";
  chartData?: Record<string, string | number>[];
  chartTitle?: string;
  xKey?: string;
  yKey?: string;
  id?: string;
  title?: string;
  purpose?: string;
  features?: string[];
  componentInfo?: {
    name: string;
    imports: string[];
    dependencies: Record<string, string>;
    hasState: boolean;
    hasEffects: boolean;
  };
  reactCode?: string;
  instructions?: {
    setup: string[];
    customization: string[];
  };
  specVersion?: number;
  query?: string;
  answer?: string;
  results?: Array<{
    title: string;
    url: string;
    content: string;
    score?: number;
  }>;
  searchDepth?: "basic" | "advanced";
  message?: string;
  approvalId?: string;
  provider?: string;
  status?: "requested" | "approved" | "denied" | "completed" | "failed";
  model?: string;
  executionTimeMs?: number;
  providerStatus?: string;
  [key: string]: unknown;
};

export type ToolCallPart = {
  type: "tool-call";
  toolCallId: string;
  toolName: string;
  state:
    | "input-streaming"
    | "input-available"
    | "approval-requested"
    | "approval-responded"
    | "output-available"
    | "output-denied"
    | "output-error";
  input?: Record<string, unknown>;
  output?: unknown;
  errorText?: string;
  approval?: {
    id: string;
    isAutomatic: boolean;
    approved?: boolean;
    reason?: string;
  };
};

export type DocumentArtifact = {
  id: string;
  kind: "text" | "code" | "sheet" | "image" | "mini-app" | "chart" | "game";
  title: string;
  content?: string;
  createdAt: Date;
};

export type Message = {
  id: string;
  content: string;
  userId: string;
  userEmail: string;
  parentMessageId: string | null;
  attachments?: Attachment[];
  toolResults?: ToolResult[];
  toolCalls?: ToolCallPart[];
  artifacts?: DocumentArtifact[];
  isForked: boolean;
  forkedSferaId: string | null;
  isGenerating?: boolean;
  isPending?: boolean;
  createdAt: Date;
};

/**
 * Parse attachments from API response
 */
export const parseAttachments = (value: unknown): Attachment[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => {
      if (!item || typeof item !== "object") {
        return null;
      }

      const record = item as Record<string, unknown>;
      const name = record.name;
      const url = record.url;
      const contentType = record.contentType;

      if (
        typeof name !== "string" ||
        typeof url !== "string" ||
        typeof contentType !== "string"
      ) {
        return null;
      }

      return { name, url, contentType } satisfies Attachment;
    })
    .filter((attachment): attachment is Attachment => attachment !== null);
};

/**
 * Parse tool results from API response
 */
export const parseToolResults = (value: unknown): ToolResult[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => {
      if (!item || typeof item !== "object") {
        return null;
      }

      return item as ToolResult;
    })
    .filter((result): result is ToolResult => result !== null);
};

/**
 * Parse message from API response
 */
const isNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;

export const parseMessage = (value: unknown): Message | null => {
  if (!value || typeof value !== "object") {
    return null;
  }

  const record = value as Record<string, unknown>;

  const id = record.id;
  const content = record.content;
  const userId = record.userId;
  const userEmail = record.userEmail;
  const parentMessageId = record.parentMessageId;
  const isForked = record.isForked;
  const forkedSferaId = record.forkedSferaId;
  const createdAt = record.createdAt;

  if (
    !isNonEmptyString(id) ||
    typeof content !== "string" ||
    !isNonEmptyString(userId) ||
    typeof userEmail !== "string" ||
    (parentMessageId !== null && !isNonEmptyString(parentMessageId)) ||
    typeof isForked !== "boolean" ||
    !(createdAt instanceof Date || typeof createdAt === "string")
  ) {
    return null;
  }

  return {
    id,
    content,
    userId,
    userEmail,
    parentMessageId:
      typeof parentMessageId === "string" ? parentMessageId : null,
    attachments: parseAttachments(record.attachments),
    toolResults: parseToolResults(record.toolResults),
    isForked,
    forkedSferaId: typeof forkedSferaId === "string" ? forkedSferaId : null,
    isGenerating:
      typeof record.isGenerating === "boolean" ? record.isGenerating : false,
    createdAt:
      createdAt instanceof Date && !Number.isNaN(createdAt.getTime())
        ? createdAt
        : new Date(createdAt as string),
  } satisfies Message;
};

/**
 * Parse messages array from API response
 */
export const parseMessages = (value: unknown): Message[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((msg) => parseMessage(msg))
    .filter((msg): msg is Message => msg !== null)
    .reverse(); // API returns descending, we need ascending
};
