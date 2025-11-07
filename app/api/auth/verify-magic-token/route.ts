'use server';

import { NextRequest, NextResponse } from 'next/server';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { magicToken, user } from '@/lib/db/schema';
import { eq, and, gt } from 'drizzle-orm';
import { signIn } from '@/app/(auth)/auth';

// biome-ignore lint: Forbidden non-null assertion.
const client = postgres(process.env.POSTGRES_URL!);
const db = drizzle(client);

export async function POST(request: NextRequest) {
  try {
    const { token, email } = await request.json();

    if (!token || !email) {
      return NextResponse.json({ success: false, error: 'Missing token or email' }, { status: 400 });
    }

    // Найти токен в БД
    const [foundToken] = await db
      .select()
      .from(magicToken)
      .where(
        and(
          eq(magicToken.token, token),
          eq(magicToken.email, email),
          eq(magicToken.used, false),
          gt(magicToken.expiresAt, new Date())
        )
      )
      .limit(1);

    if (!foundToken) {
      return NextResponse.json({ success: false, error: 'Invalid or expired token' }, { status: 401 });
    }

    // Найти или создать пользователя
    let [existingUser] = await db
      .select()
      .from(user)
      .where(eq(user.email, email))
      .limit(1);

    if (!existingUser) {
      // Создать нового пользователя
      const [newUser] = await db
        .insert(user)
        .values({ email })
        .returning();
      existingUser = newUser;
    }

    // Пометить токен как использованный
    await db
      .update(magicToken)
      .set({ used: true })
      .where(eq(magicToken.id, foundToken.id));

    // Создать сессию через NextAuth
    await signIn('credentials', {
      email: existingUser.email,
      password: process.env.DUMMY_PASSWORD || 'dummy',
      redirect: false,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error verifying magic token:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
