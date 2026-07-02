"use client";
import React from "react";
import { cn } from "@/lib/utils";

export function TypingIndicator() {
  return (
    <div className={cn("flex items-center space-x-1 text-muted-foreground text-sm py-2")}>
      <span className="animate-pulse ">·</span>
      <span className="animate-pulse ">·</span>
      <span className="animate-pulse ">·</span>
    </div>
  );
}
