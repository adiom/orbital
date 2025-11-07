"use client";

import { Loader2, MoreVertical, Share2, SquarePen } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import type { ConstelaMessage } from "@/hooks/use-constela";
import { useConstela } from "@/hooks/use-constela";
import { cn } from "@/lib/utils";
import { ConstelaInput } from "./constela-input";
import { ConstelaThread } from "./constela-thread";

type ConstelaWorkspaceProps = {
  constelaId: string;
  currentUserId?: string;
};

type PendingDelete = {
  message: ConstelaMessage;
  isOpen: boolean;
};

export const ConstelaWorkspace = ({
  constelaId,
  currentUserId,
}: ConstelaWorkspaceProps) => {
  const router = useRouter();
  const { sfera, messages, parent, members, isLoading, refresh } =
    useConstela(constelaId);
  const [replyingTo, setReplyingTo] = useState<ConstelaMessage | null>(null);
  const [editingMessage, setEditingMessage] = useState<ConstelaMessage | null>(
    null
  );
  const [pendingDelete, setPendingDelete] = useState<PendingDelete | null>(
    null
  );

  const isOwnerOrAdmin = useMemo(() => {
    if (!currentUserId) {
      return false;
    }
    return members.some(
      (member) =>
        member.userId === currentUserId &&
        ["owner", "admin"].includes(member.role)
    );
  }, [currentUserId, members]);

  const handleDeleteMessage = async (message: ConstelaMessage) => {
    setPendingDelete({ message, isOpen: true });
  };

  const confirmDeleteMessage = async () => {
    if (!pendingDelete) {
      return;
    }
    try {
      const response = await fetch(
        `/api/sfera/${constelaId}/messages/${pendingDelete.message.id}`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(
          (payload as { error?: string }).error ||
            "Не удалось удалить сообщение"
        );
      }

      toast.success("Сообщение удалено");
      setPendingDelete(null);
      refresh();
    } catch (error) {
      console.error("Delete failed", error);
      toast.error(
        error instanceof Error ? error.message : "Не удалось удалить сообщение"
      );
    }
  };

  const handleMessageSent = () => {
    setReplyingTo(null);
    setEditingMessage(null);
    refresh();
  };

  const handleFork = (message: ConstelaMessage) => {
    refresh();
    setReplyingTo(null);
    setEditingMessage(null);
  };

  const handleShare = async () => {
    if (!sfera) {
      return;
    }

    try {
      await navigator.clipboard.writeText(
        `${window.location.origin}/constela/${sfera.id}`
      );
      toast.success("Ссылка на Constela скопирована");
    } catch (error) {
      console.error("Share failed", error);
      toast.error("Не удалось скопировать ссылку");
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!sfera) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 text-center text-muted-foreground">
        <p className="font-semibold text-lg">Constela не найдена</p>
        <Button onClick={() => router.push("/constela")} variant="outline">
          Вернуться к списку
        </Button>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col gap-6">
      <Card className="border-muted/60 bg-background/90">
        <CardHeader className="flex flex-col gap-4 border-muted/50 border-b md:flex-row md:items-center md:justify-between">
          <div className="space-y-2">
            <CardTitle className="font-semibold text-2xl">
              {sfera.title}
            </CardTitle>
            <div className="flex flex-wrap items-center gap-2 text-muted-foreground text-sm">
              <Badge
                variant={
                  sfera.visibility === "public" ? "outline" : "secondary"
                }
              >
                {sfera.visibility}
              </Badge>
              <span>
                Обновлено {new Date(sfera.updatedAt).toLocaleString()}
              </span>
              <span className="text-muted-foreground/70">
                Участников: {members.length}
              </span>
            </div>
            {sfera.description ? (
              <p className="text-muted-foreground text-sm">
                {sfera.description}
              </p>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {parent ? (
              <Button
                onClick={() => router.push(`/constela/${parent.id}`)}
                variant="outline"
              >
                Родительская ветка: {parent.title}
              </Button>
            ) : null}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="icon" variant="outline">
                  <MoreVertical className="h-4 w-4" />
                  <span className="sr-only">Дополнительные действия</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleShare}>
                  <Share2 className="mr-2 h-4 w-4" />
                  Поделиться Constela
                </DropdownMenuItem>
                {isOwnerOrAdmin ? (
                  <DropdownMenuItem
                    onClick={() =>
                      router.push(`/constela/${constelaId}?settings=open`)
                    }
                  >
                    <SquarePen className="mr-2 h-4 w-4" />
                    Настройки (в разработке)
                  </DropdownMenuItem>
                ) : null}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-[1fr_220px]">
          <section className="flex flex-col gap-4">
            <div className="rounded-2xl border border-muted/60 bg-muted/10 p-4 text-muted-foreground text-sm">
              <div className="font-medium text-foreground">Участники</div>
              <Separator className="my-3" />
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {members.map((member) => (
                  <div
                    className="flex items-center justify-between rounded-lg border border-muted/40 bg-background px-3 py-2"
                    key={member.userId}
                  >
                    <span className="truncate text-sm">{member.email}</span>
                    <Badge className="text-xs" variant="outline">
                      {member.role}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          </section>
          <aside className="flex flex-col gap-3 rounded-2xl border border-primary/20 bg-primary/5 p-4 text-sm">
            <div className="font-semibold text-primary">Аврора</div>
            <p className="text-primary/80">
              @avrora реагирует на упоминания и помогает поддерживать
              обсуждение. Используйте её, чтобы получить идеи и подсказки по
              веткам.
            </p>
            <p className="text-primary/60 text-xs">
              Автоматическое подведение итогов и расширенная аналитика появятся
              позже.
            </p>
          </aside>
        </CardContent>
      </Card>

      <ScrollArea className="flex-1 rounded-3xl border border-muted/50 bg-background/80 p-6">
        <ConstelaThread
          canModerate={isOwnerOrAdmin}
          constelaId={constelaId}
          currentUserId={currentUserId}
          messages={messages}
          onDelete={handleDeleteMessage}
          onEdit={(message) => {
            setReplyingTo(null);
            setEditingMessage(message);
          }}
          onFork={handleFork}
          onReply={(message) => {
            setEditingMessage(null);
            setReplyingTo(message);
          }}
        />
      </ScrollArea>

      <Card className="border-muted/60 bg-background/95 p-4">
        <ConstelaInput
          constelaId={constelaId}
          editingMessage={editingMessage}
          onCancelEdit={() => setEditingMessage(null)}
          onCancelReply={() => setReplyingTo(null)}
          onMessageSent={handleMessageSent}
          replyingTo={replyingTo}
        />
      </Card>

      <AlertDialog
        onOpenChange={(open) => !open && setPendingDelete(null)}
        open={Boolean(pendingDelete)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить сообщение?</AlertDialogTitle>
            <AlertDialogDescription>
              Это действие нельзя отменить. Сообщение и все связанные ветки
              будут удалены.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={confirmDeleteMessage}
            >
              Удалить
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
