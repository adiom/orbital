"use client";

import {
  ArrowUpRight,
  Copy,
  GitBranch,
  MessageSquarePlus,
  MoreHorizontal,
  PenSquare,
  Reply,
  ShieldCheck,
  Sparkles,
  Trash2,
} from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { ConstelaMessage } from "@/hooks/use-constela";
import { cn } from "@/lib/utils";

type ParentPreview = Pick<ConstelaMessage, "id" | "content" | "userEmail" | "createdAt"> | null;

export type ConstelaMessageProps = {
  message: ConstelaMessage;
  parentMessage: ParentPreview;
  constelaId: string;
  currentUserId?: string;
  canModerate?: boolean;
  onReply?: (message: ConstelaMessage) => void;
  onEdit?: (message: ConstelaMessage) => void;
  onDelete?: (message: ConstelaMessage) => void;
  onFork?: (message: ConstelaMessage) => void;
};

const AVRORA_USER_ID = "00000000-0000-0000-0000-000000000001";

export const ConstelaMessage = ({
  message,
  parentMessage,
  constelaId,
  currentUserId,
  canModerate = false,
  onReply,
  onEdit,
  onDelete,
  onFork,
}: ConstelaMessageProps) => {
  const router = useRouter();
  const [isForking, setIsForking] = useState(false);

  const isAvrora =
    message.userId === AVRORA_USER_ID ||
    message.userEmail.toLowerCase() === "avrora@avrora.ai";

  const canEdit = canModerate || (!!currentUserId && currentUserId === message.userId);
  const canDelete = canEdit && !message.isForked;

  const createdAtLabel = useMemo(() => {
    try {
      return new Date(message.createdAt).toLocaleTimeString();
    } catch (error) {
      console.error("Failed to format timestamp", error);
      return "";
    }
  }, [message.createdAt]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      toast.success("Message copied to clipboard");
    } catch (error) {
      console.error("Copy failed", error);
      toast.error("Failed to copy message");
    }
  };

  const handleFork = async () => {
    if (isForking || message.isForked) {
      return;
    }

    setIsForking(true);
    try {
      const response = await fetch(`/api/sfera/${constelaId}/fork`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messageId: message.id }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        const forkedId = (payload as { forkedSferaId?: string }).forkedSferaId;
        if (forkedId) {
          router.push(`/constela/${forkedId}`);
          return;
        }

        throw new Error((payload as { error?: string }).error || "Failed to fork");
      }

      const payload = (await response.json()) as { sfera: { id: string } };
      onFork?.(message);
      router.push(`/constela/${payload.sfera.id}`);
    } catch (error) {
      console.error("Fork failed", error);
      toast.error(error instanceof Error ? error.message : "Failed to create branch");
    } finally {
      setIsForking(false);
    }
  };

  const handleEnterFork = () => {
    if (!message.forkedSferaId) {
      return;
    }

    router.push(`/constela/${message.forkedSferaId}`);
  };

  const renderAttachments = () => {
    if (!message.attachments.length) {
      return null;
    }

    return (
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {message.attachments.map((attachment, index) => (
          <button
            key={`attachment-${attachment.url}-${index}`}
            className="group relative overflow-hidden rounded-xl border bg-muted/40 text-left shadow-sm transition hover:shadow-md"
            onClick={() => window.open(attachment.url, "_blank")}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                window.open(attachment.url, "_blank");
              }
            }}
            type="button"
          >
            <Image
              src={attachment.url}
              alt={attachment.name}
              width={320}
              height={200}
              className="h-40 w-full object-cover"
            />
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent p-2 text-xs text-white">
              {attachment.name}
            </div>
          </button>
        ))}
      </div>
    );
  };

  return (
    <article
      className={cn(
        "relative rounded-2xl border bg-card/80 p-4 shadow-sm transition hover:border-primary/40 hover:shadow-lg",
        isAvrora && "border-primary/40 bg-primary/5"
      )}
    >
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="relative flex size-10 items-center justify-center overflow-hidden rounded-full border bg-background">
            {isAvrora ? (
              <Sparkles className="h-5 w-5 text-primary" />
            ) : (
              <Image
                alt={message.userEmail}
                src={`https://avatar.vercel.sh/${encodeURIComponent(message.userEmail)}`}
                width={32}
                height={32}
                className="size-9 rounded-full"
              />
            )}
          </div>

          <div className="flex flex-col text-sm leading-tight">
            <span
              className={cn(
                "font-medium",
                isAvrora ? "text-primary" : "text-foreground"
              )}
            >
              {message.userEmail}
            </span>
            <div className="flex items-center gap-2 text-muted-foreground text-xs">
              <span>{createdAtLabel}</span>
              {isAvrora && (
                <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-primary">
                  <ShieldCheck className="h-3 w-3" />
                  Avrora
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {message.isForked && message.forkedSferaId ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  className="inline-flex items-center gap-1 rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-primary transition hover:bg-primary/20"
                  onClick={handleEnterFork}
                  type="button"
                >
                  <ArrowUpRight className="h-3.5 w-3.5" />
                  <span className="text-xs font-medium">View branch</span>
                </button>
              </TooltipTrigger>
              <TooltipContent>Open branch created from this message</TooltipContent>
            </Tooltip>
          ) : null}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="inline-flex size-8 items-center justify-center rounded-full border bg-background hover:bg-muted"
                type="button"
              >
                <MoreHorizontal className="h-4 w-4" />
                <span className="sr-only">Open actions</span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44" side="bottom">
              <DropdownMenuItem onClick={handleCopy}>
                <Copy className="mr-2 h-4 w-4" />
                Copy text
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onReply?.(message)}>
                <Reply className="mr-2 h-4 w-4" />
                Reply
              </DropdownMenuItem>
              {!message.isForked ? (
                <DropdownMenuItem disabled={isForking} onClick={handleFork}>
                  <GitBranch className="mr-2 h-4 w-4" />
                  {isForking ? "Creating branch…" : "Create branch"}
                </DropdownMenuItem>
              ) : null}
              {canEdit ? (
                <DropdownMenuItem onClick={() => onEdit?.(message)}>
                  <PenSquare className="mr-2 h-4 w-4" />
                  Edit message
                </DropdownMenuItem>
              ) : null}
              {canDelete ? (
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={() => onDelete?.(message)}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete message
                </DropdownMenuItem>
              ) : null}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {parentMessage ? (
        <aside className="mt-3 rounded-xl border border-dashed border-muted-foreground/30 bg-muted/50 p-3 text-xs">
          <div className="flex items-center gap-2 text-muted-foreground">
            <MessageSquarePlus className="h-3.5 w-3.5" />
            Replying to {parentMessage.userEmail}
          </div>
          <Separator className="my-2" />
          <p className="line-clamp-2 text-muted-foreground/90">{parentMessage.content}</p>
        </aside>
      ) : null}

      <div className="mt-4 whitespace-pre-wrap text-[15px] leading-relaxed text-foreground">
        {message.content}
      </div>

      {renderAttachments()}
    </article>
  );
};
