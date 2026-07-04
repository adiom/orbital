import { config } from "dotenv";
config({ path: ".env.local" });

import postgres from "postgres";
import { hash } from "bcrypt-ts";
import { randomBytes } from "crypto";

const sql = postgres(process.env.POSTGRES_URL!, { prepare: false });

function generateKey(env: "live" | "test" = "live"): string {
  const prefix = `avr_${env}`;
  const randomPart = randomBytes(24).toString("base64url");
  return `${prefix}_${randomPart}`;
}

function getKeyPrefix(key: string): string {
  const parts = key.split("_");
  const randomPart = parts.slice(2).join("_");
  return `${parts[0]}_${parts[1]}_${randomPart.substring(0, 4)}`;
}

async function main() {
  const userId = "fd83876c-b3ae-46f6-9bd5-cec8a67f4716";
  const plainKey = generateKey("live");
  const keyHash = await hash(plainKey, 12);
  const prefix = getKeyPrefix(plainKey);
  const permissions = { resources: true, tools: true, admin: true };

  const [record] = await sql`
    INSERT INTO "ApiKey" ("userId", name, "keyHash", prefix, permissions)
    VALUES (${userId}, 'mcp-cli', ${keyHash}, ${prefix}, ${sql.json(permissions)})
    RETURNING id, prefix
  `;

  console.log("✅ API Key created!");
  console.log("Key ID:", record.id);
  console.log("API Key:", plainKey);
  console.log("");
  console.log("⚠️  Save this key now — it won't be shown again!");
  
  await sql.end();
}

main().catch(console.error);
