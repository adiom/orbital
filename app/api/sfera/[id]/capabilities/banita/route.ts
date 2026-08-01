import "server-only";

import { and, eq, sql } from "drizzle-orm";
import { auth } from "@/app/(auth)/auth";
import type { ToolResult } from "@/components/chat/shared-message-type";
import { generateBanitaImage } from "@/lib/capabilities/banita";
import { BanitaError } from "@/lib/capabilities/types";
import { BANITA_DISPLAY_NAME, BANITA_EMAIL, BANITA_USER_ID } from "@/lib/constants/system-users";
import { db } from "@/lib/db";
import { sfera, sferaMember, sferaMessage, user } from "@/lib/db/schema";

type RouteContext = { params: Promise<{ id: string }> };
type ApprovalAction = "approve" | "deny";

function findApproval(results: unknown, approvalId: string) {
  if (!Array.isArray(results)) return null;
  return results.find(
    (item): item is ToolResult =>
      Boolean(item) &&
      typeof item === "object" &&
      (item as ToolResult).toolName === "banitaApproval" &&
      (item as ToolResult).approvalId === approvalId,
  ) ?? null;
}

function replaceApproval(results: unknown, approvalId: string, status: ToolResult["status"]) {
  if (!Array.isArray(results)) return [];
  return results.map((item) => {
    if (!item || typeof item !== "object") return item;
    const result = item as ToolResult;
    return result.toolName === "banitaApproval" && result.approvalId === approvalId
      ? { ...result, status }
      : result;
  });
}

function publicError(error: unknown) {
  if (!(error instanceof BanitaError)) return "BANITA не смогла создать изображение";
  switch (error.code) {
    case "BANITA_NOT_CONFIGURED":
    case "BANITA_UNAUTHORIZED":
      return "Рисование временно не настроено";
    case "BANITA_TIMEOUT":
      return "BANITA не ответила за отведённое время";
    case "BANITA_INVALID_RESPONSE":
      return "BANITA вернула некорректный результат";
    case "IMAGE_CAPABILITY_DISABLED":
      return "Рисование временно отключено";
    default:
      return "BANITA не смогла создать изображение";
  }
}

export async function POST(request: Request, context: RouteContext) {
  const session = await auth();
  if (!session?.user?.id) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id: sferaId } = await context.params;
  const body = (await request.json().catch(() => null)) as {
    messageId?: string;
    approvalId?: string;
    action?: ApprovalAction;
  } | null;
  if (!body?.messageId || !body.approvalId || !["approve", "deny"].includes(body.action ?? "")) {
    return Response.json({ error: "Invalid approval payload" }, { status: 400 });
  }

  const [membership] = await db.select({ userId: sferaMember.userId }).from(sferaMember).where(
    and(eq(sferaMember.sferaId, sferaId), eq(sferaMember.userId, session.user.id)),
  ).limit(1);
  if (!membership) return Response.json({ error: "Forbidden" }, { status: 403 });

  const action = body.action as ApprovalAction;
  const prepared = await db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${body.approvalId}))`);
    const [message] = await tx.select().from(sferaMessage).where(
      and(
        eq(sferaMessage.id, body.messageId as string),
        eq(sferaMessage.sferaId, sferaId),
        eq(sferaMessage.userId, session.user.id),
      ),
    ).limit(1);
    if (!message) return { kind: "missing" as const };

    const approval = findApproval(message.toolResults, body.approvalId as string);
    if (!approval) return { kind: "missing" as const };
    if (approval.status !== "requested") return { kind: "settled" as const, status: approval.status };

    if (action === "deny") {
      await tx.update(sferaMessage).set({
        toolResults: replaceApproval(message.toolResults, body.approvalId as string, "denied") as never,
        updatedAt: new Date(),
      }).where(eq(sferaMessage.id, message.id));
      return { kind: "denied" as const };
    }

    const prompt = typeof approval.generationPrompt === "string"
      ? approval.generationPrompt.trim()
      : typeof approval.prompt === "string"
        ? approval.prompt.trim()
        : "";
    if (!prompt) return { kind: "empty" as const };

    await tx.update(sferaMessage).set({
      toolResults: replaceApproval(message.toolResults, body.approvalId as string, "approved") as never,
      updatedAt: new Date(),
    }).where(eq(sferaMessage.id, message.id));

    await tx.insert(user).values({
      id: BANITA_USER_ID,
      email: BANITA_EMAIL,
      name: BANITA_DISPLAY_NAME,
      displayName: BANITA_DISPLAY_NAME,
    }).onConflictDoNothing();
    await tx.insert(sferaMember).values({ sferaId, userId: BANITA_USER_ID, role: "member" }).onConflictDoNothing();
    const [banitaMessage] = await tx.insert(sferaMessage).values({
      sferaId,
      userId: BANITA_USER_ID,
      content: "",
      messageType: "system",
      parentMessageId: message.id,
      isGenerating: true,
      idempotencyKey: `banita:${body.approvalId}`,
    }).returning();
    return { kind: "approved" as const, prompt, messageId: banitaMessage.id };
  });

  if (prepared.kind === "missing") return Response.json({ error: "Approval not found" }, { status: 404 });
  if (prepared.kind === "settled") return Response.json({ ok: true, status: prepared.status });
  if (prepared.kind === "empty") return Response.json({ error: "IMAGE_PROMPT_EMPTY" }, { status: 400 });
  if (prepared.kind === "denied") return Response.json({ ok: true, status: "denied", message: "Генерация отменена" });

  try {
    const result = await generateBanitaImage(prepared.prompt, request.signal);
    await db.update(sferaMessage).set({
      content: "Готово",
      isGenerating: false,
      toolResults: [{
        toolName: "generateImage",
        success: true,
        imageUrl: result.imageUrl,
        prompt: result.prompt,
        model: result.model,
        executionTimeMs: result.executionTimeMs,
        providerStatus: "completed",
      }],
      updatedAt: new Date(),
    }).where(eq(sferaMessage.id, prepared.messageId));
    await db.update(sfera).set({ updatedAt: new Date() }).where(eq(sfera.id, sferaId));
    return Response.json({ ok: true, status: "completed", messageId: prepared.messageId });
  } catch (error) {
    const message = publicError(error);
    const code = error instanceof BanitaError ? error.code : "BANITA_HTTP_ERROR";
    await db.update(sferaMessage).set({
      content: message,
      isGenerating: false,
      toolResults: [{ toolName: "generateImage", success: false, error: message, providerStatus: code }],
      updatedAt: new Date(),
    }).where(eq(sferaMessage.id, prepared.messageId));
    return Response.json({ ok: false, error: message, code, messageId: prepared.messageId }, { status: 502 });
  }
}
