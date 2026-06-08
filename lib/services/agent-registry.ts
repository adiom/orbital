import crypto from "node:crypto";
import { eq, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { type AgentRegistry, agentRegistry } from "@/lib/db/schema";

/**
 * Agent configuration for registration
 * Requirements: 12.1
 */
export type AgentConfig = {
  id: string;
  name: string;
  userId: string;
  email: string;
  webhookUrl: string;
  webhookSecret: string;
  authToken: string;
  metadata?: {
    model?: string;
    temperature?: number;
    maxTokens?: number;
  };
  healthStatus: "healthy" | "unhealthy" | "unknown";
  lastHealthCheck?: Date;
  failedWebhookCount: number;
  createdAt: Date;
  updatedAt: Date;
};

/**
 * Input for registering a new agent
 * Requirements: 12.1
 */
export type RegisterAgentInput = {
  name: string;
  userId: string;
  email: string;
  webhookUrl: string;
  webhookSecret: string;
  metadata?: {
    model?: string;
    temperature?: number;
    maxTokens?: number;
  };
};

/**
 * Zod schema for agent registration validation
 * Requirements: 2.1
 */
export const agentRegistrationSchema = z.object({
  name: z.string().min(1).max(255),
  userId: z.string().uuid(),
  email: z.string().email(),
  webhookUrl: z.string().url(),
  webhookSecret: z.string().min(32),
  metadata: z
    .object({
      model: z.string().optional(),
      temperature: z.number().min(0).max(2).optional(),
      maxTokens: z.number().positive().optional(),
    })
    .optional(),
});

/**
 * Zod schema for agent update validation
 * Requirements: 2.1
 */
export const agentUpdateSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  email: z.string().email().optional(),
  webhookUrl: z.string().url().optional(),
  webhookSecret: z.string().min(32).optional(),
  metadata: z
    .object({
      model: z.string().optional(),
      temperature: z.number().min(0).max(2).optional(),
      maxTokens: z.number().positive().optional(),
    })
    .optional(),
});

/**
 * Agent Registry Service for managing AI agents
 * Requirements: 12.1, 12.2, 12.3, 12.4, 17.1, 17.2, 17.3
 */
export class AgentRegistryService {
  /**
   * Generate a secure authentication token for an agent
   */
  private generateAuthToken(): string {
    return `avr_agent_${crypto.randomBytes(32).toString("hex")}`;
  }

  /**
   * Map database record to AgentConfig type
   * Provides type-safe conversion without unsafe casting
   */
  private mapToAgentConfig(agent: AgentRegistry): AgentConfig {
    return {
      id: agent.id,
      name: agent.name,
      userId: agent.userId,
      email: agent.email,
      webhookUrl: agent.webhookUrl,
      webhookSecret: agent.webhookSecret,
      authToken: agent.authToken,
      metadata: agent.metadata as AgentConfig["metadata"],
      healthStatus: agent.healthStatus as AgentConfig["healthStatus"],
      lastHealthCheck: agent.lastHealthCheck ?? undefined,
      failedWebhookCount: agent.failedWebhookCount,
      createdAt: agent.createdAt,
      updatedAt: agent.updatedAt,
    };
  }

  /**
   * Generic method to find an agent by a specific field
   * Reduces code duplication across query methods
   */
  private async findAgent(
    field: keyof typeof agentRegistry.$inferSelect,
    value: string
  ): Promise<AgentConfig | null> {
    const [agent] = await db
      .select()
      .from(agentRegistry)
      .where(eq(agentRegistry[field], value))
      .limit(1);

    return agent ? this.mapToAgentConfig(agent) : null;
  }

