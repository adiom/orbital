"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowUp, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

const DISMISS_OFFSET = 100;
const DISMISS_VELOCITY = 500;

type OrbitCreateSheetProps = {
  isOpen: boolean;
  onClose: () => void;
};

export function OrbitCreateSheet({ isOpen, onClose }: OrbitCreateSheetProps) {
  const router = useRouter();
  const [content, setContent] = useState("");
  const [isSending, setIsSending] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    if (isOpen) {
      requestAnimationFrame(() => {
        textareaRef.current?.focus();
      });
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      setContent("");
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() || isSending) return;

    if ("vibrate" in navigator) navigator.vibrate(50);
    setIsSending(true);

    try {
      const response = await fetch("/api/sfera", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: content.trim(),
          visibility: "private",
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Не удалось создать");
      }

      const data = await response.json();
      toast.success("Создано");
      onClose();
      router.push(`/${data.sfera.id}`);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Не удалось создать"
      );
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (!isSending && e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSubmit(e);
      return;
    }
    if (!isSending && e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (!isSending) {
      setContent(e.target.value);
      const textarea = textareaRef.current;
      if (textarea) {
        textarea.style.height = "auto";
        const newHeight = Math.max(48, Math.min(textarea.scrollHeight, 160));
        textarea.style.height = `${newHeight}px`;
      }
    }
  };

  return (
    <AnimatePresence>
      {isOpen ? (
        <div className="fixed inset-0 z-50 flex items-end">
          {/* Backdrop */}
          <motion.div
            animate={{ opacity: 1 }}
            className="absolute inset-0 bg-black/15 backdrop-blur-sm"
            exit={{ opacity: 0 }}
            initial={{ opacity: 0 }}
            onClick={onClose}
            transition={{ duration: prefersReducedMotion ? 0 : 0.2 }}
          />

          {/* Sheet */}
          <motion.div
            animate={{ y: 0 }}
            className="relative z-10 w-full rounded-t-[24px] bg-white p-4 shadow-[0_-10px_40px_rgba(15,23,42,0.12)]"
            drag={prefersReducedMotion ? false : "y"}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.5 }}
            exit={{ y: "100%" }}
            initial={{ y: "100%" }}
            onDragEnd={(_, info) => {
              if (
                info.offset.y > DISMISS_OFFSET ||
                info.velocity.y > DISMISS_VELOCITY
              ) {
                onClose();
              }
            }}
            transition={
              prefersReducedMotion
                ? { duration: 0 }
                : { type: "spring", damping: 30, stiffness: 300 }
            }
          >
            {/* Handle */}
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-neutral-200" />

            {/* Header */}
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-medium text-sm text-neutral-950">
                Новая мысль
              </h3>
              <Button
                onClick={onClose}
                size="icon"
                variant="ghost"
                className="size-8 text-neutral-400"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Input */}
            <form onSubmit={handleSubmit}>
              <div className="rounded-2xl border-2 border-neutral-200 bg-neutral-50 p-3 transition-colors focus-within:border-neutral-300">
                <Textarea
                  ref={textareaRef}
                  value={content}
                  onChange={handleInputChange}
                  onKeyDown={handleKeyDown}
                  placeholder="О чём хотите подумать?"
                  className="min-h-[48px] resize-none border-0 bg-transparent p-0 text-[15px] text-neutral-900 placeholder:text-neutral-400 focus-visible:ring-0 focus-visible:ring-offset-0"
                  rows={1}
                />
              </div>

              {/* Submit */}
              <div className="mt-3 flex justify-end">
                <Button
                  type="submit"
                  size="sm"
                  disabled={!content.trim() || isSending}
                  className={cn(
                    "gap-1.5 rounded-full px-4",
                    content.trim()
                      ? "bg-neutral-950 text-white hover:bg-neutral-800"
                      : "bg-neutral-100 text-neutral-400"
                  )}
                >
                  {isSending ? (
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  ) : (
                    <ArrowUp className="h-4 w-4" />
                  )}
                  Создать
                </Button>
              </div>
            </form>

            {/* Safe area */}
            <div className="h-[env(safe-area-inset-bottom)]" />
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>
  );
}
