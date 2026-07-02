import { eq } from "drizzle-orm";
import type { NextRequest } from "next/server";
import { auth } from "@/app/(auth)/auth";
import {
  createApiKey,
  getUserApiKeys,
  revokeApiKey,
} from "@/lib/auth/api-keys";
import { db } from "@/lib/db";
import { user } from "@/lib/db/schema";

// GET /api/keys - Get all API keys for the current user
export async function GET() {
  try {
    const session = await auth();

    if (!session || !session.user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const keys = await getUserApiKeys(session.user.id);

    // Remove sensitive data (hash) and format response
    const sanitizedKeys = keys.map((key) => ({
      id: key.id,
      name: key.name,
      prefix: key.prefix,
      permissions: key.permissions,
      lastUsedAt: key.lastUsedAt,
      usageCount: key.usageCount,
      expiresAt: key.expiresAt,
      createdAt: key.createdAt,
    }));

    return Response.json({ keys: sanitizedKeys });
  } catch (error) {
    console.error("Failed to fetch API keys:", error);
    return Response.json(
      { error: "Failed to fetch API keys" },
      { status: 500 }
    );
  }
}

// POST /api/keys - Create a new API key
export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session || !session.user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user has MCP enabled
    const [userRecord] = await db
      .select()
      .from(user)
      .where(eq(user.id, session.user.id))
      .limit(1);

    if (!userRecord) {
      return Response.json({ error: "User not found" }, { status: 404 });
    }

    // Enable MCP for the user if not already enabled
    if (!userRecord.mcpEnabled) {
      await db
        .update(user)
        .set({
          mcpEnabled: true,
          mcpQuota: {
            requestsPerHour: 500,
            requestsPerDay: 5000,
            tier: "free" as const,
          },
          updatedAt: new Date(),
        })
        .where(eq(user.id, session.user.id));
    }

    // Parse request body
    const body = await request.json();
    const {
      name,
      permissions = { resources: true, tools: false, admin: false },
      expiresIn,
    } = body;

    if (!name || typeof name !== "string") {
      return Response.json(
        { error: "API key name is required" },
        { status: 400 }
      );
    }

    // Calculate expiration date if specified
    let expiresAt: Date | undefined;
    if (expiresIn) {
      const daysToExpire = Number.parseInt(expiresIn, 10);
      if (daysToExpire > 0) {
        expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + daysToExpire);
      }
    }

    // Create the API key
    const { apiKeyRecord, plainKey } = await createApiKey(
      session.user.id,
      name,
      permissions,
      expiresAt
    );

    return Response.json(
      {
        key: {
          id: apiKeyRecord.id,
          name: apiKeyRecord.name,
          prefix: apiKeyRecord.prefix,
          permissions: apiKeyRecord.permissions,
          expiresAt: apiKeyRecord.expiresAt,
          createdAt: apiKeyRecord.createdAt,
        },
        // IMPORTANT: This is the only time the plain key is shown
        plainKey,
        message:
          "Save this API key securely. You won't be able to see it again.",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Failed to create API key:", error);
    return Response.json(
      { error: "Failed to create API key" },
      { status: 500 }
    );
  }
}


