"use client";

import { useMemo } from "react";
import {
  Branch,
  BranchMessages,
  BranchNext,
  BranchPrevious,
  BranchSelector,
} from "@/components/elements/branch";
import type { ConstelaMessage } from "@/hooks/use-constela";
import { ConstelaMessage as MessageCard } from "./constela-message";

type ConstelaThreadProps = {
  constelaId: string;
  messages: ConstelaMessage[];
  currentUserId?: string;
  canModerate: boolean;
  onReply: (message: ConstelaMessage) => void;
  onEdit: (message: ConstelaMessage) => void;
  onDelete: (message: ConstelaMessage) => Promise<void> | void;
  onFork: (message: ConstelaMessage) => void;
};

type ThreadGroup = {
  root: ConstelaMessage;
  replies: ConstelaMessage[];
};

const buildThreadGroups = (messages: ConstelaMessage[]): ThreadGroup[] => {
  const byId = new Map<string, ConstelaMessage>();
  messages.forEach((message) => {
    byId.set(message.id, message);
  });

  const children = new Map<string, ConstelaMessage[]>();
  messages.forEach((message) => {
    if (message.parentMessageId && byId.has(message.parentMessageId)) {
      const list = children.get(message.parentMessageId) ?? [];
      list.unshift(message);
      children.set(message.parentMessageId, list);
    }
  });

  const roots: ThreadGroup[] = [];
  messages
    .filter(
      (message) =>
        !message.parentMessageId || !byId.has(message.parentMessageId)
    )
    .forEach((root) => {
      const replies = children.get(root.id) ?? [];
      roots.push({ root, replies });
    });

  return roots;
};

export const ConstelaThread = ({
  constelaId,
  messages,
  currentUserId,
  canModerate,
  onReply,
  onEdit,
  onDelete,
  onFork,
}: ConstelaThreadProps) => {
  const threadGroups = useMemo(() => buildThreadGroups(messages), [messages]);

  if (threadGroups.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center rounded-3xl border border-muted/70 border-dashed bg-muted/20 p-8 text-center text-muted-foreground">
        <p className="font-medium text-base">В Constela пока нет сообщений</p>
        <p className="mt-1 text-muted-foreground/70 text-sm">
          Напишите первое сообщение или пригласите участников Авроры в разговор.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {threadGroups.map(({ root, replies }) => (
        <Branch className="space-y-4" key={root.id}>
          <BranchMessages>
            <div className="space-y-4">
              <MessageCard
                canModerate={canModerate}
                constelaId={constelaId}
                currentUserId={currentUserId}
                message={root}
                onDelete={() => onDelete(root)}
                onEdit={() => onEdit(root)}
                onFork={() => onFork(root)}
                onReply={() => onReply(root)}
                parentMessage={null}
              />
              {replies.length > 0 ? (
                <div className="space-y-3 pl-6">
                  {replies.map((reply) => (
                    <MessageCard
                      canModerate={canModerate}
                      constelaId={constelaId}
                      currentUserId={currentUserId}
                      key={reply.id}
                      message={reply}
                      onDelete={() => onDelete(reply)}
                      onEdit={() => onEdit(reply)}
                      onFork={() => onFork(reply)}
                      onReply={() => onReply(reply)}
                      parentMessage={root}
                    />
                  ))}
                </div>
              ) : null}
            </div>
          </BranchMessages>
          <BranchSelector className="flex items-center gap-2" from="assistant">
            <BranchPrevious />
            <BranchNext />
          </BranchSelector>
        </Branch>
      ))}
    </div>
  );
};
