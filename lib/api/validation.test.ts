/**
 * Property-Based Tests for Validation Layer
 * Feature: sfera-api-enhancement, Property 5: Validation and error response
 * Validates: Requirements 2.1, 2.2
 */

import * as fc from "fast-check";
import { describe, expect, it } from "vitest";
import type { z } from "zod";
import {
  agentRegistrationSchema,
  agentUpdateSchema,
  createMessageSchema,
  messageFilterSchema,
  paginationSchema,
  searchSchema,
  updateMessageSchema,
} from "./validation";

/**
 * Helper function to validate and extract error details
 */
function validateAndGetErrors(
  schema: z.ZodTypeAny,
  data: unknown
): { success: boolean; errors?: Record<string, string[]> } {
  const result = schema.safeParse(data);

  if (result.success) {
    return { success: true };
  }

  // Extract error details in a structured format
  const errors: Record<string, string[]> = {};
  for (const issue of result.error.issues) {
    const path = issue.path.join(".") || "root";
    if (!errors[path]) {
      errors[path] = [];
    }
    errors[path].push(issue.message);
  }

  return { success: false, errors };
}

describe("Property 5: Validation and error response", () => {
  describe("createMessageSchema validation", () => {
    it("should reject messages with neither content nor attachments", () => {
      fc.assert(
        fc.property(
          fc.record({
            parentMessageId: fc.option(fc.uuid(), { nil: undefined }),
            idempotencyKey: fc.option(fc.uuid(), { nil: undefined }),
          }),
          (data) => {
            const result = validateAndGetErrors(createMessageSchema, data);

            // Should fail validation
            expect(result.success).toBe(false);
            expect(result.errors).toBeDefined();

            // Should have error details
            if (result.errors) {
              const allErrors = Object.values(result.errors).flat();
              expect(allErrors.length).toBeGreaterThan(0);
              expect(
                allErrors.some((msg) =>
                  msg.includes("Either content or attachments required")
                )
              ).toBe(true);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it("should reject messages with content exceeding max length", () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 10_001, maxLength: 15_000 }),
          (longContent) => {
            const result = validateAndGetErrors(createMessageSchema, {
              content: longContent,
            });

            // Should fail validation
            expect(result.success).toBe(false);
            expect(result.errors).toBeDefined();

            // Should have error about content length
            if (result.errors) {
              expect(result.errors.content).toBeDefined();
              expect(result.errors.content.length).toBeGreaterThan(0);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it("should reject messages with invalid UUID for parentMessageId", () => {
      fc.assert(
        fc.property(
          fc
            .string({ minLength: 1, maxLength: 50 })
            .filter(
              (s) =>
                !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
                  s
                )
            ),
          (invalidUuid) => {
            const result = validateAndGetErrors(createMessageSchema, {
              content: "test",
              parentMessageId: invalidUuid,
            });

            // Should fail validation
            expect(result.success).toBe(false);
            expect(result.errors).toBeDefined();

            // Should have error about parentMessageId
            if (result.errors) {
              expect(result.errors.parentMessageId).toBeDefined();
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it("should reject messages with invalid attachment URLs", () => {
      fc.assert(
        fc.property(
          fc.oneof(
            fc.constant("not-a-url"),
            fc.constant("invalid"),
            fc.constant("://missing-protocol"),
            fc.constant("http://"),
            fc.constant("ht!tp://example.com"),
            fc
              .string({ minLength: 1, maxLength: 20 })
              .filter((s) => !s.includes("://") && !s.includes("."))
              .filter((s) => {
                try {
                  new URL(s);
                  return false;
                } catch {
                  return true;
                }
              })
          ),
          (invalidUrl) => {
            const result = validateAndGetErrors(createMessageSchema, {
              attachments: [
                {
                  name: "file.txt",
                  url: invalidUrl,
                  contentType: "text/plain",
                },
              ],
            });

            // Should fail validation
            expect(result.success).toBe(false);
            expect(result.errors).toBeDefined();

            // Should have error about attachment URL
            if (result.errors) {
              const allErrors = Object.keys(result.errors);
              expect(allErrors.some((key) => key.includes("attachments"))).toBe(
                true
              );
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe("paginationSchema validation", () => {
    it("should reject limit values outside 1-100 range", () => {
      fc.assert(
        fc.property(
          fc.oneof(fc.integer({ max: 0 }), fc.integer({ min: 101, max: 1000 })),
          (invalidLimit) => {
            const result = validateAndGetErrors(paginationSchema, {
              limit: invalidLimit,
            });

            // Should fail validation
            expect(result.success).toBe(false);
            expect(result.errors).toBeDefined();

            // Should have error about limit
            if (result.errors) {
              expect(result.errors.limit).toBeDefined();
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe("messageFilterSchema validation", () => {
    it("should reject invalid userId format", () => {
      fc.assert(
        fc.property(
          fc
            .string({ minLength: 1, maxLength: 50 })
            .filter(
              (s) =>
                !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
                  s
                )
            ),
          (invalidUuid) => {
            const result = validateAndGetErrors(messageFilterSchema, {
              userId: invalidUuid,
            });

            // Should fail validation
            expect(result.success).toBe(false);
            expect(result.errors).toBeDefined();

            // Should have error about userId
            if (result.errors) {
              expect(result.errors.userId).toBeDefined();
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it("should reject invalid messageType values", () => {
      fc.assert(
        fc.property(
          fc
            .string({ minLength: 1, maxLength: 20 })
            .filter((s) => !["user", "agent", "system"].includes(s)),
          (invalidType) => {
            const result = validateAndGetErrors(messageFilterSchema, {
              messageType: invalidType,
            });

            // Should fail validation
            expect(result.success).toBe(false);
            expect(result.errors).toBeDefined();

            // Should have error about messageType
            if (result.errors) {
              expect(result.errors.messageType).toBeDefined();
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it("should reject invalid datetime strings", () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 30 }).filter((s) => {
            try {
              const date = new Date(s);
              return isNaN(date.getTime()) || !s.includes("T");
            } catch {
              return true;
            }
          }),
          (invalidDate) => {
            const result = validateAndGetErrors(messageFilterSchema, {
              dateFrom: invalidDate,
            });

            // Should fail validation
            expect(result.success).toBe(false);
            expect(result.errors).toBeDefined();

            // Should have error about dateFrom
            if (result.errors) {
              expect(result.errors.dateFrom).toBeDefined();
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe("agentRegistrationSchema validation", () => {
    it("should reject invalid email addresses", () => {
      fc.assert(
        fc.property(
          fc
            .string({ minLength: 1, maxLength: 50 })
            .filter((s) => !s.includes("@") || !s.includes(".")),
          (invalidEmail) => {
            const result = validateAndGetErrors(agentRegistrationSchema, {
              name: "Test Agent",
              email: invalidEmail,
              webhookUrl: "https://example.com/webhook",
              webhookSecret: "a".repeat(32),
            });

            // Should fail validation
            expect(result.success).toBe(false);
            expect(result.errors).toBeDefined();

            // Should have error about email
            if (result.errors) {
              expect(result.errors.email).toBeDefined();
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it("should reject webhook secrets shorter than 32 characters", () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 31 }),
          (shortSecret) => {
            const result = validateAndGetErrors(agentRegistrationSchema, {
              name: "Test Agent",
              email: "test@example.com",
              webhookUrl: "https://example.com/webhook",
              webhookSecret: shortSecret,
            });

            // Should fail validation
            expect(result.success).toBe(false);
            expect(result.errors).toBeDefined();

            // Should have error about webhookSecret
            if (result.errors) {
              expect(result.errors.webhookSecret).toBeDefined();
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it("should reject invalid webhook URLs", () => {
      fc.assert(
        fc.property(
          fc.oneof(
            fc.constant("not-a-url"),
            fc.constant("invalid"),
            fc.constant("://missing-protocol"),
            fc.constant("http://"),
            fc.constant("ht!tp://example.com"),
            fc
              .string({ minLength: 1, maxLength: 20 })
              .filter((s) => !s.includes("://") && !s.includes("."))
              .filter((s) => {
                try {
                  new URL(s);
                  return false;
                } catch {
                  return true;
                }
              })
          ),
          (invalidUrl) => {
            const result = validateAndGetErrors(agentRegistrationSchema, {
              name: "Test Agent",
              email: "test@example.com",
              webhookUrl: invalidUrl,
              webhookSecret: "a".repeat(32),
            });

            // Should fail validation
            expect(result.success).toBe(false);
            expect(result.errors).toBeDefined();

            // Should have error about webhookUrl
            if (result.errors) {
              expect(result.errors.webhookUrl).toBeDefined();
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it("should reject invalid temperature values in metadata", () => {
      fc.assert(
        fc.property(
          fc.oneof(
            fc.double({ min: -10, max: -0.01 }),
            fc.double({ min: 2.01, max: 10 })
          ),
          (invalidTemp) => {
            const result = validateAndGetErrors(agentRegistrationSchema, {
              name: "Test Agent",
              email: "test@example.com",
              webhookUrl: "https://example.com/webhook",
              webhookSecret: "a".repeat(32),
              metadata: {
                temperature: invalidTemp,
              },
            });

            // Should fail validation
            expect(result.success).toBe(false);
            expect(result.errors).toBeDefined();

            // Should have error about temperature
            if (result.errors) {
              const allErrors = Object.keys(result.errors);
              expect(allErrors.some((key) => key.includes("metadata"))).toBe(
                true
              );
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe("searchSchema validation", () => {
    it("should reject empty search queries", () => {
      fc.assert(
        fc.property(fc.constant(""), (emptyQuery) => {
          const result = validateAndGetErrors(searchSchema, {
            query: emptyQuery,
          });

          // Should fail validation
          expect(result.success).toBe(false);
          expect(result.errors).toBeDefined();

          // Should have error about query
          if (result.errors) {
            expect(result.errors.query).toBeDefined();
          }
        }),
        { numRuns: 100 }
      );
    });

    it("should reject search queries exceeding max length", () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 501, maxLength: 1000 }),
          (longQuery) => {
            const result = validateAndGetErrors(searchSchema, {
              query: longQuery,
            });

            // Should fail validation
            expect(result.success).toBe(false);
            expect(result.errors).toBeDefined();

            // Should have error about query length
            if (result.errors) {
              expect(result.errors.query).toBeDefined();
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe("General validation property", () => {
    it("should always provide detailed error messages for any invalid input", () => {
      // Test with various invalid inputs across different schemas
      const invalidInputs = [
        { schema: createMessageSchema, data: {} },
        { schema: createMessageSchema, data: { content: "" } },
        { schema: paginationSchema, data: { limit: -1 } },
        { schema: paginationSchema, data: { limit: 101 } },
        { schema: messageFilterSchema, data: { userId: "not-a-uuid" } },
        { schema: messageFilterSchema, data: { messageType: "invalid" } },
        { schema: agentRegistrationSchema, data: { name: "test" } },
        { schema: searchSchema, data: { query: "" } },
      ];

      for (const { schema, data } of invalidInputs) {
        const result = validateAndGetErrors(schema, data);

        // Should fail validation
        expect(result.success).toBe(false);

        // Should have error details
        expect(result.errors).toBeDefined();
        if (result.errors) {
          const errorCount = Object.values(result.errors).flat().length;
          expect(errorCount).toBeGreaterThan(0);

          // Each error should be a non-empty string
          for (const messages of Object.values(result.errors)) {
            for (const message of messages) {
              expect(typeof message).toBe("string");
              expect(message.length).toBeGreaterThan(0);
            }
          }
        }
      }
    });
  });
});
