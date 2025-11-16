import { eq } from "drizzle-orm";
import type { NextRequest } from "next/server";
import { validateApiKey } from "@/lib/auth/api-keys";
import { db } from "@/lib/db";
import { type ApiKey, mcpAuditLog, type User, user } from "@/lib/db/schema";

export type McpAuthResult =
  | { success: true; apiKey: ApiKey; user: User }
  | { success: false; error: string; status: number };

/**
 * Authenticate an MCP request using API key from Authorization header
 * @param request - The incoming request
 * @returns Authentication result with user and API key info
 */
export async function authenticateMcpRequest(
  request: NextRequest
): Promise<McpAuthResult> {
  try {
    // Get Authorization header
    const authHeader = request.headers.get("authorization");

    if (!authHeader) {
      return {
        success: false,
        error: "Missing Authorization header",
        status: 401,
      };
    }

    // Check for Bearer token format
    if (!authHeader.startsWith("Bearer ")) {
      return {
        success: false,
        error:
          "Invalid Authorization header format. Expected: Bearer <api_key>",
        status: 401,
      };
    }

    // Extract the API key
    const apiKeyValue = authHeader.substring(7).trim();

    if (!apiKeyValue) {
      return {
        success: false,
        error: "API key is empty",
        status: 401,
      };
    }

    // Validate the API key
    const apiKey = await validateApiKey(apiKeyValue);

    if (!apiKey) {
      return {
        success: false,
        error: "Invalid or expired API key",
        status: 401,
      };
    }

    // Get the user associated with this API key
    const [userRecord] = await db
      .select()
      .from(user)
      .where(eq(user.id, apiKey.userId))
      .limit(1);

    if (!userRecord) {
      return {
        success: false,
        error: "User not found",
        status: 404,
      };
    }

    // Check if user has MCP access enabled
    if (!userRecord.mcpEnabled) {
      return {
        success: false,
        error: "MCP access is not enabled for this user",
        status: 403,
      };
    }

    return {
      success: true,
      apiKey,
      user: userRecord,
    };
  } catch (error) {
    console.error("MCP authentication error:", error);
    return {
      success: false,
      error: "Authentication failed",
      status: 500,
    };
  }
}

/**
 * Log an MCP API call to the audit log
 * @param params - Audit log parameters
 */
export async function logMcpCall(params: {
  apiKeyId: string;
  userId: string;
  method: string;
  resourceUri?: string;
  toolName?: string;
  statusCode: number;
  responseTimeMs: number;
  errorMessage?: string;
  ipAddress: string;
  userAgent?: string;
  params?: any;
}): Promise<void> {
  try {
    await db.insert(mcpAuditLog).values({
      apiKeyId: params.apiKeyId,
      userId: params.userId,
      method: params.method,
      resourceUri: params.resourceUri,
      toolName: params.toolName,
      params: params.params,
      statusCode: params.statusCode,
      responseTimeMs: params.responseTimeMs,
      errorMessage: params.errorMessage,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
    });
  } catch (error) {
    console.error("Failed to log MCP call:", error);
    // Don't throw - logging failure shouldn't break the API call
  }
}

/**
 * Check if the API key has permission for the requested operation
 * @param apiKey - The API key
 * @param operation - The operation type
 * @returns Whether the operation is allowed
 */
export function checkMcpPermission(
  apiKey: ApiKey,
  operation: "resources" | "tools" | "admin"
): boolean {
  const permissions = apiKey.permissions as {
    resources: boolean;
    tools: boolean;
    admin: boolean;
  };

  return permissions[operation] === true;
}

/**
 * Get the client IP address from the request
 * @param request - The incoming request
 * @returns The IP address
 */
export function getClientIp(request: NextRequest): string {
  // Check various headers that might contain the real IP
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0].trim();
  }

  const realIp = request.headers.get("x-real-ip");
  if (realIp) {
    return realIp;
  }

  // Fallback to localhost if no IP found (shouldn't happen in production)
  return "127.0.0.1";
}
