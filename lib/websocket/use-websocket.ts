"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type WebSocketMessage = {
  type:
    | "connected"
    | "chat_message"
    | "typing"
    | "message_update"
    | "error"
    | "pong";
  [key: string]: unknown;
};

export type UseWebSocketOptions = {
  chatId: string;
  token?: string;
  onMessage?: (message: WebSocketMessage) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Event) => void;
  autoReconnect?: boolean;
  reconnectInterval?: number;
};

export function useWebSocket({
  chatId,
  token,
  onMessage,
  onConnect,
  onDisconnect,
  onError,
  autoReconnect = true,
  reconnectInterval = 3000,
}: UseWebSocketOptions) {
  const [isConnected, setIsConnected] = useState(false);
  const [clientId, setClientId] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const shouldConnectRef = useRef(true);

  const wsUrl = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:3001";

  const connect = useCallback(() => {
    if (!chatId || !shouldConnectRef.current) {
      return;
    }

    try {
      // Build WebSocket URL with query params
      const url = new URL(wsUrl);
      url.searchParams.set("chatId", chatId);
      if (token) {
        url.searchParams.set("token", token);
      }

      const ws = new WebSocket(url.toString());

      ws.onopen = () => {
        console.log("✅ WebSocket connected");
        setIsConnected(true);
        onConnect?.();
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data) as WebSocketMessage;

          // Handle connection confirmation
          if (message.type === "connected") {
            setClientId(message.clientId as string);
          }

          onMessage?.(message);
        } catch (error) {
          console.error("Error parsing WebSocket message:", error);
        }
      };

      ws.onclose = () => {
        console.log("❌ WebSocket disconnected");
        setIsConnected(false);
        setClientId(null);
        wsRef.current = null;
        onDisconnect?.();

        // Attempt reconnection if enabled
        if (autoReconnect && shouldConnectRef.current) {
          console.log(`🔄 Reconnecting in ${reconnectInterval}ms...`);
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, reconnectInterval);
        }
      };

      ws.onerror = (error) => {
        console.error("WebSocket error:", error);
        onError?.(error);
      };

      wsRef.current = ws;
    } catch (error) {
      console.error("Error creating WebSocket connection:", error);
    }
  }, [
    chatId,
    token,
    wsUrl,
    onConnect,
    onMessage,
    onDisconnect,
    onError,
    autoReconnect,
    reconnectInterval,
  ]);

  const disconnect = useCallback(() => {
    shouldConnectRef.current = false;
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setIsConnected(false);
    setClientId(null);
  }, []);

  const sendMessage = useCallback((message: Record<string, unknown>) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    } else {
      console.warn("WebSocket is not connected. Message not sent:", message);
    }
  }, []);

  const sendChatMessage = (messageId: string, content: string) => {
    sendMessage({
      type: "chat_message",
      messageId,
      content,
    });
  };

  const sendTyping = (isTyping: boolean) => {
    sendMessage({
      type: "typing",
      isTyping,
    });
  };

  const sendMessageUpdate = (messageId: string, content: string) => {
    sendMessage({
      type: "message_update",
      messageId,
      content,
    });
  };

  // Connect on mount
  useEffect(() => {
    shouldConnectRef.current = true;
    connect();

    return () => {
      disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connect, disconnect]);

  // Ping/pong heartbeat
  useEffect(() => {
    if (!isConnected) {
      return;
    }

    const interval = setInterval(() => {
      sendMessage({ type: "ping" });
    }, 30_000); // Ping every 30 seconds

    return () => clearInterval(interval);
  }, [isConnected, sendMessage]);

  return {
    isConnected,
    clientId,
    sendMessage,
    sendChatMessage,
    sendTyping,
    sendMessageUpdate,
    disconnect,
    reconnect: connect,
  };
}
