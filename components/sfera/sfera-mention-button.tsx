"use client";

import { AtSign, Bot, User } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { aiAgentsMetadata } from "@/lib/ai/agents/client-registry";

export type SferaMember = {
  userId: string;
  email: string;
  role: string;
};

export type MentionButtonProps = {
  members: SferaMember[];
  currentUserId: string;
  onMentionSelect: (mention: string) => void;
  disabled?: boolean;
};

/**
 * MentionButton - компонент для выбора участника для упоминания
 * Показывает список участников Sfera и AI-агентов
 */
export function MentionButton({
  members,
  currentUserId,
  onMentionSelect,
  disabled = false,
}: MentionButtonProps) {
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Get username from email
  const getUsername = useCallback((email: string) => {
    return email.split("@")[0];
  }, []);

  // Filter members (exclude current user)
  const filteredMembers = useMemo(() => {
    const otherMembers = members.filter((m) => m.userId !== currentUserId);
    if (!filter) {
      return otherMembers;
    }
    return otherMembers.filter((m) =>
      getUsername(m.email).toLowerCase().includes(filter.toLowerCase())
    );
  }, [members, currentUserId, filter, getUsername]);

  // Filter AI agents
  const filteredAgents = useMemo(() => {
    if (!filter) {
      return aiAgentsMetadata;
    }
    return aiAgentsMetadata.filter((agent) =>
      agent.name.toLowerCase().includes(filter.toLowerCase())
    );
  }, [filter]);

  // Handle mention selection
  const handleSelect = useCallback(
    (mention: string) => {
      onMentionSelect(`@${mention} `);
      setOpen(false);
      setFilter("");
    },
    [onMentionSelect]
  );

  // Focus input when dropdown opens
  useEffect(() => {
    if (open && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open]);

  return (
    <DropdownMenu onOpenChange={setOpen} open={open}>
      <DropdownMenuTrigger asChild>
        <Button
          className="h-8 w-8"
          disabled={disabled}
          size="icon"
          title="Упомянуть участника"
          variant="ghost"
        >
          <AtSign className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        {/* Search input */}
        <div className="p-2">
          <input
            className="w-full rounded-md border bg-transparent px-2 py-1 text-sm outline-none focus:ring-1 focus:ring-ring"
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Поиск..."
            ref={inputRef}
            value={filter}
          />
        </div>

        <DropdownMenuSeparator />

        {/* AI Agents */}
        {filteredAgents.length > 0 && (
          <>
            <DropdownMenuLabel className="text-muted-foreground text-xs">
              AI Агенты
            </DropdownMenuLabel>
            {filteredAgents.map((agent) => (
              <DropdownMenuItem
                className="cursor-pointer"
                key={agent.id}
                onClick={() => handleSelect(getUsername(agent.email))}
              >
                <Bot className="mr-2 h-4 w-4 text-primary" />
                <span className="font-medium">{agent.name}</span>
                <span className="ml-auto text-muted-foreground text-xs">
                  @{getUsername(agent.email)}
                </span>
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
          </>
        )}

        {/* Members */}
        <DropdownMenuLabel className="text-muted-foreground text-xs">
          Участники
        </DropdownMenuLabel>
        {filteredMembers.length === 0 ? (
          <div className="px-2 py-4 text-center text-muted-foreground text-sm">
            Нет участников
          </div>
        ) : (
          filteredMembers.map((member) => (
            <DropdownMenuItem
              className="cursor-pointer"
              key={member.userId}
              onClick={() => handleSelect(getUsername(member.email))}
            >
              <User className="mr-2 h-4 w-4" />
              <span>{getUsername(member.email)}</span>
              {member.role === "owner" && (
                <span className="ml-auto rounded bg-primary/10 px-1.5 py-0.5 text-primary text-xs">
                  Владелец
                </span>
              )}
              {member.role === "admin" && (
                <span className="ml-auto rounded bg-blue-500/10 px-1.5 py-0.5 text-blue-500 text-xs">
                  Админ
                </span>
              )}
            </DropdownMenuItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/**
 * MentionHighlight - компонент для подсветки упоминаний в тексте
 */
export type MentionHighlightProps = {
  text: string;
  className?: string;
};

export function MentionHighlight({ text, className }: MentionHighlightProps) {
  // Parse mentions and create segments
  const segments = useMemo(() => {
    const mentionRegex = /@([\w-]+)/g;
    const result: { text: string; isMention: boolean }[] = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null = mentionRegex.exec(text);

    while (match !== null) {
      // Add text before mention
      if (match.index > lastIndex) {
        result.push({
          text: text.slice(lastIndex, match.index),
          isMention: false,
        });
      }

      // Add mention
      result.push({
        text: match[0],
        isMention: true,
      });

      lastIndex = match.index + match[0].length;
      match = mentionRegex.exec(text);
    }

    // Add remaining text
    if (lastIndex < text.length) {
      result.push({
        text: text.slice(lastIndex),
        isMention: false,
      });
    }

    return result;
  }, [text]);

  return (
    <span className={className}>
      {segments.map((segment, index) =>
        segment.isMention ? (
          <span
            className="rounded bg-primary/10 px-0.5 font-medium text-primary"
            key={`segment-${segment.text}-${index}`}
          >
            {segment.text}
          </span>
        ) : (
          <span key={`segment-${segment.text}-${index}`}>{segment.text}</span>
        )
      )}
    </span>
  );
}
