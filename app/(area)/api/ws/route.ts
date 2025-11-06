import type { NextRequest } from "next/server";
import { WebSocketServer } from "ws";
import { auth } from "@/app/(auth)/auth";
import { getChatById } from "@/lib/db/queries";

// WebSocket server instance (singleton)
let wss: WebSocketServer | null = null;

function _getWebSocketServer() {
  if (!wss) {
    wss = new WebSocketServer({ noServer: true });
    console.log("✅ WebSocket server created");
  }
  return wss;
}

export async function GET(request: NextRequest) {
  const session = await auth();

  if (!session || !session.user) {
    return new Response("Unauthorized", { status: 401 });
  }

  // Get chat ID from query params
  const { searchParams } = new URL(request.url);
  const chatId = searchParams.get("chatId");

  if (!chatId) {
    return new Response("chatId is required", { status: 400 });
  }

  try {
    // Verify user has access to this chat
    const chat = await getChatById({ id: chatId });
    if (!chat) {
      return new Response("Chat not found", { status: 404 });
    }

    // For now, basic access check - in future check ChatMember table
    if (chat.userId !== session.user.id) {
      return new Response("Forbidden", { status: 403 });
    }

    // Note: WebSocket connections are handled by the standalone WebSocket server
    // running on port 3001 (lib/websocket/server.ts)
    return new Response(
      JSON.stringify({
        message: "Use standalone WebSocket server on port 3001",
        wsUrl: `ws://localhost:3001?chatId=${chatId}`,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("WebSocket connection error:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}

// Note: Next.js App Router doesn't natively support WebSocket upgrades
// For production, consider:
// 1. Custom Node.js server with Next.js
// 2. Separate WebSocket server (e.g., on different port) ← CURRENT APPROACH
// 3. Edge runtime with Durable Objects (Cloudflare)
// 4. Third-party services (Pusher, Ably, Socket.io)

// WebSocket server is implemented in lib/websocket/server.ts
