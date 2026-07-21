import { createServer } from "node:http";
import { parse } from "node:url";
import { and, eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { decode } from "next-auth/jwt";
import { WebSocketServer } from "ws";
import { db } from "@/lib/db";
import { sferaMember } from "@/lib/db/schema";
import {
  detectSessionCookieName,
  extractSessionCookie,
  extractTokenFromRequest,
  type WebSocketClient,
  wsManager,
} from "@/lib/websocket/manager";

const WS_PORT = process.env.WS_PORT
  ? Number.parseInt(process.env.WS_PORT, 10)
  : 3001;

const AUTH_SECRET = process.env.AUTH_SECRET;
if (!AUTH_SECRET) {
  console.warn(
    "[ws] AUTH_SECRET is not set — all WebSocket connections will be rejected."
  );
}

/**
 * Verify a NextAuth v5 (Auth.js) session and return the userId.
 * Accepts either the encrypted session cookie (primary path for browsers) or a
 * raw token via query/Authorization header. Returns null on any failure.
 */
async function verifySession(
  cookieToken: string | null,
  cookieSalt: string | null,
  rawToken: string | null
): Promise<string | null> {
  if (!AUTH_SECRET) {
    return null;
  }

  // Preferred: decrypt the session cookie. salt must match the cookie name.
  if (cookieToken && cookieSalt) {
    try {
      const decoded = await decode({
        token: cookieToken,
        secret: AUTH_SECRET,
        salt: cookieSalt,
      });
      const userId = (decoded?.id as string | undefined) || decoded?.sub;
      if (userId) {
        return userId;
      }
    } catch (error) {
      console.warn("[ws] Failed to decode session cookie:", error);
    }
  }

  // Fallback: a raw token passed explicitly. Try common cookie salts.
  if (rawToken) {
    const salts = [
      "authjs.session-token",
      "__Secure-authjs.session-token",
      "next-auth.session-token",
      "__Secure-next-auth.session-token",
    ];
    for (const salt of salts) {
      try {
        const decoded = await decode({
          token: rawToken,
          secret: AUTH_SECRET,
          salt,
        });
        const userId = (decoded?.id as string | undefined) || decoded?.sub;
        if (userId) {
          return userId;
        }
      } catch {
        // try next salt
      }
    }
  }

  return null;
}

export function startWebSocketServer() {
  const server = createServer();
  const wss = new WebSocketServer({ server });

  wss.on("connection", async (ws, req) => {
    const { query } = parse(req.url || "", true);
    // NOTE: the query param is historically named `chatId` but carries a Sfera id.
    const sferaId = query.chatId as string;

    // Verify authentication (cookie-first, raw-token fallback).
    const cookieToken = extractSessionCookie(req);
    const cookieSalt = detectSessionCookieName(req);
    const rawToken = extractTokenFromRequest(req);
    const userId = await verifySession(cookieToken, cookieSalt, rawToken);
    if (!userId) {
      ws.close(1008, "Unauthorized");
      return;
    }

    if (!sferaId) {
      ws.close(1008, "chatId is required");
      return;
    }

    // Verify the user is a member of the Sfera before letting them subscribe.
    try {
      const [membership] = await db
        .select({ userId: sferaMember.userId })
        .from(sferaMember)
        .where(
          and(
            eq(sferaMember.sferaId, sferaId),
            eq(sferaMember.userId, userId)
          )
        )
        .limit(1);

      if (!membership) {
        ws.close(1008, "Forbidden");
        return;
      }
    } catch (error) {
      console.error("Error verifying sfera access:", error);
      ws.close(1011, "Internal error");
      return;
    }

    // Create client
    const clientId = nanoid();
    const client: WebSocketClient = {
      ws,
      userId,
      chatId: sferaId,
    };

    wsManager.addClient(clientId, client);

    // Send connection confirmation
    ws.send(
      JSON.stringify({
        type: "connected",
        clientId,
        chatId: sferaId,
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
              sferaId,
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
              sferaId,
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
              sferaId,
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
