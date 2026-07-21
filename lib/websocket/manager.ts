import type { IncomingMessage } from "node:http";
import type { WebSocket } from "ws";

export type WebSocketClient = {
  ws: WebSocket;
  userId: string;
  chatId: string;
};

class WebSocketManager {
  private readonly clients: Map<string, WebSocketClient> = new Map();
  private readonly chatRooms: Map<string, Set<string>> = new Map();

  addClient(clientId: string, client: WebSocketClient) {
    this.clients.set(clientId, client);

    // Add to chat room
    if (!this.chatRooms.has(client.chatId)) {
      this.chatRooms.set(client.chatId, new Set());
    }
    this.chatRooms.get(client.chatId)?.add(clientId);

    console.log(
      `Client ${clientId} joined chat ${client.chatId}. Total clients: ${this.clients.size}`
    );
  }

  removeClient(clientId: string) {
    const client = this.clients.get(clientId);
    if (client) {
      // Remove from chat room
      const room = this.chatRooms.get(client.chatId);
      if (room) {
        room.delete(clientId);
        if (room.size === 0) {
          this.chatRooms.delete(client.chatId);
        }
      }

      this.clients.delete(clientId);
      console.log(
        `Client ${clientId} left chat ${client.chatId}. Total clients: ${this.clients.size}`
      );
    }
  }

  getClient(clientId: string): WebSocketClient | undefined {
    return this.clients.get(clientId);
  }

  getClientsInChat(chatId: string): WebSocketClient[] {
    const room = this.chatRooms.get(chatId);
    if (!room) {
      return [];
    }

    return Array.from(room)
      .map((clientId) => this.clients.get(clientId))
      .filter((client): client is WebSocketClient => client !== undefined);
  }

  broadcastToChat(chatId: string, message: unknown, excludeClientId?: string) {
    const clients = this.getClientsInChat(chatId);

    for (const client of clients) {
      if (
        excludeClientId &&
        client.ws === this.clients.get(excludeClientId)?.ws
      ) {
        continue;
      }

      if (client.ws.readyState === 1) {
        // OPEN state
        client.ws.send(JSON.stringify(message));
      }
    }

    console.log(
      `Broadcasted to chat ${chatId}: ${clients.length} clients (excluded: ${excludeClientId || "none"})`
    );
  }

  sendToClient(clientId: string, message: unknown) {
    const client = this.clients.get(clientId);
    if (client && client.ws.readyState === 1) {
      client.ws.send(JSON.stringify(message));
    }
  }

  getStats() {
    return {
      totalClients: this.clients.size,
      totalRooms: this.chatRooms.size,
      rooms: Array.from(this.chatRooms.entries()).map(([chatId, clients]) => ({
        chatId,
        clientCount: clients.size,
      })),
    };
  }
}

// Singleton instance
export const wsManager = new WebSocketManager();

export function extractTokenFromRequest(req: IncomingMessage): string | null {
  // Try to get token from query string
  const url = new URL(req.url || "", `http://${req.headers.host}`);
  const token = url.searchParams.get("token");
  if (token) {
    return token;
  }

  // Try to get token from Authorization header
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.substring(7);
  }

  return null;
}

/**
 * Extract the NextAuth session cookie (JWE) from the upgrade request.
 * Browser WebSocket clients can't set headers, but the browser DOES send
 * cookies on the WS upgrade for a same-site host — so this is the primary
 * auth path. Returns the raw encrypted token to be passed to next-auth decode().
 */
export function extractSessionCookie(req: IncomingMessage): string | null {
  const cookieHeader = req.headers.cookie;
  if (!cookieHeader) {
    return null;
  }

  const cookies = new Map<string, string>();
  for (const part of cookieHeader.split(";")) {
    const eq = part.indexOf("=");
    if (eq === -1) {
      continue;
    }
    const name = part.slice(0, eq).trim();
    const value = part.slice(eq + 1).trim();
    if (name) {
      cookies.set(name, decodeURIComponent(value));
    }
  }

  // NextAuth v5 (Auth.js) chunks large cookies as .0/.1; try the common names.
  // Secure prefix used when cookies are secure (prod / TEST_PRODUCTION_AUTH).
  const candidates = [
    "__Secure-authjs.session-token",
    "authjs.session-token",
    "__Secure-next-auth.session-token",
    "next-auth.session-token",
  ];
  for (const name of candidates) {
    const direct = cookies.get(name);
    if (direct) {
      return direct;
    }
    // Reassemble chunked cookie (name.0, name.1, ...)
    const chunk0 = cookies.get(`${name}.0`);
    if (chunk0) {
      let assembled = "";
      let i = 0;
      let next = cookies.get(`${name}.${i}`);
      while (next !== undefined) {
        assembled += next;
        i += 1;
        next = cookies.get(`${name}.${i}`);
      }
      return assembled;
    }
  }

  return null;
}

/**
 * Which cookie name the token came from — needed as the decode `salt`.
 * NextAuth derives the encryption key from (secret, salt=cookieName).
 */
export function detectSessionCookieName(req: IncomingMessage): string | null {
  const cookieHeader = req.headers.cookie;
  if (!cookieHeader) {
    return null;
  }
  const names = cookieHeader
    .split(";")
    .map((p) => p.split("=")[0]?.trim())
    .filter(Boolean) as string[];
  const candidates = [
    "__Secure-authjs.session-token",
    "authjs.session-token",
    "__Secure-next-auth.session-token",
    "next-auth.session-token",
  ];
  for (const name of candidates) {
    if (names.includes(name) || names.includes(`${name}.0`)) {
      return name;
    }
  }
  return null;
}
