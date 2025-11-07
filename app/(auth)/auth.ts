import { compare } from "bcrypt-ts";
import NextAuth, { type DefaultSession } from "next-auth";
import type { DefaultJWT } from "next-auth/jwt";
import Credentials from "next-auth/providers/credentials";
import { DUMMY_PASSWORD } from "@/lib/constants";
import { createGuestUser, getUser } from "@/lib/db/queries";
import { authConfig } from "./auth.config";
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { magicToken, user as userTable } from '@/lib/db/schema';
import { eq, and, gt } from 'drizzle-orm';

// biome-ignore lint: Forbidden non-null assertion.
const client = postgres(process.env.POSTGRES_URL!);
const db = drizzle(client);

export type UserType = "guest" | "regular";

declare module "next-auth" {
  interface Session extends DefaultSession {
    user: {
      id: string;
      type: UserType;
    } & DefaultSession["user"];
  }

  // biome-ignore lint/nursery/useConsistentTypeDefinitions: "Required"
  interface User {
    id?: string;
    email?: string | null;
    type: UserType;
  }
}

declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
    id: string;
    type: UserType;
  }
}

export const {
  handlers: { GET, POST },
  auth,
  signIn,
  signOut,
} = NextAuth({
  ...authConfig,
  trustHost: true,
  providers: [
    Credentials({
      credentials: {},
      async authorize(credentials: any) {
        const token = credentials?.token as string | undefined;
        const email = credentials?.email as string | undefined;
        const password = credentials?.password as string | undefined;

        // Если передан token, верифицируем magic token
        if (token) {
          const [foundToken] = await db
            .select()
            .from(magicToken)
            .where(
              and(
                eq(magicToken.token, token),
                eq(magicToken.used, false),
                gt(magicToken.expiresAt, new Date())
              )
            )
            .limit(1);

          if (!foundToken) {
            return null;
          }

          const tokenEmail = foundToken.email;

          // Найти или создать пользователя
          let [existingUser] = await db
            .select()
            .from(userTable)
            .where(eq(userTable.email, tokenEmail))
            .limit(1);

          if (!existingUser) {
            const [newUser] = await db
              .insert(userTable)
              .values({ email: tokenEmail })
              .returning();
            existingUser = newUser;
          }

          // Пометить токен как использованный
          await db
            .update(magicToken)
            .set({ used: true })
            .where(eq(magicToken.id, foundToken.id));

          return { ...existingUser, type: "regular" };
        }

        // Обычная авторизация по email/password
        if (!email || !password) {
          return null;
        }

        const users = await getUser(email);

        if (users.length === 0) {
          await compare(password, DUMMY_PASSWORD);
          return null;
        }

        const [dbUser] = users;

        if (!dbUser.password) {
          await compare(password, DUMMY_PASSWORD);
          return null;
        }

        const passwordsMatch = await compare(password, dbUser.password);

        if (!passwordsMatch) {
          return null;
        }

        return { ...dbUser, type: "regular" };
      },
    }),
    Credentials({
      id: "guest",
      credentials: {},
      async authorize() {
        const [guestUser] = await createGuestUser();
        return { ...guestUser, type: "guest" };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id as string;
        token.type = user.type;
      }

      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id;
        session.user.type = token.type;
      }

      return session;
    },
  },
});
