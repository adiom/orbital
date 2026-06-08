import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { sferaMember, user } from "@/lib/db/schema";

async function fixMembers() {
  // Find adiom@list.ru
  const [adiumUser] = await db
    .select()
    .from(user)
    .where(eq(user.email, "adiom@list.ru"))
    .limit(1);

  console.log("Found user:", adiumUser?.id, adiumUser?.email);

  if (!adiumUser) {
    console.error("User not found!");
    process.exit(1);
  }

  // Add to Sfera
  await db.insert(sferaMember).values({
    sferaId: "651c5547-81fd-4547-89f8-9ed269da4e33",
    userId: adiumUser.id,
    role: "member",
  });

  console.log("✅ Added adiom@list.ru to AVRORA DEV");
  process.exit(0);
}

fixMembers();
