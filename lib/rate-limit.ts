// Rate limiter with periodic cleanup to prevent memory leaks.
// For production, use lib/redis/rate-limiter.ts instead.
// This module is kept for backward compatibility with non-Redis endpoints.

const attempts = new Map<string, { count: number; resetTime: number }>();

const CLEANUP_INTERVAL_MS = 60_000; // Clean up every 60 seconds

let lastCleanup = Date.now();

function cleanup() {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) {
    return;
  }
  lastCleanup = now;

  for (const [key, record] of attempts) {
    if (now > record.resetTime) {
      attempts.delete(key);
    }
  }
}

export function checkRateLimit(
  key: string,
  maxAttempts = 5,
  windowMs: number = 15 * 60 * 1000 // 15 минут
): { allowed: boolean; remaining: number; resetTime: number } {
  cleanup();

  const now = Date.now();
  const record = attempts.get(key);

  if (!record || now > record.resetTime) {
    attempts.set(key, { count: 1, resetTime: now + windowMs });
    return {
      allowed: true,
      remaining: maxAttempts - 1,
      resetTime: now + windowMs,
    };
  }

  if (record.count >= maxAttempts) {
    return { allowed: false, remaining: 0, resetTime: record.resetTime };
  }

  record.count++;
  attempts.set(key, record);

  return {
    allowed: true,
    remaining: maxAttempts - record.count,
    resetTime: record.resetTime,
  };
}

export function getClientIP(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  const realIP = request.headers.get("x-real-ip");

  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }

  if (realIP) {
    return realIP;
  }

  return "unknown";
}
