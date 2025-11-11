import { createClient } from "redis";

// Create Redis client singleton
let redisClient: ReturnType<typeof createClient> | null = null;

export async function getRedisClient() {
  if (redisClient) {
    return redisClient;
  }

  // Use Vercel KV or local Redis
  const redisUrl = process.env.KV_URL || process.env.REDIS_URL || "redis://localhost:6379";

  redisClient = createClient({
    url: redisUrl,
  });

  redisClient.on("error", (err) => {
    console.error("Redis Client Error:", err);
  });

  await redisClient.connect();
  console.log("✅ Redis connected successfully");

  return redisClient;
}

export async function disconnectRedis() {
  if (redisClient) {
    await redisClient.disconnect();
    redisClient = null;
  }
}
