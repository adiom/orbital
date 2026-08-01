"use client";

import useSWR from "swr";

async function fetchAccess(url: string): Promise<{ isAdmin: boolean }> {
  const response = await fetch(url, { credentials: "include" });
  if (!response.ok) {
    return { isAdmin: false };
  }
  return response.json();
}

/** True when the signed-in user is on the ADMIN_EMAILS allow-list. */
export function useIsAdmin(): boolean {
  const { data } = useSWR("/api/admin/access", fetchAccess, {
    revalidateOnFocus: false,
  });
  return data?.isAdmin ?? false;
}
