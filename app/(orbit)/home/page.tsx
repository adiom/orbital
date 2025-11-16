"use client";

import { redirect } from "next/navigation";
import { useSession } from "next-auth/react";
import { OrbitHomeDashboard } from "@/components/orbit-new-home/orbit-home-dashboard";

export default function OrbitHomePage() {
  const { status } = useSession();

  if (status === "unauthenticated") {
    redirect("/login");
  }

  return <OrbitHomeDashboard />;
}
