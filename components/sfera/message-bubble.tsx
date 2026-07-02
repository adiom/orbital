"use client";

import React from "react";
import { cn } from "@/lib/utils";

type Role = "user" | "assistant";

interface MessageBubbleProps {
  role: Role;
  children: React.ReactNode;
}

/**
 * MessageBubble – visual wrapper for a single chat bubble.
 * Mobile‑first: full width, max‑width 100%. Desktop: max‑width 80% via `sm:max-w-[80%]`.
 */
export function MessageBubble({ role, children }: MessageBubbleProps) {
  const baseClasses = "p-3 break-words max-w-full sm:max-w-[85%] transition-all duration-200";
  const roleClasses =
    role === "user"
      ? "bg-userBubble text-white rounded-2xl rounded-tr-sm self-end shadow-sm"
      : "bg-white/80 backdrop-blur-sm text-slate-900 rounded-2xl rounded-tl-sm self-start border border-slate-200/50 shadow-sm";

  return (
    <div className={cn(baseClasses, roleClasses, "group")}>{children}</div>
  );
}
