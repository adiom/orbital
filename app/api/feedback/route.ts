import { auth } from "@/app/(auth)/auth";
import { checkRateLimit } from "@/lib/rate-limit";

const POSTMARK_API_URL = "https://api.postmarkapp.com/email";
const MAX_MESSAGE_LENGTH = 4000;

// POST /api/feedback — collect alpha-tester feedback and email it to the team.
// Uses email (not a DB table) on purpose: Vercel deploys don't auto-run
// migrations, so a new table would 500 in prod until migrated manually.
// Postmark is already configured and working in production.
export async function POST(request: Request) {
  const session = await auth();

  if (!session?.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Rate limit: 5 reports / 10 min per user to avoid abuse.
  const rate = checkRateLimit(`feedback:${session.user.id}`, 5, 10 * 60 * 1000);
  if (!rate.allowed) {
    return Response.json(
      { error: "Слишком много сообщений. Попробуйте чуть позже." },
      { status: 429 }
    );
  }

  let body: { message?: string; kind?: string; url?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const message = (body.message ?? "").trim();
  if (!message) {
    return Response.json({ error: "Сообщение пустое" }, { status: 400 });
  }
  if (message.length > MAX_MESSAGE_LENGTH) {
    return Response.json(
      { error: "Сообщение слишком длинное" },
      { status: 400 }
    );
  }

  const kind = body.kind === "idea" || body.kind === "bug" ? body.kind : "other";
  const pageUrl = typeof body.url === "string" ? body.url.slice(0, 500) : "";

  const serverToken = process.env.POSTMARK_SERVER_TOKEN;
  const fromEmail = process.env.POSTMARK_FROM_EMAIL;
  const messageStream = process.env.POSTMARK_MESSAGE_STREAM || "outbound";

  if (!(serverToken && fromEmail)) {
    // Don't lose the feedback silently — log it so it's at least in server logs.
    console.error("[feedback] Postmark not configured; feedback:", {
      userId: session.user.id,
      email: session.user.email,
      kind,
      message,
    });
    return Response.json(
      { error: "Канал обратной связи временно недоступен" },
      { status: 503 }
    );
  }

  const kindLabel =
    kind === "bug" ? "🐞 Баг" : kind === "idea" ? "💡 Идея" : "💬 Отзыв";
  const subject = `[Orbital alpha] ${kindLabel} от ${session.user.email ?? session.user.id}`;

  const escapeHtml = (s: string) =>
    s
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

  const textBody = [
    `Тип: ${kindLabel}`,
    `Пользователь: ${session.user.email ?? "—"} (${session.user.id})`,
    `Страница: ${pageUrl || "—"}`,
    "",
    message,
  ].join("\n");

  const htmlBody = `
    <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #111827;">
      <h2 style="margin: 0 0 12px;">${kindLabel}</h2>
      <p style="margin: 0 0 4px; font-size: 14px; color: #6b7280;">
        Пользователь: ${escapeHtml(session.user.email ?? "—")} (${session.user.id})
      </p>
      <p style="margin: 0 0 16px; font-size: 14px; color: #6b7280;">
        Страница: ${escapeHtml(pageUrl || "—")}
      </p>
      <div style="white-space: pre-wrap; padding: 12px; background: #f9fafb; border-radius: 8px;">${escapeHtml(
        message
      )}</div>
    </div>
  `.trim();

  const response = await fetch(POSTMARK_API_URL, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      "X-Postmark-Server-Token": serverToken,
    },
    body: JSON.stringify({
      From: fromEmail,
      To: fromEmail,
      ReplyTo: session.user.email ?? fromEmail,
      Subject: subject,
      HtmlBody: htmlBody,
      TextBody: textBody,
      MessageStream: messageStream,
      Tag: "alpha-feedback",
    }),
  });

  if (!response.ok) {
    const details = await response.text();
    console.error("[feedback] Postmark send failed:", response.status, details);
    return Response.json(
      { error: "Не удалось отправить. Попробуйте позже." },
      { status: 502 }
    );
  }

  return Response.json({ ok: true });
}
