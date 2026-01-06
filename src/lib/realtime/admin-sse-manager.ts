// Admin SSE Manager for real-time client updates
// This uses a global singleton pattern to maintain connections across API routes

interface AdminConnection {
  writer: WritableStreamDefaultWriter;
  userId: string;
  connectionId: string;
}

class AdminSSEManager {
  private connections: Map<string, AdminConnection> = new Map();

  private constructor() {}

  static getInstance(): AdminSSEManager {
    const g = globalThis as any;
    if (!g.__adminSSEManager) {
      g.__adminSSEManager = new AdminSSEManager();
    }
    return g.__adminSSEManager as AdminSSEManager;
  }

  addConnection(connectionId: string, userId: string, writer: WritableStreamDefaultWriter) {
    this.connections.set(connectionId, { writer, userId, connectionId });
  }

  removeConnection(connectionId: string) {
    this.connections.delete(connectionId);
  }

  // Broadcast client update to all admin connections
  broadcastClientUpdate(eventType: string, data: any) {
    const message = `event: ${eventType}\ndata: ${JSON.stringify(data)}\n\n`;
    const encoder = new TextEncoder();

    this.connections.forEach((connection, connectionId) => {
      try {
        connection.writer.write(encoder.encode(message));
      } catch (error) {
        console.error(`Failed to send to admin connection ${connectionId}:`, error);
        this.connections.delete(connectionId);
      }
    });
  }

  // Get all connection IDs
  getConnectionIds(): string[] {
    return Array.from(this.connections.keys());
  }

  // Check if there are any active connections
  hasConnections(): boolean {
    return this.connections.size > 0;
  }
}

export const adminSSEManager = AdminSSEManager.getInstance();
