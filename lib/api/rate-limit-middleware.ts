import type { NextRequest, NextResponse } from "next/server";
import {
  checkRateLimit,
  type RateLimitConfig,
  type RateLimitResult,
} from "@/lib/redis/rate-limiter";
import { createErrorResponse } from "./middleware";

/**
 * Rate limit middleware for API routes
 * Requirements: 3.2, 10.4
 *
 * @param request - Next.js request object
 * @param identifier - Unique identifier for rate limiting (userId, IP, etc.)
 * @param config - Rate limit configuration
 * @returns Rate limit result or error response
 */
export async function applyRateLimit(
  request: NextRequest,
  identifier: string,
  config: RateLimitConfig
): Promise<
  | { success: true; result: RateLimitResult }
  | { success: false; response: NextResponse }
> {
  try {
    const result = await checkRateLimit(identifier, config);

    if (!result.allowed) {
      // Calculate retry-after in seconds
      const retryAfter = Math.ceil(
        (result.resetAt.getTime() - Date.now()) / 1000
      );

      // Log rate limit violation
      console.warn("Rate limit exceeded:", {
        identifier,
        config: config.keyPrefix,
        resetAt: result.resetAt.toISOString(),
        path: request.nextUrl.pathname,
      });

      // Return 429 with retry-after header
      const response = createErrorResponse(
        "RATE_LIMIT_EXCEEDED",
        result.error || "Too many requests. Please try again later.",
        429,
        {
          retryAfter,
          resetAt: result.resetAt.toISOString(),
          remaining: result.remaining,
        }
      );

      response.headers.set("Retry-After", retryAfter.toString());
      response.headers.set("X-RateLimit-Limit", config.maxRequests.toString());
      response.headers.set("X-RateLimit-Remaining", "0");
      response.headers.set(
        "X-RateLimit-Reset",
        Math.floor(result.resetAt.getTime() / 1000).toString()
      );

      return {
        success: false,
        response,
      };
    }

    return {
      success: true,
      result,
    };
  } catch (error) {
    console.error("Rate limit middleware error:", error);
    // Fail open - allow request if rate limiting fails
    return {
      success: true,
      result: {
        allowed: true,
        remaining: 0,
        resetAt: new Date(Date.now() + 60_000),
      },
    };
  }
}

/**
 * Add rate limit headers to a successful response
 * Requirements: 3.2
 *
 * @param response - Next.js response object
 * @param result - Rate limit result
 * @param config - Rate limit configuration
 * @returns Response with rate limit headers
 */
export function addRateLimitHeaders(
  response: NextResponse,
  result: RateLimitResult,
  config: RateLimitConfig
): NextResponse {
  response.headers.set("X-RateLimit-Limit", config.maxRequests.toString());
  response.headers.set("X-RateLimit-Remaining", result.remaining.toString());
  response.headers.set(
    "X-RateLimit-Reset",
    Math.floor(result.resetAt.getTime() / 1000).toString()
  );

  return response;
}

/**
 * Helper to extract user ID from request
 * Can be extended to support different auth methods
 *
 * @param request - Next.js request object
 * @returns User ID or null
 */
export function getUserIdFromRequest(request: NextRequest): string | null {
  // Try to get from auth header
  const authHeader = request.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    // This would need to be decoded from JWT or validated against DB
    // For now, return a placeholder
    return null;
  }

  // Fallback to IP address for anonymous rate limiting
  const forwarded = request.headers.get("x-forwarded-for");
  const ip = forwarded ? forwarded.split(",")[0] : "unknown";

  return ip;
}

/**
 * Get rate limit config based on user role
 * Requirements: 3.1
 *
 * @param role - User role (user, agent, admin, owner)
 * @returns Rate limit configuration
 */
export function getRateLimitConfig(
  role: "user" | "agent" | "admin" | "owner"
): RateLimitConfig {
  switch (role) {
    case "owner":
      return {
        maxRequests: 100,
        windowMs: 60 * 1000, // 1 minute
        keyPrefix: "ratelimit:owner:minute",
      };
    case "admin":
      return {
        maxRequests: 50,
        windowMs: 60 * 1000, // 1 minute
        keyPrefix: "ratelimit:admin:minute",
      };
    case "agent":
      return {
        maxRequests: 30,
        windowMs: 60 * 1000, // 1 minute
        keyPrefix: "ratelimit:agent:minute",
      };
    default:
      return {
        maxRequests: 20,
        windowMs: 60 * 1000, // 1 minute
        keyPrefix: "ratelimit:user:minute",
      };
  }
}
