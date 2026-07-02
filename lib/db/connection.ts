import { config } from "dotenv";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

config({
  path: ".env.local",
});

if (!process.env.POSTGRES_URL) {
  throw new Error("POSTGRES_URL environment variable is not set");
}

const client = postgres(process.env.POSTGRES_URL, {
  prepare: false,
  max: Number.parseInt(process.env.POSTGRES_MAX_CONNECTIONS || "1", 10),
});

export const db = drizzle(client);
