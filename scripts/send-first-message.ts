import { db } from "@/lib/db";
import { sferaMessage } from "@/lib/db/schema";

const CLAUDE_USER_ID = "92d17d8a-bf3d-42cb-b8bb-3029226fd2aa";
const SFERA_ID = "651c5547-81fd-4547-89f8-9ed269da4e33";

async function sendFirstMessage() {
  console.log("📝 Sending first message to AVRORA DEV...");

  await db.insert(sferaMessage).values({
    sferaId: SFERA_ID,
    userId: CLAUDE_USER_ID,
    content:
      "🚀 **AVRORA DEV Sfera initialized**\n\nThis Sfera will log all Claude Code MCP tool executions.\n\n**Logging includes:**\n- Tool name and arguments\n- Execution time\n- Success/failure status\n- Results or error messages\n\nAll actions will be visible here for audit and discussion.",
    attachments: [],
    toolResults: [],
  });

  console.log("✅ First message sent to AVRORA DEV");
  process.exit(0);
}

sendFirstMessage();
