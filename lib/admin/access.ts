import "server-only";

import { auth } from "@/app/(auth)/auth";

/**
 * Admin access is granted by email allow-list in the ADMIN_EMAILS env var
 * (comma-separated). There is no isAdmin column in the User table yet, and
 * adding one would require a migration.
 */
function adminEmails(): string[] {
  return (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

export function isAdminEmail(email?: string | null): boolean {
  if (!email) {
    return false;
  }
  return adminEmails().includes(email.toLowerCase());
}

export type AdminSession = {
  userId: string;
  email: string;
};

/**
 * Returns the session when the caller is an admin, otherwise null.
 * Callers decide how to respond (404 for pages, 401/403 for API routes).
 */
export async function requireAdmin(): Promise<AdminSession | null> {
  const session = await auth();
  const email = session?.user?.email;

  if (!session?.user?.id || !isAdminEmail(email)) {
    return null;
  }

  return { userId: session.user.id, email: email as string };
}
