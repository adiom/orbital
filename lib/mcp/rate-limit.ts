import { checkRateLimit, type RateLimitResult } from "@/lib/redis/rate-limiter";

// MCP-specific rate limits
export const MCP_RATE_LIMITS = {
  // Free tier limits
  MCP_FREE_PER_MINUTE: {
    maxRequests: 20,
    windowMs: 60 * 1000, // 1 minute
    keyPrefix: "ratelimit:mcp:free:minute",
  },
  MCP_FREE_PER_HOUR: {
    maxRequests: 500,
    windowMs: 60 * 60 * 1000, // 1 hour
    keyPrefix: "ratelimit:mcp:free:hour",
  },
  MCP_FREE_PER_DAY: {
    maxRequests: 5000,
    windowMs: 24 * 60 * 60 * 1000, // 24 hours
    keyPrefix: "ratelimit:mcp:free:day",
  },

  // Pro tier limits
  MCP_PRO_PER_MINUTE: {
    maxRequests: 60,
    windowMs: 60 * 1000, // 1 minute
    keyPrefix: "ratelimit:mcp:pro:minute",
  },
  MCP_PRO_PER_HOUR: {
    maxRequests: 2000,
    windowMs: 60 * 60 * 1000, // 1 hour
    keyPrefix: "ratelimit:mcp:pro:hour",
  },
  MCP_PRO_PER_DAY: {
    maxRequests: 20_000,
    windowMs: 24 * 60 * 60 * 1000, // 24 hours
    keyPrefix: "ratelimit:mcp:pro:day",
  },

  // Enterprise tier limits
  MCP_ENTERPRISE_PER_MINUTE: {
    maxRequests: 200,
    windowMs: 60 * 1000, // 1 minute
    keyPrefix: "ratelimit:mcp:enterprise:minute",
  },
  MCP_ENTERPRISE_PER_HOUR: {
    maxRequests: 10_000,
    windowMs: 60 * 60 * 1000, // 1 hour
    keyPrefix: "ratelimit:mcp:enterprise:hour",
  },
  MCP_ENTERPRISE_PER_DAY: {
    maxRequests: 100_000,
    windowMs: 24 * 60 * 60 * 1000, // 24 hours
    keyPrefix: "ratelimit:mcp:enterprise:day",
  },

  // Tool-specific limits (across all tiers)
  MCP_EXPENSIVE_TOOLS_PER_HOUR: {
    maxRequests: 20,
    windowMs: 60 * 60 * 1000, // 1 hour
    keyPrefix: "ratelimit:mcp:expensive:hour",
  },
} as const;

/**
 * Check MCP rate limits based on user tier
 * @param userId - The user's ID
 * @param tier - The user's tier (from mcpQuota)
 * @param isExpensiveTool - Whether this is an expensive tool call
 * @returns Rate limit result
 */
export async function checkMcpRateLimit(
  userId: string,
  tier: "free" | "pro" | "enterprise" = "free",
  isExpensiveTool = false
): Promise<RateLimitResult> {
  // Get the appropriate limits based on tier
  const limits = {
    free: {
      minute: MCP_RATE_LIMITS.MCP_FREE_PER_MINUTE,
      hour: MCP_RATE_LIMITS.MCP_FREE_PER_HOUR,
      day: MCP_RATE_LIMITS.MCP_FREE_PER_DAY,
    },
    pro: {
      minute: MCP_RATE_LIMITS.MCP_PRO_PER_MINUTE,
      hour: MCP_RATE_LIMITS.MCP_PRO_PER_HOUR,
      day: MCP_RATE_LIMITS.MCP_PRO_PER_DAY,
    },
    enterprise: {
      minute: MCP_RATE_LIMITS.MCP_ENTERPRISE_PER_MINUTE,
      hour: MCP_RATE_LIMITS.MCP_ENTERPRISE_PER_HOUR,
      day: MCP_RATE_LIMITS.MCP_ENTERPRISE_PER_DAY,
    },
  };

  const tierLimits = limits[tier];

  // Check per-minute limit
  const minuteCheck = await checkRateLimit(userId, tierLimits.minute);
  if (!minuteCheck.allowed) {
    return {
      ...minuteCheck,
      error: `Rate limit exceeded (${tier} tier). Try again in ${Math.ceil(
        (minuteCheck.resetAt.getTime() - Date.now()) / 1000
      )} seconds.`,
    };
  }

  // Check per-hour limit
  const hourCheck = await checkRateLimit(userId, tierLimits.hour);
  if (!hourCheck.allowed) {
    return {
      ...hourCheck,
      error: `Hourly rate limit exceeded (${tier} tier). Resets at ${hourCheck.resetAt.toLocaleTimeString()}.`,
    };
  }

  // Check per-day limit
  const dayCheck = await checkRateLimit(userId, tierLimits.day);
  if (!dayCheck.allowed) {
    return {
      ...dayCheck,
      error: `Daily rate limit exceeded (${tier} tier). Resets at ${dayCheck.resetAt.toLocaleString()}.`,
    };
  }

  // Check expensive tool limit if applicable
  if (isExpensiveTool) {
    const expensiveCheck = await checkRateLimit(
      userId,
      MCP_RATE_LIMITS.MCP_EXPENSIVE_TOOLS_PER_HOUR
    );
    if (!expensiveCheck.allowed) {
      return {
        ...expensiveCheck,
        error: `Expensive tool hourly limit exceeded. Resets at ${expensiveCheck.resetAt.toLocaleTimeString()}.`,
      };
    }
  }

  // All checks passed
  return {
    allowed: true,
    remaining: Math.min(
      minuteCheck.remaining,
      hourCheck.remaining,
      dayCheck.remaining
    ),
    resetAt: minuteCheck.resetAt,
  };
}

/**
 * Get rate limit headers for the response
 * @param result - The rate limit result
 * @param tier - The user's tier
 * @returns Headers to include in the response
 */
export function getRateLimitHeaders(
  result: RateLimitResult,
  tier: "free" | "pro" | "enterprise" = "free"
): Record<string, string> {
  const limits = {
    free: MCP_RATE_LIMITS.MCP_FREE_PER_MINUTE.maxRequests,
    pro: MCP_RATE_LIMITS.MCP_PRO_PER_MINUTE.maxRequests,
    enterprise: MCP_RATE_LIMITS.MCP_ENTERPRISE_PER_MINUTE.maxRequests,
  };

  return {
    "X-RateLimit-Limit": limits[tier].toString(),
    "X-RateLimit-Remaining": result.remaining.toString(),
    "X-RateLimit-Reset": result.resetAt.toISOString(),
    "X-RateLimit-Tier": tier,
  };
}
