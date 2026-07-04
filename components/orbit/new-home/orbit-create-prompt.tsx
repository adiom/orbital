"use client";

import {
  ArrowUp,
  ImageIcon,
  Mic,
  Sparkles,
  Square,
  X,
} from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { MiniOrbitCard } from "./mini-orbit-card";

type Attachment = {
  name: string;
  url: string;
  contentType: string;
};

type OrbitCreatePromptProps = {
  isOpen: boolean;
  onClose: () => void;
};

function detectAgentMention(text: string): string | null {
  const lower = text.toLowerCase();
  if (lower.includes("@avrora") || lower.includes("@аврора")) return "Avrora";
  if (lower.includes("@cf-kristina") || lower.includes("@cf кристина"))
    return "cf-kristina";
  if (lower.includes("@kristina") || lower.includes("@кристина"))
    return "kristina";
  return null;
}

function getPreviewTitle(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) return "Новая мысль";
  // Take first line, max 48 chars
  const firstLine = trimmed.split("\n")[0].slice(0, 48);
  return firstLine.length < trimmed.length ? firstLine + "..." : firstLine;
}

export function OrbitCreatePrompt({ isOpen, onClose }: OrbitCreatePromptProps) {
  const router = useRouter();
  const [content, setContent] = useState("");
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const detectedAgent = detectAgentMention(content);

  // Focus textarea on open
  useEffect(() => {
    if (isOpen) {
      requestAnimationFrame(() => {
        textareaRef.current?.focus();
      });
    }
  }, [isOpen]);

  // Reset on close
  useEffect(() => {
    if (!isOpen) {
      setContent("");
      setAttachments([]);
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  }, [isOpen]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (mediaRecorderRef.current && isRecording) {
        mediaRecorderRef.current.stop();
      }
    };
  }, [isRecording]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    try {
      const file = files[0];
      const isImage = file.type.startsWith("image/");
      const isAudio = file.type.startsWith("audio/");

      if (!isImage && !isAudio) {
        toast.error("Поддерживаются только изображения и аудио");
        return;
      }

      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/files/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) throw new Error("Upload failed");
      const data = await response.json();

      setAttachments((prev) => [
        ...prev,
        { name: file.name, url: data.url, contentType: file.type },
      ]);

      if ("vibrate" in navigator) navigator.vibrate(30);
      toast.success(isAudio ? "Аудио загружено" : "Изображение загружено");
    } catch {
      toast.error("Не удалось загрузить файл");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
    if ("vibrate" in navigator) navigator.vibrate(30);
  };

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported("audio/webm")
          ? "audio/webm"
          : "audio/mp4",
      });

      chunksRef.current = [];
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, {
          type: mediaRecorder.mimeType,
        });
        const file = new File(
          [blob],
          `voice-${Date.now()}.${mediaRecorder.mimeType.includes("webm") ? "webm" : "mp4"}`,
          { type: mediaRecorder.mimeType }
        );

        setIsUploading(true);
        try {
          const formData = new FormData();
          formData.append("file", file);
          const response = await fetch("/api/files/upload", {
            method: "POST",
            body: formData,
          });
          if (!response.ok) throw new Error("Upload failed");
          const data = await response.json();
          setAttachments((prev) => [
            ...prev,
            { name: file.name, url: data.url, contentType: file.type },
          ]);
          if ("vibrate" in navigator) navigator.vibrate(30);
          toast.success("Голосовое сообщение записано");
        } catch {
          toast.error("Не удалось загрузить голосовое сообщение");
        } finally {
          setIsUploading(false);
        }

        for (const track of stream.getTracks()) track.stop();
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);

      if ("vibrate" in navigator) navigator.vibrate(50);
    } catch {
      toast.error("Не удалось получить доступ к микрофону");
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      if ("vibrate" in navigator) navigator.vibrate(50);
    }
  }, [isRecording]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!content.trim() && attachments.length === 0) || isSending) return;

    if ("vibrate" in navigator) navigator.vibrate(50);
    setIsSending(true);

    try {
      const response = await fetch("/api/sfera", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: content.trim(),
          attachments,
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
      router.push(`/orbit/${data.sfera.id}`);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Не удалось создать"
      );
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (!isSending && e.key === "Enter" && e.metaKey) {
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
        const newHeight = Math.max(52, Math.min(textarea.scrollHeight, 180));
        textarea.style.height = `${newHeight}px`;
      }
    }
  };

  const hasContent = content.trim().length > 0 || attachments.length > 0;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/15 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Container */}
      <div className="relative z-10 flex w-full max-w-[560px] flex-col items-center px-4">
        {/* Mini orbit preview */}
        <div className="mb-6 transition-all duration-500">
          <MiniOrbitCard
            title={getPreviewTitle(content)}
            lifeState="born"
          />
        </div>

        {/* Prompt input card */}
        <form
          className="w-full overflow-hidden rounded-[24px] border border-white/60 bg-white/90 shadow-[0_32px_80px_rgba(15,23,42,0.12),0_0_40px_rgba(15,23,42,0.06)] backdrop-blur-2xl"
          onSubmit={handleSubmit}
        >
          {/* Attachment previews */}
          {attachments.length > 0 && (
            <div className="flex flex-wrap gap-2 border-b border-neutral-100 p-4 pb-3">
              {attachments.map((attachment, index) => {
                const isAudio = attachment.contentType.startsWith("audio/");
                return (
                  <div
                    className="group relative overflow-hidden rounded-xl border border-neutral-200 bg-neutral-50"
                    key={`att-${attachment.url}-${index}`}
                  >
                    {isAudio ? (
                      <div className="flex h-14 min-w-[180px] items-center gap-2 px-3">
                        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-violet-100">
                          <Mic className="h-4 w-4 text-violet-600" />
                        </div>
                        <span className="truncate text-xs text-neutral-700">
                          {attachment.name}
                        </span>
                      </div>
                    ) : (
                      <div className="relative h-16 w-16">
                        <Image
                          alt={attachment.name}
                          className="rounded-xl object-cover"
                          fill
                          sizes="64px"
                          src={attachment.url}
                        />
                      </div>
                    )}
                    {!isSending && (
                      <button
                        className="absolute top-1 right-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-white opacity-0 transition-opacity group-hover:opacity-100"
                        onClick={() => removeAttachment(index)}
                        type="button"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                );
              })}
              {isUploading && (
                <div className="flex h-14 w-14 items-center justify-center rounded-xl border border-neutral-200 bg-neutral-50">
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-violet-500 border-t-transparent" />
                </div>
              )}
            </div>
          )}

          <input
            accept="image/*,audio/*"
            className="hidden"
            disabled={isSending || isUploading}
            onChange={handleFileSelect}
            ref={fileInputRef}
            type="file"
          />

          {/* Textarea */}
          <div className="px-5 pt-4 pb-20">
            <Textarea
              className="min-h-[52px] w-full resize-none border-0 bg-transparent p-0 text-[15px] text-neutral-900 leading-relaxed placeholder:text-neutral-400 focus-visible:ring-0 focus-visible:ring-offset-0"
              disabled={isSending}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder={
                isSending
                  ? "Создаётся..."
                  : "О чём хотите подумать?"
              }
              ref={textareaRef}
              style={{ height: "auto", minHeight: "52px" }}
              value={content}
            />
          </div>

          {/* Toolbar */}
          <div className="absolute right-4 bottom-4 left-4">
            <div className="flex items-center justify-between gap-2">
              <div className="flex flex-shrink-0 items-center gap-1.5">
                {/* Image upload */}
                <Button
                  className="h-8 w-8 rounded-full border-neutral-200 bg-white text-neutral-500 transition-colors hover:border-violet-300 hover:bg-violet-50 hover:text-violet-600"
                  disabled={isSending || isUploading}
                  onClick={() => fileInputRef.current?.click()}
                  size="icon"
                  type="button"
                  variant="outline"
                >
                  <ImageIcon className="h-3.5 w-3.5" />
                </Button>

                {/* Voice record */}
                <Button
                  className={cn(
                    "h-8 w-8 rounded-full border-neutral-200 bg-white text-neutral-500 transition-colors hover:border-violet-300 hover:bg-violet-50 hover:text-violet-600",
                    isRecording && "border-red-300 bg-red-50 text-red-500 hover:border-red-400 hover:bg-red-50"
                  )}
                  disabled={isSending || isUploading}
                  onClick={isRecording ? stopRecording : startRecording}
                  size="icon"
                  type="button"
                  variant="outline"
                >
                  {isRecording ? (
                    <Square className="h-3.5 w-3.5 fill-red-500" />
                  ) : (
                    <Mic className="h-3.5 w-3.5" />
                  )}
                </Button>

                {/* Recording timer */}
                {isRecording && (
                  <div className="flex items-center gap-1.5 rounded-full border border-red-200 bg-red-50 px-2 py-0.5">
                    <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-500" />
                    <span className="font-mono text-[10px] text-red-500">
                      {formatTime(recordingTime)}
                    </span>
                  </div>
                )}

                {/* Agent mention indicator */}
                {detectedAgent && !isRecording && (
                  <div className="flex items-center gap-1 rounded-full border border-violet-200 bg-violet-50 px-2 py-0.5">
                    <Sparkles className="h-3 w-3 text-violet-500" />
                    <span className="text-[10px] font-medium text-violet-600">
                      {detectedAgent} ответит
                    </span>
                  </div>
                )}
              </div>

              {/* Submit */}
              <Button
                className={cn(
                  "h-9 w-9 rounded-full border-0 shadow-lg transition-all duration-200",
                  hasContent
                    ? "bg-gradient-to-br from-violet-500 to-fuchsia-500 hover:from-violet-600 hover:to-fuchsia-600"
                    : "bg-neutral-200"
                )}
                disabled={!hasContent || isSending}
                size="icon"
                type="submit"
              >
                {isSending ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : (
                  <ArrowUp
                    className={cn(
                      "h-4 w-4",
                      hasContent ? "text-white" : "text-neutral-500"
                    )}
                  />
                )}
              </Button>
            </div>
          </div>
        </form>

        {/* Hint */}
        <div className="mt-3 flex items-center gap-3 text-[10px] text-neutral-400">
          <span>Enter — отправить</span>
          <span>Shift+Enter — новая строка</span>
          <span>·</span>
          <span>Личное</span>
        </div>
      </div>
    </div>
  );
}
