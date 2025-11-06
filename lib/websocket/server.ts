import { createServer } from "node:http";
import { parse } from "node:url";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { WebSocketServer } from "ws";
import { db } from "@/lib/db";
import { chat } from "@/lib/db/schema";
import {
  extractTokenFromRequest,
  type WebSocketClient,
  wsManager,
} from "@/lib/websocket/manager";

const WS_PORT = process.env.WS_PORT
  ? Number.parseInt(process.env.WS_PORT, 10)
  : 3001;

// Простая проверка токена (в продакшене использовать NextAuth JWT verification)
function verifyToken(token: string | null): string | null {
  if (!token) {
    return null;
  }

  // TODO: Implement proper JWT verification using NextAuth
  // For now, just return a mock userId for development
  // In production, use: import { decode } from "next-auth/jwt"
  // const decoded = await decode({ token, secret: process.env.AUTH_SECRET });
  // return decoded?.sub || null;

  // Mock verification for development
  if (token.startsWith("dev_")) {
    return token.replace("dev_", "");
  }

  return null;
}

export function startWebSocketServer() {
  const server = createServer();
  const wss = new WebSocketServer({ server });

  wss.on("connection", async (ws, req) => {
    const { query } = parse(req.url || "", true);
    const chatId = query.chatId as string;
    const areaId = query.areaId as string | undefined;
    const token = extractTokenFromRequest(req);

    // Verify authentication
    const userId = await verifyToken(token);
    if (!userId) {
      ws.close(1008, "Unauthorized");
      return;
    }

    if (!chatId) {
      ws.close(1008, "chatId is required");
      return;
    }

    // Verify user has access to chat
    try {
      const [chatRecord] = await db
        .select()
        .from(chat)
        .where(eq(chat.id, chatId));

      if (!chatRecord) {
        ws.close(1008, "Chat not found");
        return;
      }

      // TODO: Check ChatMember table for group chats
      // For now, just check if user is chat owner
      if (chatRecord.userId !== userId) {
        ws.close(1008, "Forbidden");
        return;
      }
    } catch (error) {
      console.error("Error verifying chat access:", error);
      ws.close(1011, "Internal error");
      return;
    }

    // Create client
    const clientId = nanoid();
    const client: WebSocketClient = {
      ws,
      userId,
      chatId,
      areaId,
    };

    wsManager.addClient(clientId, client);

    // Send connection confirmation
    ws.send(
      JSON.stringify({
        type: "connected",
        clientId,
        chatId,
        areaId,
      })
    );

    // Handle incoming messages
    ws.on("message", (data) => {
      try {
        const message = JSON.parse(data.toString());

        switch (message.type) {
          case "chat_message":
            // Broadcast to all clients in the chat
            wsManager.broadcastToChat(
              chatId,
              {
                type: "chat_message",
                messageId: message.messageId,
                userId,
                content: message.content,
                timestamp: new Date().toISOString(),
              },
              clientId
            );
            break;

          case "typing":
            // Broadcast typing indicator
            wsManager.broadcastToChat(
              chatId,
              {
                type: "typing",
                userId,
                isTyping: message.isTyping,
              },
              clientId
            );
            break;

          case "message_update":
            // Broadcast message update (for streaming AI responses)
            wsManager.broadcastToChat(
              chatId,
              {
                type: "message_update",
                messageId: message.messageId,
                content: message.content,
                timestamp: new Date().toISOString(),
              },
              clientId
            );
            break;

          case "ping":
            // Respond to ping
            ws.send(JSON.stringify({ type: "pong" }));
            break;

          default:
            console.warn(`Unknown message type: ${message.type}`);
        }
      } catch (error) {
        console.error("Error handling WebSocket message:", error);
      }
    });

    // Handle disconnection
    ws.on("close", () => {
      wsManager.removeClient(clientId);
    });

    // Handle errors
    ws.on("error", (error) => {
      console.error(`WebSocket error for client ${clientId}:`, error);
      wsManager.removeClient(clientId);
    });
  });

  // Health check endpoint
  server.on("request", (req, res) => {
    if (req.url === "/health") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ status: "ok", ...wsManager.getStats() }));
    } else {
      res.writeHead(404);
      res.end();
    }
  });

  server.listen(WS_PORT, () => {
    console.log(`🚀 WebSocket server running on ws://localhost:${WS_PORT}`);
  });

  return { server, wss };
}

// Start server if this file is run directly
if (require.main === module) {
  startWebSocketServer();
}
