"use server";

import { cookies } from "next/headers";
import type { VisibilityType } from "@/components/visibility-selector";
import { updateChatVisibilityById } from "@/lib/db/queries";

export async function saveChatModelAsCookie(modelId: string) {
  const cookieStore = await cookies();
  cookieStore.set("chat-model", modelId, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365, // 1 year
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
}

export async function updateChatVisibility({
  chatId,
  visibility,
}: {
  chatId: string;
  visibility: VisibilityType;
}) {
  return await updateChatVisibilityById({ chatId, visibility });
}