  /**
   * Register a new agent
   * Requirements: 12.1
   *
   * @param input - Agent registration data
   * @returns Registered agent configuration
   */
  async registerAgent(input: RegisterAgentInput): Promise<AgentConfig> {
    try {
      // Validate input
      const validated = agentRegistrationSchema.parse(input);

      const authToken = this.generateAuthToken();

      const [agent] = await db
        .insert(agentRegistry)
        .values({
          name: validated.name,
          userId: validated.userId,
          email: validated.email,
          webhookUrl: validated.webhookUrl,
          webhookSecret: validated.webhookSecret,
          authToken,
          metadata: validated.metadata || {},
          healthStatus: "unknown",
          failedWebhookCount: 0,
        })
        .returning();

      if (!agent) {
        throw new Error("Failed to register agent");
      }

      return this.mapToAgentConfig(agent);
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new Error(
          `Validation failed: ${error.errors.map((e) => `${e.path.join(".")}: ${e.message}`).join(", ")}`
        );
      }
      throw new Error(
        `Failed to register agent: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  /**
   * Update an existing agent
   * Requirements: 12.1
   *
   * @param agentId - Agent ID
   * @param updates - Fields to update
   * @returns Updated agent configuration
   */
  async updateAgent(
    agentId: string,
    updates: Partial<{
      name: string;
      email: string;
      webhookUrl: string;
      webhookSecret: string;
      metadata: {
        model?: string;
        temperature?: number;
        maxTokens?: number;
      };
    }>
  ): Promise<AgentConfig> {
    try {
      // Validate updates
      const validated = agentUpdateSchema.parse(updates);

      const [agent] = await db
        .update(agentRegistry)
        .set({
          ...validated,
          updatedAt: new Date(),
        })
        .where(eq(agentRegistry.id, agentId))
        .returning();

      if (!agent) {
        throw new Error(`Agent with ID ${agentId} not found`);
      }

      return this.mapToAgentConfig(agent);
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new Error(
          `Validation failed: ${error.errors.map((e) => `${e.path.join(".")}: ${e.message}`).join(", ")}`
        );
      }
      throw new Error(
        `Failed to update agent: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  /**
   * Delete an agent
   * Requirements: 12.3
   *
   * @param agentId - Agent ID
   */
  async deleteAgent(agentId: string): Promise<void> {
    try {
      await db.delete(agentRegistry).where(eq(agentRegistry.id, agentId));
    } catch (error) {
      throw new Error(
        `Failed to delete agent: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  /**
   * Get an agent by ID
   * Requirements: 12.4
   *
   * @param agentId - Agent ID
   * @returns Agent configuration or null if not found
   */
  getAgent(agentId: string): Promise<AgentConfig | null> {
    return this.findAgent("id", agentId);
  }

  /**
   * Get an agent by email
   *
   * @param email - Agent email
   * @returns Agent configuration or null if not found
   */
  getAgentByEmail(email: string): Promise<AgentConfig | null> {
    return this.findAgent("email", email);
  }

  /**
   * Get an agent by auth token
   *
   * @param authToken - Agent authentication token
   * @returns Agent configuration or null if not found
   */
  getAgentByToken(authToken: string): Promise<AgentConfig | null> {
    return this.findAgent("authToken", authToken);
  }

  /**
   * List all active agents
   * Requirements: 12.4
   *
   * @param includeUnhealthy - Whether to include unhealthy agents
   * @returns List of active agents
   */
  async listActiveAgents(includeUnhealthy = false): Promise<AgentConfig[]> {
    try {
      const agents = includeUnhealthy
        ? await db.select().from(agentRegistry)
        : await db
            .select()
            .from(agentRegistry)
            .where(eq(agentRegistry.healthStatus, "healthy"));

      return agents.map((agent) => this.mapToAgentConfig(agent));
    } catch (error) {
      throw new Error(
        `Failed to list agents: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  /**
   * Update health status of an agent
   * Requirements: 17.1, 17.2
   *
   * @param agentId - Agent ID
   * @param status - New health status
   */
  async updateHealthStatus(
    agentId: string,
    status: "healthy" | "unhealthy" | "unknown"
  ): Promise<void> {
    try {
      await db
        .update(agentRegistry)
        .set({
          healthStatus: status,
          lastHealthCheck: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(agentRegistry.id, agentId));
    } catch (error) {
      throw new Error(
        `Failed to update health status: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  /**
   * Increment failed webhook count for an agent
   * Requirements: 17.1, 17.2
   *
   * @param agentId - Agent ID
   * @returns New failed webhook count
   */
  async incrementFailedWebhooks(agentId: string): Promise<number> {
    try {
      // Use SQL increment to avoid N+1 query problem
      const [agent] = await db
        .update(agentRegistry)
        .set({
          failedWebhookCount: sql`${agentRegistry.failedWebhookCount} + 1`,
          updatedAt: new Date(),
        })
        .where(eq(agentRegistry.id, agentId))
        .returning();

      if (!agent) {
        throw new Error(`Agent with ID ${agentId} not found`);
      }

      const newCount = agent.failedWebhookCount;

      // Mark as unhealthy after 3 failed attempts
      // Requirements: 17.1
      if (newCount >= 3) {
        await this.updateHealthStatus(agentId, "unhealthy");
      }

      return newCount;
    } catch (error) {
      throw new Error(
        `Failed to increment failed webhooks: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  /**
   * Reset failed webhook count for an agent
   * Requirements: 17.3
   *
   * @param agentId - Agent ID
   */
  async resetFailedWebhooks(agentId: string): Promise<void> {
    try {
      await db
        .update(agentRegistry)
        .set({
          failedWebhookCount: 0,
          healthStatus: "healthy",
          lastHealthCheck: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(agentRegistry.id, agentId));
    } catch (error) {
      throw new Error(
        `Failed to reset failed webhooks: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  /**
   * Validate a webhook URL by sending a test ping
   * Requirements: 12.2
   *
   * @param webhookUrl - Webhook URL to validate
   * @returns True if webhook responds with 200, false otherwise
   */
  async validateWebhook(webhookUrl: string): Promise<boolean> {
    try {
      // Send a test ping to the webhook
      const testPayload = {
        event: "webhook.test",
        timestamp: new Date().toISOString(),
      };

      const response = await fetch(webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Webhook-Test": "true",
        },
        body: JSON.stringify(testPayload),
        signal: AbortSignal.timeout(10_000), // 10 second timeout
      });

      // Webhook is valid if it responds with 200
      return response.ok;
    } catch (error) {
      // Any error (timeout, network error, etc.) means webhook is invalid
      console.error("Webhook validation failed:", error);
      return false;
    }
  }

  /**
   * Validate and update agent webhook configuration
   * Requirements: 12.2
   *
   * @param agentId - Agent ID
   * @param webhookUrl - New webhook URL
   * @param webhookSecret - New webhook secret
   * @returns True if validation succeeded and agent was updated
   */
  async validateAndUpdateWebhook(
    agentId: string,
    webhookUrl: string,
    webhookSecret: string
  ): Promise<boolean> {
    // Validate the webhook first
    const isValid = await this.validateWebhook(webhookUrl);

    if (!isValid) {
      return false;
    }

    // Update agent configuration on success
    await this.updateAgent(agentId, {
      webhookUrl,
      webhookSecret,
    });

    // Reset health status since we have a valid webhook
    await this.resetFailedWebhooks(agentId);

    return true;
  }
}

// Export singleton instance
export const agentRegistryService = new AgentRegistryService();
