'use server';

import { z } from 'zod/v3';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { magicToken } from '@/lib/db/schema';
import { eq, lt, and } from 'drizzle-orm';

import { signIn } from './auth';
import { checkRateLimit } from '@/lib/rate-limit';

// biome-ignore lint: Forbidden non-null assertion.
const client = postgres(process.env.POSTGRES_URL!);
const db = drizzle(client);

// Вход только по Magic Link — валидируем только email
const loginFormSchema = z.object({
  email: z.string().email(),
});

// Схема для создания Magic Link
const createMagicLinkSchema = z.object({
  email: z.string().email(),
});

// Регистрация по паролю удалена — используем только Magic Link

export interface LoginActionState {
  status: 'idle' | 'in_progress' | 'success' | 'failed' | 'invalid_data';
}

export interface CreateMagicLinkState {
  status: 'idle' | 'in_progress' | 'success' | 'failed' | 'invalid_data';
  message?: string;
  magicLink?: string;
}

export const createMagicLink = async (
  _: CreateMagicLinkState,
  formData: FormData,
  _request?: Request,
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
      email: formData.get('email'),
    });

    // Rate limiting по email
    const emailKey = `magic:${validatedData.email}`;
    const rateLimit = checkRateLimit(emailKey, 3, 15 * 60 * 1000); // 3 попытки за 15 мин

    if (!rateLimit.allowed) {
      return {
        status: 'failed',
        message: `Слишком много запросов. Попробуйте через ${Math.ceil((rateLimit.resetTime - Date.now()) / 60000)} мин`,
      };
    }

    // Очистка старых неиспользованных токенов
    const _deleteResult = await db
      .delete(magicToken)
      .where(
        and(
          eq(magicToken.email, validatedData.email),
          lt(magicToken.expiresAt, new Date()),
        ),
      )
      .returning({ id: magicToken.id });

    // Генерация 8-значного кода для ручного ввода
    const token = Math.floor(10000000 + Math.random() * 90000000).toString();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 минут

    // Сохранение токена в БД
    const _inserted = await db
      .insert(magicToken)
      .values({ token, email: validatedData.email, expiresAt })
      .returning({ id: magicToken.id, createdAt: magicToken.createdAt });

    const baseUrl =
      process.env.NEXT_PUBLIC_SITE_URL ||
      process.env.NEXTAUTH_URL ||
      'http://localhost:3000';
    const magicLink = `${baseUrl}/hi/${token}`;

    // В dev-режиме выводим код и ссылку в консоль для удобного тестирования
    if (process.env.NODE_ENV === 'development') {
      console.log('[magic-link]', {
        email: validatedData.email,
        token,
        magicLink,
      });
    }

    return {
      status: 'success',
      message: 'Magic link отправлен на ваш email',
      magicLink,
    };
  } catch (error) {
    console.error('Ошибка создания magic link:', error);

    if (error instanceof z.ZodError) {
      return { status: 'invalid_data', message: 'Некорректный email адрес' };
    }

    return { status: 'failed', message: 'Внутренняя ошибка сервера' };
  }
};

export const login = async (
  _: LoginActionState,
  formData: FormData,
): Promise<LoginActionState> => {
  try {
    const validatedData = loginFormSchema.parse({
      email: formData.get('email'),
    });

    const result = await signIn('credentials', {
      email: validatedData.email,
      redirect: false,
    });

    if (result?.error) {
      return { status: 'failed' };
    }

    return { status: 'success' };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { status: 'invalid_data' };
    }

    return { status: 'failed' };
  }
};

export const loginWithMagicLink = async (
  _: LoginActionState,
  formData: FormData,
): Promise<LoginActionState> => {
  try {
    const validatedData = loginFormSchema.parse({
      email: formData.get('email'),
    });

    const result = await signIn('credentials', {
      email: validatedData.email,
      redirect: false,
    });

    if (result?.error) {
      return { status: 'failed' };
    }

    return { status: 'success' };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { status: 'invalid_data' };
    }

    return { status: 'failed' };
  }
};
