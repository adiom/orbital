import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { sfera, sferaMember, user } from "@/lib/db/schema";

async function setupClaudeDev() {
  console.log("🚀 Setting up Claude Dev Sfera...\n");

  try {
    // 1. Create or get claude@avrora.click user
    console.log("1️⃣  Creating claude@avrora.click user...");
    let claudeUser = await db
      .select()
      .from(user)
      .where(eq(user.email, "claude@avrora.click"))
      .limit(1)
      .then((res) => res[0]);

    if (claudeUser) {
      console.log(`   ✅ User already exists: ${claudeUser.id}`);
    } else {
      const [newUser] = await db
        .insert(user)
        .values({
          email: "claude@avrora.click",
          name: "Claude Code",
          displayName: "Claude",
          mcpEnabled: true,
          mcpQuota: {
            requestsPerHour: 1000,
            requestsPerDay: 10_000,
            tier: "enterprise",
          },
        })
        .returning();

      claudeUser = newUser;
      console.log(`   ✅ Created user: ${claudeUser.id}`);
    }

    // 2. Create AVRORA DEV Sfera
    console.log("\n2️⃣  Creating AVRORA DEV Sfera...");
    let devSfera = await db
      .select()
      .from(sfera)
      .where(eq(sfera.title, "AVRORA DEV"))
      .limit(1)
      .then((res) => res[0]);

    if (devSfera) {
      console.log(`   ✅ Sfera already exists: ${devSfera.id}`);
    } else {
      const [newSfera] = await db
        .insert(sfera)
        .values({
          title: "AVRORA DEV",
          description: "Logs of Claude Code actions and AI tool executions",
          ownerId: claudeUser.id,
          visibility: "public",
        })
        .returning();

      devSfera = newSfera;
      console.log(`   ✅ Created Sfera: ${devSfera.id}`);
    }

    // 3. Add members to Sfera
    console.log("\n3️⃣  Adding members to AVRORA DEV...");

    // Add Claude as owner (if not already)
    const claudeMember = await db
      .select()
      .from(sferaMember)
      .where((t) => eq(t.sferaId, devSfera.id) && eq(t.userId, claudeUser.id))
      .limit(1)
      .then((res) => res[0]);

    if (claudeMember) {
      console.log("   ✅ Claude already a member");
    } else {
      await db.insert(sferaMember).values({
        sferaId: devSfera.id,
        userId: claudeUser.id,
        role: "owner",
      });
      console.log("   ✅ Added Claude as owner");
    }

    // 4. Add your user
    console.log("\n4️⃣  Finding your user (adiom@list.ru)...");
    const yourUser = await db
      .select()
      .from(user)
      .where(eq(user.email, "adiom@list.ru"))
      .limit(1)
      .then((res) => res[0]);

    if (yourUser) {
      const yourMember = await db
        .select()
        .from(sferaMember)
        .where((t) => eq(t.sferaId, devSfera.id) && eq(t.userId, yourUser.id))
        .limit(1)
        .then((res) => res[0]);

      if (yourMember) {
        console.log("   ✅ adiom@list.ru already a member");
      } else {
        await db.insert(sferaMember).values({
          sferaId: devSfera.id,
          userId: yourUser.id,
          role: "member",
        });
        console.log("   ✅ Added adiom@list.ru as member");
      }
    } else {
      console.log("   ⚠️  User adiom@list.ru not found - skipping");
    }

    // 5. Output the UUID for .env.local
    console.log("\n" + "=".repeat(50));
    console.log("✨ Setup complete!");
    console.log("=".repeat(50));
    console.log("\n📝 Add this to your .env.local:\n");
    console.log(`SFERA_CLAUDE_UUID=${devSfera.id}`);
    console.log("\n");

    process.exit(0);
  } catch (error) {
    console.error("❌ Setup failed:", error);
    process.exit(1);
  }
}

setupClaudeDev();
