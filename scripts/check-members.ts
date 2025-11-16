import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { sferaMember } from "@/lib/db/schema";

async function checkMembers() {
  const result = await db
    .select()
    .from(sferaMember)
    .where(eq(sferaMember.sferaId, "651c5547-81fd-4547-89f8-9ed269da4e33"));

  console.log(JSON.stringify(result, null, 2));
  process.exit(0);
}

checkMembers();
