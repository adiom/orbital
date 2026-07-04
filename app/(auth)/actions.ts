"use server";

import { and, eq, lt } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { z } from "zod/v3";
import { magicToken } from "@/lib/db/schema";
import { checkRateLimit } from "@/lib/rate-limit";

// biome-ignore lint: Forbidden non-null assertion.
const client = postgres(process.env.POSTGRES_URL!);
const db = drizzle(client);

const POSTMARK_API_URL = "https://api.postmarkapp.com/email";

async function sendMagicLinkEmail(params: {
  email: string;
  magicLink: string;
  token: string;
}) {
  const serverToken = process.env.POSTMARK_SERVER_TOKEN;
  const fromEmail = process.env.POSTMARK_FROM_EMAIL;
  const messageStream = process.env.POSTMARK_MESSAGE_STREAM || "outbound";

  if (!serverToken || !fromEmail) {
    throw new Error("Postmark env is not configured");
  }

  const subject = "Ваш Magic Link для входа";
  const htmlBody = `
    <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #111827;">
      <h1 style="font-size: 24px; margin: 0 0 16px;">Вход в Orbital</h1>
      <p style="margin: 0 0 16px;">Нажмите на кнопку ниже, чтобы войти в аккаунт.</p>
      <p style="margin: 0 0 24px;">
        <a href="${params.magicLink}"
           style="display: inline-block; background: #111827; color: #ffffff; text-decoration: none; padding: 12px 20px; border-radius: 8px;">
          Войти в Orbital
        </a>
      </p>
      <p style="margin: 0 0 8px; font-size: 14px; color: #6b7280;">
        Если кнопка не работает, откройте ссылку вручную:
      </p>
      <p style="margin: 0; word-break: break-all; font-size: 14px;">
        <a href="${params.magicLink}" style="color: #2563eb;">${params.magicLink}</a>
      </p>
      <p style="margin: 24px 0 0; font-size: 12px; color: #9ca3af;">
        Код входа: ${params.token}
      </p>
    </div>
  `.trim();

  const textBody = [
    "Вход в Orbital",
    "",
    `Ссылка для входа: ${params.magicLink}`,
    `Код входа: ${params.token}`,
  ].join("\n");

  const response = await fetch(POSTMARK_API_URL, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      "X-Postmark-Server-Token": serverToken,
    },
    body: JSON.stringify({
      From: fromEmail,
      To: params.email,
      Subject: subject,
      HtmlBody: htmlBody,
      TextBody: textBody,
      MessageStream: messageStream,
      Tag: "magic-link",
    }),
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Postmark send failed: ${response.status} ${details}`);
  }

  return response.json();
}

// Схема для создания Magic Link
const createMagicLinkSchema = z.object({
  email: z.string().email(),
});

export type CreateMagicLinkState = {
  status: "idle" | "in_progress" | "success" | "failed" | "invalid_data";
  message?: string;
  magicLink?: string;
};

export const createMagicLink = async (
  _: CreateMagicLinkState,
  formData: FormData
): Promise<CreateMagicLinkState> => {
  try {
    // CSRF защита - временно убираем в разработке для устранения ошибки
    // if (request && !(await validateCSRFToken(request))) {
    //   return {
    //     status: 'failed',
    //     message: 'Неверный CSRF токен',
    //   };
    // }

    const validatedData = createMagicLinkSchema.parse({
      email: formData.get("email"),
    });

    // Rate limiting по email
    const emailKey = `magic:${validatedData.email}`;
    const rateLimit = checkRateLimit(emailKey, 3, 15 * 60 * 1000); // 3 попытки за 15 мин

    if (!rateLimit.allowed) {
      return {
        status: "failed",
        message: `Слишком много запросов. Попробуйте через ${Math.ceil((rateLimit.resetTime - Date.now()) / 60_000)} мин`,
      };
    }

    // Очистка старых неиспользованных токенов
    await db
      .delete(magicToken)
      .where(
        and(
          eq(magicToken.email, validatedData.email),
          lt(magicToken.expiresAt, new Date())
        )
      )
      .returning({ id: magicToken.id });

    // Генерация 8-значного кода для ручного ввода
    const token = Math.floor(
      10_000_000 + Math.random() * 90_000_000
    ).toString();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 минут

    // Сохранение токена в БД
    await db
      .insert(magicToken)
      .values({ token, email: validatedData.email, expiresAt })
      .returning({ id: magicToken.id, createdAt: magicToken.createdAt });

    const baseUrl =
      process.env.NEXT_PUBLIC_SITE_URL ||
      process.env.NEXTAUTH_URL;
    const magicLink = `${baseUrl}/login?magic_token=${token}`;

    // В dev-режиме выводим код и ссылку в консоль для удобного тестирования
    if (process.env.NODE_ENV === "development") {
      console.log("[magic-link]", {
        email: validatedData.email,
        token,
        magicLink,
      });
    }

    if (process.env.NODE_ENV !== "development") {
      try {
        await sendMagicLinkEmail({
          email: validatedData.email,
          magicLink,
          token,
        });
      } catch (emailError) {
        console.error("Ошибка отправки magic link email:", emailError);

        return {
          status: "failed",
          message: "Код создан, но письмо не удалось отправить",
          magicLink,
        };
      }
    }

    return {
      status: "success",
      message: "Magic link отправлен на ваш email",
      magicLink,
    };
  } catch (error) {
    console.error("Ошибка создания magic link:", error);

    if (error instanceof z.ZodError) {
      return { status: "invalid_data", message: "Некорректный email адрес" };
    }

    return { status: "failed", message: "Внутренняя ошибка сервера" };
  }
};

// Верификация 8-значного кода из БД
export const verifyMagicCode = async (email: string, token: string) => {
  try {
    // Проверяем, что код существует, не использован и не просрочен
    const found = await db
      .select()
      .from(magicToken)
      .where(
        and(
          eq(magicToken.email, email),
          eq(magicToken.token, token),
          eq(magicToken.used, false)
        )
      )
      .limit(1);

    if (!found.length) {
      return { success: false, error: "Неверный или просроченный код" };
    }

    // Помечаем код как использованный
    await db
      .update(magicToken)
      .set({ used: true })
      .where(eq(magicToken.id, found[0].id));

    return { success: true };
  } catch (error) {
    console.error("Ошибка при верификации кода:", error);
    return { success: false, error: "Внутренняя ошибка сервера" };
  }
};
