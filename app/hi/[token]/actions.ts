'use server';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { magicToken, user } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

// biome-ignore lint: Forbidden non-null assertion.
const client = postgres(process.env.POSTGRES_URL!);
const db = drizzle(client);

export async function validateMagicToken(token: string) {
  if (!token) {
    return null;
  }

  // Поиск токена в БД
  const tokens = await db
    .select()
    .from(magicToken)
    .where(eq(magicToken.token, token))
    .limit(1);

  if (tokens.length === 0) {
    return null;
  }

  const [tokenRecord] = tokens;

  // Проверка срока действия
  if (tokenRecord.expiresAt < new Date()) {
    return null;
  }

  // Проверка использования
  if (tokenRecord.used) {
    return null;
  }

  // Поиск или создание пользователя
  const users = await db
    .select()
    .from(user)
    .where(eq(user.email, tokenRecord.email))
    .limit(1);

  let userId: string;

  if (users.length === 0) {
    // Создание нового пользователя
    const newUsers = await db
      .insert(user)
      .values({
        email: tokenRecord.email,
      })
      .returning({ id: user.id });

    userId = newUsers[0].id;
  } else {
    userId = users[0].id;
  }

  // Помечаем токен как использованный
  await db
    .update(magicToken)
    .set({ used: true })
    .where(eq(magicToken.token, token));

  return {
    email: tokenRecord.email,
    userId,
  };
}
