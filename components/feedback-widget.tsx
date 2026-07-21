"use client";

import { useSession } from "next-auth/react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

type Kind = "bug" | "idea" | "other";

const KINDS: { value: Kind; label: string }[] = [
  { value: "bug", label: "🐞 Проблема" },
  { value: "idea", label: "💡 Идея" },
  { value: "other", label: "💬 Отзыв" },
];

// Floating feedback button + dialog for alpha testers.
// Only rendered for authenticated users (see mount in root layout).
export function FeedbackWidget() {
  const { status } = useSession();
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<Kind>("bug");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  // Hide entirely for anonymous visitors (login page, etc.)
  if (status !== "authenticated") {
    return null;
  }

  async function submit() {
    const trimmed = message.trim();
    if (!trimmed) {
      toast.error("Напишите пару слов");
      return;
    }
    setSending(true);
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind,
          message: trimmed,
          url: typeof window !== "undefined" ? window.location.href : "",
        }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new Error(data.error || "Не удалось отправить");
      }
      toast.success("Спасибо! Мы получили ваш отзыв.");
      setMessage("");
      setOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Ошибка отправки");
    } finally {
      setSending(false);
    }
  }

  return (
    <Dialog onOpenChange={setOpen} open={open}>
      <DialogTrigger asChild>
        <button
          aria-label="Оставить отзыв"
          className="fixed right-4 bottom-4 z-50 rounded-full bg-black/80 px-4 py-2 font-medium text-sm text-white shadow-lg backdrop-blur transition hover:bg-black"
          type="button"
        >
          Отзыв
        </button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Поделитесь впечатлением</DialogTitle>
        </DialogHeader>
        <div className="flex gap-2">
          {KINDS.map((k) => (
            <button
              className={`rounded-full border px-3 py-1 text-sm transition ${
                kind === k.value
                  ? "border-black bg-black text-white"
                  : "border-gray-200 text-gray-600 hover:border-gray-400"
              }`}
              key={k.value}
              onClick={() => setKind(k.value)}
              type="button"
            >
              {k.label}
            </button>
          ))}
        </div>
        <Textarea
          autoFocus
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Что понравилось, что сломалось, чего не хватает…"
          rows={5}
          value={message}
        />
        <DialogFooter>
          <Button
            disabled={sending}
            onClick={submit}
            type="button"
          >
            {sending ? "Отправляем…" : "Отправить"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
