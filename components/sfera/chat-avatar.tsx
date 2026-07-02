"use client";

import Image from "next/image";
import React from "react";
import { AVRORA_USER_ID, CLAUDE_CODE_USER_ID } from "@/lib/constants/system-users";

interface ChatAvatarProps {
  userId?: string;
  email?: string;
}

/**
 * ChatAvatar – centralised avatar logic.
 * Mobile‑first: size‑6, desktop size‑8.
 */
export function ChatAvatar({ userId, email }: ChatAvatarProps) {
  const getSrc = () => {
    if (userId === AVRORA_USER_ID) return "/avatars/avrora.png";
    if (userId === CLAUDE_CODE_USER_ID) return "/avatars/claude-code.png";
    return "/avatars/default.png";
  };

  const src = getSrc();
  const alt = email ?? "User";

  return (
    <Image
      src={src}
      alt={alt}
      width={32}
      height={32}
      className="size-6 sm:size-8 rounded-full"
    />
  );
}
