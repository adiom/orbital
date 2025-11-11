import { tool } from "ai";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { sferaMessage } from "@/lib/db/schema";

// Schema for editing mini-app code
const editMiniAppInput = z.object({
  messageId: z
    .string()
    .uuid()
    .describe("UUID of the message containing the mini-app"),
  miniAppId: z.string().uuid().describe("UUID of the mini-app to edit"),
  reactCode: z
    .string()
    .min(10)
    .describe(
      "The new React code for the mini-app. Must be valid React/JSX code."
    ),
  changeDescription: z
    .string()
    .optional()
    .describe("Description of what was changed in the code"),
});

export const editMiniApp = tool({
  description:
    "Edit the React code of an existing mini-app. " +
    "Use this tool when a user asks to modify, update, fix, or improve a mini-app. " +
    "You can add new features, fix bugs, change styling, or refactor the code. " +
    "The code must be valid React/JSX and should follow the same structure as the original.",
  inputSchema: editMiniAppInput,
  execute: async ({
    messageId,
    miniAppId,
    reactCode,
    changeDescription,
  }) => {
    try {
      // Get the message
      const [messageData] = await db
        .select({
          id: sferaMessage.id,
          toolResults: sferaMessage.toolResults,
        })
        .from(sferaMessage)
        .where(eq(sferaMessage.id, messageId))
        .limit(1);

      if (!messageData) {
        return {
          toolName: "edit-mini-app",
          success: false,
          error: "Message not found",
        };
      }

      // Find and update the mini-app in toolResults
      const toolResults = messageData.toolResults as any[];
      let miniAppFound = false;

      const updatedToolResults = toolResults.map((result) => {
        if (result.toolName === "create-mini-app" && result.id === miniAppId) {
          miniAppFound = true;
          return {
            ...result,
            reactCode,
            editedAt: new Date().toISOString(),
            changeDescription,
          };
        }
        return result;
      });

      if (!miniAppFound) {
        return {
          toolName: "edit-mini-app",
          success: false,
          error: "Mini-app not found in message",
        };
      }

      // Update the message
      await db
        .update(sferaMessage)
        .set({
          toolResults: updatedToolResults as any,
          updatedAt: new Date(),
        })
        .where(eq(sferaMessage.id, messageId));

      return {
        toolName: "edit-mini-app",
        success: true,
        message: "Mini-app code updated successfully",
        messageId,
        miniAppId,
        changeDescription,
      };
    } catch (error) {
      console.error("❌ [edit-mini-app] Error:", error);
      return {
        toolName: "edit-mini-app",
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to update mini-app code",
      };
    }
  },
});
