import { z } from "zod";

/**
 * Validation constants
 */
const MAX_MESSAGE_LENGTH = 10_000;
const MAX_SEARCH_QUERY_LENGTH = 500;
const MIN_WEBHOOK_SECRET_LENGTH = 32;
const MAX_PAGINATION_LIMIT = 100;
const DEFAULT_PAGINATION_LIMIT = 50;

/**
 * Webhook URLs must be http(s) — z.string().url() alone accepts any URI
 * scheme (e.g. "javascript:", "data:", "a:"), which is unsafe for webhooks.
 */
const webhookUrlSchema = z
  .string()
  .url()
  .refine(
    (url) => {
      try {
        return ["http:", "https:"].includes(new URL(url).protocol);
      } catch {
        return false;
      }
    },
    { message: "webhookUrl must use http or https protocol" }
  );

/**
 * Helper for parsing boolean query parameters from strings
 */
const booleanQueryParam = () =>
  z
    .string()
    .transform((val) => val === "true")
    .pipe(z.boolean())
    .optional();

/**
 * Shared schema for agent metadata configuration
 */
const agentMetadataSchema = z
  .object({
    model: z.string().optional(),
    temperature: z.number().min(0).max(2).optional(),
    maxTokens: z.number().int().positive().optional(),
  })
  .optional();

/**
 * Schema for creating a new message in a Sfera
 * Requirements: 2.1
 */
export const createMessageSchema = z
  .object({
    content: z.string().min(1).max(MAX_MESSAGE_LENGTH).optional(),
    parentMessageId: z.string().uuid().optional(),
    attachments: z
      .array(
        z.object({
          name: z.string(),
          url: z.string().url(),
          contentType: z.string(),
        })
      )
      .optional(),
    idempotencyKey: z.string().uuid().optional(),
  })
  .refine(
    (data) => data.content || (data.attachments && data.attachments.length > 0),
    {
      message: "Either content or attachments required",
    }
  );

/**
 * Schema for pagination parameters
 * Requirements: 2.1
 */
export const paginationSchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(MAX_PAGINATION_LIMIT)
    .default(DEFAULT_PAGINATION_LIMIT),
});

/**
 * Schema for message filtering
 * Requirements: 2.1
 */
export const messageFilterSchema = z.object({
  userId: z.string().uuid().optional(),
  messageType: z.enum(["user", "agent", "system"]).optional(),
  hasAttachments: booleanQueryParam(),
  isForked: booleanQueryParam(),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
});

/**
 * Schema for agent registration
 * Requirements: 2.1
 */
export const agentRegistrationSchema = z.object({
  name: z.string().min(1).max(255),
  email: z.string().email().max(255),
  webhookUrl: webhookUrlSchema,
  webhookSecret: z.string().min(MIN_WEBHOOK_SECRET_LENGTH),
  metadata: agentMetadataSchema,
});

/**
 * Schema for updating a message
 */
export const updateMessageSchema = z.object({
  content: z.string().min(1).max(MAX_MESSAGE_LENGTH).optional(),
  isGenerating: z.boolean().optional(),
  toolResults: z
    .array(
      z.object({
        toolName: z.string(),
        result: z.unknown(), // Use unknown instead of any for better type safety
      })
    )
    .optional(),
});

/**
 * Schema for agent update
 */
export const agentUpdateSchema = z.object({
  webhookUrl: webhookUrlSchema.optional(),
  webhookSecret: z.string().min(MIN_WEBHOOK_SECRET_LENGTH).optional(),
  metadata: agentMetadataSchema,
});

/**
 * Schema for search query
 */
export const searchSchema = z.object({
  query: z.string().min(1).max(MAX_SEARCH_QUERY_LENGTH),
  cursor: z.string().optional(),
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(MAX_PAGINATION_LIMIT)
    .default(DEFAULT_PAGINATION_LIMIT),
});

export type CreateMessageInput = z.infer<typeof createMessageSchema>;
export type PaginationInput = z.infer<typeof paginationSchema>;
export type MessageFilterInput = z.infer<typeof messageFilterSchema>;
export type AgentRegistrationInput = z.infer<typeof agentRegistrationSchema>;
export type UpdateMessageInput = z.infer<typeof updateMessageSchema>;
export type AgentUpdateInput = z.infer<typeof agentUpdateSchema>;
export type SearchInput = z.infer<typeof searchSchema>;
