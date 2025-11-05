import type { IncomingMessage } from "node:http";
import type { WebSocket } from "ws";

export interface WebSocketClient {
  ws: WebSocket;
  userId: string;
  chatId: string;
  areaId?: string;
}

class WebSocketManager {
  private clients: Map<string, WebSocketClient> = new Map();
  private chatRooms: Map<string, Set<string>> = new Map();

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
    if (!room) return [];

    return Array.from(room)
      .map((clientId) => this.clients.get(clientId))
      .filter((client): client is WebSocketClient => client !== undefined);
  }

  broadcastToChat(
    chatId: string,
    message: unknown,
    excludeClientId?: string
  ) {
    const clients = this.getClientsInChat(chatId);

    for (const client of clients) {
      if (excludeClientId && client.ws === this.clients.get(excludeClientId)?.ws) {
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

export function extractTokenFromRequest(
  req: IncomingMessage
): string | null {
  // Try to get token from query string
  const url = new URL(req.url || "", `http://${req.headers.host}`);
  const token = url.searchParams.get("token");
  if (token) return token;

  // Try to get token from Authorization header
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.substring(7);
  }

  return null;
}
