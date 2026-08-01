/**
 * Rehearses the admin delete against real data inside a transaction that is
 * always rolled back. Proves the FK order in lib/admin/delete-user.ts holds
 * without removing anything.
 *
 *   npx tsx scripts/admin-delete-rehearsal.ts
 */
import { config } from "dotenv";
import postgres from "postgres";

config({ path: ".env.local" });

const sql = postgres(process.env.POSTGRES_URL as string, {
  prepare: false,
  max: 1,
});

const PATTERN = "e2e-%@example.com";
const TABLES = ["User", "Sfera", "SferaMessage", "SferaMember", "AiUsageLog"];

class Rollback extends Error {}

async function snapshot(): Promise<Record<string, number>> {
  const out: Record<string, number> = {};
  for (const table of TABLES) {
    const [{ n }] = await sql`select count(*)::int as n from ${sql(table)}`;
    out[table] = n;
  }
  return out;
}

async function main() {
  const ids = (
    await sql`select id from "User" where email like ${PATTERN}`
  ).map((row) => row.id);

  console.log(`target accounts: ${ids.length}`);

  if (ids.length === 0) {
    await sql.end();
    return;
  }

  const before = await snapshot();
  console.log("before:", before);

  try {
    await sql.begin(async (tx) => {
      const emails = (
        await tx`select email from "User" where id = any(${ids})`
      ).map((row) => row.email);

      const chatIds = (
        await tx`select id from "Chat" where "userId" = any(${ids})`
      ).map((row) => row.id);

      const messageIds = (
        chatIds.length > 0
          ? await tx`select id from "Message_v2" where "chatId" = any(${chatIds}) or "userId" = any(${ids})`
          : await tx`select id from "Message_v2" where "userId" = any(${ids})`
      ).map((row) => row.id);

      // --- chat side ---
      await tx`delete from "MessageMention" where "mentionedUserId" = any(${ids})`;

      if (messageIds.length > 0) {
        await tx`delete from "MessageMention" where "messageId" = any(${messageIds})`;
        await tx`delete from "Message_v2" where id = any(${messageIds})`;
      }

      if (chatIds.length > 0) {
        await tx`delete from "Message" where "chatId" = any(${chatIds})`;
        await tx`delete from "Stream" where "chatId" = any(${chatIds})`;
        await tx`delete from "ChatMember" where "chatId" = any(${chatIds})`;
      }

      await tx`delete from "ChatMember" where "userId" = any(${ids})`;
      await tx`delete from "Chat" where "userId" = any(${ids})`;

      // --- documents ---
      const docIds = (
        await tx`select id from "Document" where "userId" = any(${ids})`
      ).map((row) => row.id);

      await tx`delete from "Suggestion" where "userId" = any(${ids})`;

      if (docIds.length > 0) {
        await tx`delete from "Suggestion" where "documentId" = any(${docIds})`;
        await tx`delete from "SferaArtifact" where "documentId" = any(${docIds})`;
      }

      await tx`delete from "Document" where "userId" = any(${ids})`;

      // --- cells ---
      await tx`delete from "SferaForkedSfera" where "createdById" = any(${ids})`;
      const cells =
        await tx`delete from "Sfera" where "ownerId" = any(${ids}) returning id`;
      const strays =
        await tx`delete from "SferaMessage" where "userId" = any(${ids}) returning id`;
      await tx`delete from "ToolExecution" where "userId" = any(${ids})`;

      if (emails.length > 0) {
        await tx`delete from "MagicToken" where email = any(${emails})`;
      }

      const users =
        await tx`delete from "User" where id = any(${ids}) returning id`;

      console.log(
        `\nwould delete: cells=${cells.length} strayMessages=${strays.length} users=${users.length}`
      );

      for (const table of TABLES) {
        const [{ n }] = await tx`select count(*)::int as n from ${tx(table)}`;
        console.log(`  ${table}: ${before[table]} -> ${n}`);
      }

      const [{ n: leftover }] =
        await tx`select count(*)::int as n from "User" where email like ${PATTERN}`;
      console.log(`  e2e accounts left: ${leftover}`);

      throw new Rollback();
    });
  } catch (error) {
    if (error instanceof Rollback) {
      console.log("\nrolled back — nothing was deleted");
    } else {
      throw error;
    }
  }

  const after = await snapshot();
  const intact = JSON.stringify(before) === JSON.stringify(after);
  console.log(`db unchanged: ${intact}`);

  if (!intact) {
    console.log("after:", after);
  }

  await sql.end();
}

main();
