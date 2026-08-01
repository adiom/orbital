import { getRedisClient } from "./client";

export type RateLimitConfig = {
  maxRequests: number;
  windowMs: number; // Time window in milliseconds
  keyPrefix: string;
};

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
  error?: string;
};

export const RATE_LIMITS = {
  // User-level limits
  USER_PER_MINUTE: {
    maxRequests: 3,
    windowMs: 60 * 1000, // 1 minute
    keyPrefix: "ratelimit:user:minute",
  },
  USER_PER_HOUR: {
    maxRequests: 20,
    windowMs: 60 * 60 * 1000, // 1 hour
    keyPrefix: "ratelimit:user:hour",
  },
  USER_TOOLS_PER_DAY: {
    maxRequests: 50,
    windowMs: 24 * 60 * 60 * 1000, // 24 hours
    keyPrefix: "ratelimit:user:tools:day",
  },
  USER_EXPENSIVE_TOOLS_PER_DAY: {
    maxRequests: 10,
    windowMs: 24 * 60 * 60 * 1000, // 24 hours
    keyPrefix: "ratelimit:user:expensive:day",
  },

  // Sfera-level limits
  SFERA_COOLDOWN: {
    maxRequests: 1,
    windowMs: 5 * 1000, // 5 seconds cooldown
    keyPrefix: "ratelimit:sfera:cooldown",
  },
} as const;

// List of expensive tools (cost > $0.10)
export const EXPENSIVE_TOOLS = [
  "generateMusic",
  "generateVideo",
];

/**
 * Check if a request is allowed within the rate limit
 */
export async function checkRateLimit(
  identifier: string,
  config: RateLimitConfig
): Promise<RateLimitResult> {
  try {
    const redis = await getRedisClient();
    const key = `${config.keyPrefix}:${identifier}`;
    const now = Date.now();
    const windowStart = now - config.windowMs;

    // Use Redis sorted set to track requests with timestamps
    // Remove old entries outside the time window
    await redis.zRemRangeByScore(key, 0, windowStart);

    // Count requests in current window
    const requestCount = await redis.zCard(key);

    if (requestCount >= config.maxRequests) {
      // Get oldest request timestamp to calculate reset time
      const oldestRequest = await redis.zRangeWithScores(key, 0, 0);
      const resetAt =
        oldestRequest.length > 0
          ? new Date(Number(oldestRequest[0].score) + config.windowMs)
          : new Date(now + config.windowMs);

      return {
        allowed: false,
        remaining: 0,
        resetAt,
        error: `Rate limit exceeded. Try again after ${resetAt.toISOString()}`,
      };
    }

    // Add current request
    await redis.zAdd(key, { score: now, value: `${now}` });

    // Set expiry on the key
    await redis.expire(key, Math.ceil(config.windowMs / 1000));

    return {
      allowed: true,
      remaining: config.maxRequests - requestCount - 1,
      resetAt: new Date(now + config.windowMs),
    };
  } catch (error) {
    console.error("Rate limit check failed:", error);
    // Fail open - allow request if Redis is down
    return {
      allowed: true,
      remaining: 0,
      resetAt: new Date(Date.now() + 60_000),
      error: "Rate limit check unavailable",
    };
  }
}

/**
 * Check multiple rate limits for a user request
 */
export async function checkAvroraRateLimit(
  userId: string,
  sferaId: string
): Promise<RateLimitResult> {
  // Check user per-minute limit
  const minuteCheck = await checkRateLimit(userId, RATE_LIMITS.USER_PER_MINUTE);
  if (!minuteCheck.allowed) {
    return minuteCheck;
  }

  // Check user per-hour limit
  const hourCheck = await checkRateLimit(userId, RATE_LIMITS.USER_PER_HOUR);
  if (!hourCheck.allowed) {
    return hourCheck;
  }

  // Check sfera cooldown
  const sferaCheck = await checkRateLimit(sferaId, RATE_LIMITS.SFERA_COOLDOWN);
  if (!sferaCheck.allowed) {
    return {
      ...sferaCheck,
      error: "Sfera is processing another request. Please wait a few seconds.",
    };
  }

  return {
    allowed: true,
    remaining: Math.min(minuteCheck.remaining, hourCheck.remaining),
    resetAt: minuteCheck.resetAt,
  };
}

/**
 * Check rate limit for tool usage
 */
export async function checkToolRateLimit(
  userId: string,
  toolName: string
): Promise<RateLimitResult> {
  const isExpensive = EXPENSIVE_TOOLS.includes(toolName);

  // Check daily tool limit
  const toolCheck = await checkRateLimit(
    userId,
    RATE_LIMITS.USER_TOOLS_PER_DAY
  );
  if (!toolCheck.allowed) {
    return toolCheck;
  }

  // Check expensive tool limit
  if (isExpensive) {
    const expensiveCheck = await checkRateLimit(
      userId,
      RATE_LIMITS.USER_EXPENSIVE_TOOLS_PER_DAY
    );
    if (!expensiveCheck.allowed) {
      return {
        ...expensiveCheck,
        error: `Daily limit for expensive tools (${toolName}) exceeded. Resets at ${expensiveCheck.resetAt.toISOString()}`,
      };
    }
  }

  return {
    allowed: true,
    remaining: toolCheck.remaining,
    resetAt: toolCheck.resetAt,
  };
}

/**
 * Manually increment rate limit counter (for tool execution tracking)
 */
export async function incrementToolCounter(
  userId: string,
  toolName: string
): Promise<void> {
  try {
    const redis = await getRedisClient();
    const now = Date.now();

    // Increment tool counter
    const toolKey = `${RATE_LIMITS.USER_TOOLS_PER_DAY.keyPrefix}:${userId}`;
    await redis.zAdd(toolKey, { score: now, value: `${toolName}:${now}` });
    await redis.expire(
      toolKey,
      Math.ceil(RATE_LIMITS.USER_TOOLS_PER_DAY.windowMs / 1000)
    );

    // Increment expensive tool counter if applicable
    if (EXPENSIVE_TOOLS.includes(toolName)) {
      const expensiveKey = `${RATE_LIMITS.USER_EXPENSIVE_TOOLS_PER_DAY.keyPrefix}:${userId}`;
      await redis.zAdd(expensiveKey, {
        score: now,
        value: `${toolName}:${now}`,
      });
      await redis.expire(
        expensiveKey,
        Math.ceil(RATE_LIMITS.USER_EXPENSIVE_TOOLS_PER_DAY.windowMs / 1000)
      );
    }
  } catch (error) {
    console.error("Failed to increment tool counter:", error);
  }
}
