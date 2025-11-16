import { compare, hash } from "bcrypt-ts";
import { randomBytes } from "crypto";
import { and, eq, gt, isNull, or } from "drizzle-orm";
import { db } from "@/lib/db";
import { type ApiKey, apiKey } from "@/lib/db/schema";

/**
 * Generate a new API key with the specified prefix
 * @param environment - "live" for production, "test" for testing
 * @returns The full API key (only shown once)
 */
export function generateApiKey(environment: "live" | "test" = "live"): string {
  const prefix = `avr_${environment}`;
  const randomPart = randomBytes(24).toString("base64url"); // 32 characters after base64url encoding
  return `${prefix}_${randomPart}`;
}

/**
 * Extract the prefix from an API key for identification
 * @param apiKey - The full API key
 * @returns The prefix part (e.g., "avr_live_abcd")
 */
export function getApiKeyPrefix(apiKey: string): string {
  const parts = apiKey.split("_");
  if (parts.length < 3) {
    throw new Error("Invalid API key format");
  }
  // Return first 3 parts plus first 4 chars of the random part
  const randomPart = parts.slice(2).join("_");
  const shortRandom = randomPart.substring(0, 4);
  return `${parts[0]}_${parts[1]}_${shortRandom}`;
}

/**
 * Hash an API key for secure storage
 * @param apiKey - The plain text API key
 * @returns The bcrypt hash
 */
export async function hashApiKey(apiKey: string): Promise<string> {
  return hash(apiKey, 12);
}

/**
 * Verify an API key against its hash
 * @param apiKey - The plain text API key
 * @param hash - The stored hash
 * @returns Whether the key matches
 */
export async function verifyApiKey(
  apiKey: string,
  hash: string
): Promise<boolean> {
  return compare(apiKey, hash);
}

/**
 * Create a new API key for a user
 * @param userId - The user's ID
 * @param name - A friendly name for the key
 * @param permissions - The permissions for the key
 * @param expiresAt - Optional expiration date
 * @returns The created API key record and the plain key (only shown once)
 */
export async function createApiKey(
  userId: string,
  name: string,
  permissions: {
    resources: boolean;
    tools: boolean;
    admin: boolean;
  } = { resources: true, tools: false, admin: false },
  expiresAt?: Date
): Promise<{ apiKeyRecord: ApiKey; plainKey: string }> {
  const environment = name.toLowerCase().includes("test") ? "test" : "live";
  const plainKey = generateApiKey(environment);
  const keyHash = await hashApiKey(plainKey);
  const prefix = getApiKeyPrefix(plainKey);

  const [apiKeyRecord] = await db
    .insert(apiKey)
    .values({
      userId,
      name,
      keyHash,
      prefix,
      permissions,
      expiresAt,
    })
    .returning();

  return { apiKeyRecord, plainKey };
}

/**
 * Validate an API key and return the associated user and permissions
 * @param plainKey - The API key to validate
 * @returns The API key record if valid, null otherwise
 */
export async function validateApiKey(plainKey: string): Promise<ApiKey | null> {
  try {
    // Get all non-revoked keys (we need to check the hash)
    const keys = await db
      .select()
      .from(apiKey)
      .where(
        and(
          isNull(apiKey.revokedAt),
          or(isNull(apiKey.expiresAt), gt(apiKey.expiresAt, new Date()))
        )
      );

    // Check each key's hash
    for (const key of keys) {
      const isValid = await verifyApiKey(plainKey, key.keyHash);
      if (isValid) {
        // Update last used timestamp
        await db
          .update(apiKey)
          .set({
            lastUsedAt: new Date(),
            usageCount: key.usageCount + 1,
          })
          .where(eq(apiKey.id, key.id));

        return key;
      }
    }

    return null;
  } catch (error) {
    console.error("Error validating API key:", error);
    return null;
  }
}

/**
 * Get all API keys for a user
 * @param userId - The user's ID
 * @returns List of API keys (without hashes)
 */
export async function getUserApiKeys(userId: string): Promise<ApiKey[]> {
  return db
    .select()
    .from(apiKey)
    .where(and(eq(apiKey.userId, userId), isNull(apiKey.revokedAt)));
}

/**
 * Revoke an API key
 * @param keyId - The API key's ID
 * @param userId - The user's ID (for authorization)
 * @returns Whether the key was successfully revoked
 */
export async function revokeApiKey(
  keyId: string,
  userId: string
): Promise<boolean> {
  const [result] = await db
    .update(apiKey)
    .set({ revokedAt: new Date() })
    .where(and(eq(apiKey.id, keyId), eq(apiKey.userId, userId)))
    .returning();

  return !!result;
}

/**
 * Check if a user has MCP access enabled
 * @param userId - The user's ID
 * @returns Whether the user has at least one valid API key
 */
export async function hasActiveMcpAccess(userId: string): Promise<boolean> {
  const [key] = await db
    .select({ id: apiKey.id })
    .from(apiKey)
    .where(
      and(
        eq(apiKey.userId, userId),
        isNull(apiKey.revokedAt),
        or(isNull(apiKey.expiresAt), gt(apiKey.expiresAt, new Date()))
      )
    )
    .limit(1);

  return !!key;
}
