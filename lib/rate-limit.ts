// Простой in-memory rate limiter
const attempts = new Map<string, { count: number; resetTime: number }>();

export function checkRateLimit(
  key: string,
  maxAttempts = 5,
  windowMs: number = 15 * 60 * 1000 // 15 минут
): { allowed: boolean; remaining: number; resetTime: number } {
  const now = Date.now();
  const record = attempts.get(key);

  if (!record || now > record.resetTime) {
    // Новое окно или первая попытка
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

  // Увеличиваем счетчик
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
