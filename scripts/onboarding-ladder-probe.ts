/**
 * Splits the onboarding ladder by account kind, to see whether the wall of
 * silent invitations is real users or leftover e2e runs.
 *
 *   pnpm tsx scripts/onboarding-ladder-probe.ts
 */
import { config } from "dotenv";
import postgres from "postgres";

config({ path: ".env.local" });

const sql = postgres(process.env.POSTGRES_URL as string, {
  prepare: false,
  max: 1,
});

const E2E = "e2e-%@example.com";

type Row = {
  email: string;
  answers: number;
  completed: string | null;
  createdAt: Date;
};

function ladderOf(rows: Row[]): number[] {
  return [1, 2, 3, 4, 5].map(
    (step) => rows.filter((row) => row.answers >= step).length
  );
}

function report(title: string, rows: Row[]) {
  const silent = rows.filter((row) => row.answers === 0).length;
  const done = rows.filter((row) => row.completed === "true").length;

  console.log(`\n${title}`);
  console.log(`  invited: ${rows.length}  silent: ${silent}  completed: ${done}`);
  console.log(`  ladder: ${ladderOf(rows).join(" → ")}`);
}

async function main() {
  // One row per invited person: how many messages they wrote themselves in
  // their onboarding space, minus the scripted "@гид Привет!".
  const rows = (await sql`
    select
      u.email,
      u."createdAt" as "createdAt",
      (u.settings -> 'onboarding' ->> 'completed') as completed,
      greatest(count(m.id)::int - 1, 0) as answers
    from "User" u
    join "Sfera" s on s.id = (u.settings -> 'onboarding' ->> 'sferaId')::uuid
    left join "SferaMessage" m on m."sferaId" = s.id and m."userId" = u.id
    group by u.id, u.email, u."createdAt", u.settings
  `) as unknown as Row[];

  const isE2E = (email: string) =>
    /^e2e-.*@example\.com$/i.test(email);

  const e2e = rows.filter((row) => isE2E(row.email));
  const real = rows.filter((row) => !isE2E(row.email));

  report("ALL invited", rows);
  report("e2e-*@example.com", e2e);
  report("real accounts", real);

  console.log("\nreal accounts, one per line:");
  for (const row of [...real].sort((a, b) => b.answers - a.answers)) {
    const day = row.createdAt.toISOString().slice(0, 10);
    console.log(
      `  ${row.answers} ans  ${row.completed === "true" ? "дошёл" : "     "}  ${day}  ${row.email}`
    );
  }

  // Are there other synthetic-looking accounts beyond the e2e pattern?
  const [{ n: exampleCom }] = await sql`
    select count(*)::int as n from "User"
    where email like '%@example.com' and email not like ${E2E}`;
  console.log(`\nother @example.com accounts: ${exampleCom}`);

  await sql.end();
}

main();
