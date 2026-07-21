import { sql } from "drizzle-orm";
import { isAiConfigured } from "@/lib/ai/providers";
import { db } from "@/lib/db";
import { getRedisClient } from "@/lib/redis/client";

export const dynamic = "force-dynamic";

type ComponentStatus = "ok" | "down" | "not_configured";

type HealthReport = {
  status: "ok" | "degraded";
  components: {
    db: ComponentStatus;
    redis: ComponentStatus;
    ai: ComponentStatus;
  };
  checkedAt: string;
};

async function checkDb(): Promise<ComponentStatus> {
  try {
    await db.execute(sql`select 1`);
    return "ok";
  } catch (error) {
    console.error("[health] DB check failed:", error);
    return "down";
  }
}

async function checkRedis(): Promise<ComponentStatus> {
  try {
    const client = await getRedisClient();
    await client.ping();
    return "ok";
  } catch (error) {
    console.error("[health] Redis check failed:", error);
    return "down";
  }
}

/**
 * GET /api/health — lightweight liveness/readiness probe.
 * Reports real component status without invoking the paid AI model.
 * `db` down => 503; anything else degraded still returns 200 so the app
 * can surface partial-availability messaging (e.g. "Avrora недоступна").
 */
export async function GET() {
  const [dbStatus, redisStatus] = await Promise.all([checkDb(), checkRedis()]);
  const aiStatus: ComponentStatus = isAiConfigured() ? "ok" : "not_configured";

  const report: HealthReport = {
    status: dbStatus === "ok" ? "ok" : "degraded",
    components: {
      db: dbStatus,
      redis: redisStatus,
      ai: aiStatus,
    },
    checkedAt: new Date().toISOString(),
  };

  return Response.json(report, {
    status: dbStatus === "ok" ? 200 : 503,
  });
}
