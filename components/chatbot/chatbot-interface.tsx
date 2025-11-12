"use client";

import { type Message, useChat } from "@ai-sdk/react";
import { ArrowUp, Loader2, Mic, Paperclip, Square, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ToolResultRenderer } from "./tool-result-renderer";

const AVRORA_USER_ID = "00000000-0000-0000-0000-000000000001";

type ChatbotInterfaceProps = {
  initialSferaId: string;
};

type SferaMessage = {
  id: string;
  content: string;
  userId: string;
  userEmail?: string;
  attachments?: Array<{ name: string; url: string; contentType: string }>;
  toolResults?: Array<{ toolName: string; [key: string]: any }>;
  createdAt: string;
};

export function ChatbotInterface({ initialSferaId }: ChatbotInterfaceProps) {
  const [sferaId] = useState<string>(initialSferaId);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [uploadedFiles, setUploadedFiles] = useState<
    Array<{
      name: string;
      url: string;
      contentType: string;
    }>
  >([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const [initialMessages, setInitialMessages] = useState<Message[]>([]);
  const [isLoadingMessages, setIsLoadingMessages] = useState(true);
  const [optimisticMessages, setOptimisticMessages] = useState<Message[]>([]);

  // Fetch existing messages from Sfera
  const fetchMessages = useCallback(async () => {
    try {
      setIsLoadingMessages(true);
      const response = await fetch(`/api/sfera/${sferaId}`);

      if (!response.ok) {
        throw new Error("Failed to fetch messages");
      }

      const sferaData = await response.json();
      const rawMessages: SferaMessage[] = sferaData.messages || [];

      // Transform Sfera messages to AI SDK format
      const transformedMessages: Message[] = rawMessages
        .map((msg) => ({
          id: msg.id,
          role:
            msg.userId === AVRORA_USER_ID
              ? ("assistant" as const)
              : ("user" as const),
          content: msg.content,
          // Convert toolResults to toolInvocations format
          toolInvocations: msg.toolResults?.map((tool, index) => ({
            toolCallId: `${msg.id}-${index}`,
            toolName: tool.toolName,
            state: "result" as const,
            result: tool,
          })),
        }))
        .reverse(); // Messages come in reverse order from API

      setInitialMessages(transformedMessages);
    } catch (err) {
      console.error("Error fetching messages:", err);
      toast.error("Failed to load message history");
    } finally {
      setIsLoadingMessages(false);
    }
  }, [sferaId]);

  // Load messages on mount
  useEffect(() => {
    const controller = new AbortController();
    fetchMessages();
    return () => controller.abort();
  }, [fetchMessages]);

  const { messages, input, handleInputChange, handleSubmit, isLoading, error } =
    useChat({
      api: "/api/chatbot",
      body: {
        sferaId,
      },
      initialMessages,
      experimental_prepareRequestBody: ({ messages: chatMessages }) => {
        return {
          messages: chatMessages,
          sferaId,
          data: {
            attachments: uploadedFiles,
          },
        };
      },
      onResponse: (response) => {
        console.log("Response received:", response);
      },
      onFinish: (message, { finishReason, usage }) => {
        console.log("Finished:", { message, finishReason, usage });

        // Clear uploaded files after successful send
        setUploadedFiles([]);
        
        // Удаляем оптимистичные сообщения, когда реальное сообщение пришло
        setOptimisticMessages((prev) => {
          // Удаляем самое старое оптимистичное сообщение
          return prev.slice(1);
        });
      },
      onError: (err) => {
        console.error("Chat error:", err);
        toast.error(err.message || "Failed to send message");
        
        // Удаляем оптимистичное сообщение при ошибке
        setOptimisticMessages((prev) => {
          // Удаляем самое старое оптимистичное сообщение
          return prev.slice(1);
        });
      },
    });

  // Удаляем оптимистичные сообщения, когда реальные сообщения пользователя появляются
  useEffect(() => {
    if (optimisticMessages.length > 0 && messages.length > 0) {
      // Проверяем, есть ли новое сообщение пользователя в messages
      const lastUserMessage = messages
        .filter((m) => m.role === "user")
        .slice(-1)[0];
      
      if (lastUserMessage) {
        // Удаляем самое старое оптимистичное сообщение
        setOptimisticMessages((prev) => {
          // Проверяем, не является ли последнее сообщение пользователя тем же, что и оптимистичное
          const optimisticContent = prev[0]?.content || "";
          const realContent = lastUserMessage.content || "";
          
          // Если содержимое совпадает или реальное сообщение появилось, удаляем оптимистичное
          if (optimisticContent === realContent || realContent) {
            return prev.slice(1);
          }
          return prev;
        });
      }
    }
  }, [messages, optimisticMessages]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  });

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) {
      return;
    }

    setIsUploading(true);

    try {
      const file = files[0];
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/files/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Failed to upload file");
      }

      const responseData = await response.json();

      setUploadedFiles((prev) => [
        ...prev,
        {
          name: file.name,
          url: responseData.url,
          contentType: file.type,
        },
      ]);

      toast.success("File uploaded");
    } catch (uploadError) {
      console.error("Upload error:", uploadError);
      toast.error("Failed to upload file");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);

      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, {
          type: "audio/webm",
        });

        // Upload audio file
        setIsUploading(true);
        try {
          const formData = new FormData();
          formData.append("file", audioBlob, "recording.webm");

          const response = await fetch("/api/files/upload", {
            method: "POST",
            body: formData,
          });

          if (!response.ok) {
            throw new Error("Failed to upload audio");
          }

          const audioData = await response.json();

          setUploadedFiles((prev) => [
            ...prev,
            {
              name: "Voice Recording",
              url: audioData.url,
              contentType: "audio/webm",
            },
          ]);

          toast.success("Voice recording uploaded");
        } catch (recordingError) {
          console.error("Upload error:", recordingError);
          toast.error("Failed to upload recording");
        } finally {
          setIsUploading(false);
        }

        // Stop all tracks
        for (const track of stream.getTracks()) {
          track.stop();
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
      toast.success("Recording started");
    } catch (recordError) {
      console.error("Recording error:", recordError);
      toast.error("Failed to start recording");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!input?.trim() && uploadedFiles.length === 0) {
      return;
    }

    // Добавляем оптимистичное сообщение пользователя
    const optimisticMessage: Message = {
      id: `optimistic-${Date.now()}`,
      role: "user",
      content: input || "",
    };

    setOptimisticMessages((prev) => [...prev, optimisticMessage]);

    handleSubmit(e);
  };

  return (
    <div className="flex h-screen flex-col bg-background">
      {/* Header */}
      <div className="border-b p-4">
        <h1 className="font-semibold text-xl">Chat with Avrora</h1>
        {sferaId && (
          <p className="text-muted-foreground text-sm">Session: {sferaId}</p>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        {isLoadingMessages && (
          <div className="flex h-full items-center justify-center">
            <div className="space-y-2 text-center">
              <Loader2 className="mx-auto h-8 w-8 animate-spin text-muted-foreground" />
              <p className="text-muted-foreground">Loading messages...</p>
            </div>
          </div>
        )}

        {!isLoadingMessages && messages.length === 0 && optimisticMessages.length === 0 && (
          <div className="flex h-full items-center justify-center">
            <div className="space-y-2 text-center">
              <h2 className="font-semibold text-2xl">
                Welcome to Avrora Chatbot
              </h2>
              <p className="text-muted-foreground">
                Start a conversation by typing a message below
              </p>
            </div>
          </div>
        )}

        {[...messages, ...optimisticMessages].map((message) => (
          <div
            className={`flex gap-3 ${
              message.role === "user" ? "justify-end" : "justify-start"
            }`}
            key={message.id}
          >
            {message.role === "assistant" && (
              <Avatar className="h-8 w-8 flex-shrink-0">
                <div className="flex h-full w-full items-center justify-center bg-primary font-semibold text-primary-foreground text-xs">
                  A
                </div>
              </Avatar>
            )}

            <div
              className={`max-w-[70%] rounded-lg px-4 py-2 ${
                message.role === "user"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted"
              }`}
            >
              <div className="whitespace-pre-wrap break-words">
                {message.content}
              </div>

              {/* Render tool results if present */}
              {message.toolInvocations &&
                message.toolInvocations.length > 0 && (
                  <div className="mt-2 space-y-2">
                    {message.toolInvocations.map((tool) => (
                      <div key={tool.toolCallId}>
                        {tool.state === "result" && (
                          <ToolResultRenderer
                            result={{
                              toolName: tool.toolName,
                              ...tool.result,
                            }}
                          />
                        )}
                        {tool.state === "call" && (
                          <div className="text-muted-foreground text-sm">
                            Calling {tool.toolName}...
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
            </div>

            {message.role === "user" && (
              <Avatar className="h-8 w-8 flex-shrink-0">
                <div className="flex h-full w-full items-center justify-center bg-secondary font-semibold text-secondary-foreground text-xs">
                  U
                </div>
              </Avatar>
            )}
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start gap-3">
            <Avatar className="h-8 w-8 flex-shrink-0">
              <div className="flex h-full w-full items-center justify-center bg-primary font-semibold text-primary-foreground text-xs">
                A
              </div>
            </Avatar>
            <div className="rounded-lg bg-muted px-4 py-2">
              <Loader2 className="h-4 w-4 animate-spin" />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form className="border-t p-4" onSubmit={onSubmit}>
        {uploadedFiles.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-2">
            {uploadedFiles.map((file) => (
              <div
                className="flex items-center gap-2 rounded-lg border bg-muted px-3 py-2"
                key={file.url}
              >
                <span className="text-sm">{file.name}</span>
                <button
                  className="text-muted-foreground hover:text-foreground"
                  onClick={() =>
                    setUploadedFiles((prev) =>
                      prev.filter((f) => f.url !== file.url)
                    )
                  }
                  type="button"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-end gap-2">
          <input
            accept="image/*,audio/*"
            className="hidden"
            disabled={isLoading || isUploading}
            onChange={handleFileSelect}
            ref={fileInputRef}
            type="file"
          />

          <Button
            disabled={isLoading || isUploading}
            onClick={() => fileInputRef.current?.click()}
            size="icon"
            type="button"
            variant="outline"
          >
            <Paperclip className="h-4 w-4" />
          </Button>

          <Button
            disabled={isLoading || isUploading}
            onClick={isRecording ? stopRecording : startRecording}
            size="icon"
            type="button"
            variant={isRecording ? "destructive" : "outline"}
          >
            {isRecording ? (
              <Square className="h-4 w-4" />
            ) : (
              <Mic className="h-4 w-4" />
            )}
          </Button>

          <Textarea
            className="min-h-[60px] flex-1 resize-none"
            disabled={isLoading}
            onChange={handleInputChange}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                onSubmit(e);
              }
            }}
            placeholder="Type your message..."
            value={input}
          />

          <Button
            disabled={
              (!input?.trim() && uploadedFiles.length === 0) || isLoading
            }
            size="icon"
            type="submit"
          >
            <ArrowUp className="h-4 w-4" />
          </Button>
        </div>

        {error && (
          <div className="mt-2 text-destructive text-sm">
            Error: {error.message}
          </div>
        )}
      </form>
    </div>
  );
}
