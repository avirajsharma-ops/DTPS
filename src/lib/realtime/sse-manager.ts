import { onlineStatusManager, typingManager } from './online-status';

// Server-Sent Events Manager for Real-time Messaging
export class SSEManager {
  private static instance: SSEManager;
  private connections: Map<string, WritableStreamDefaultWriter> = new Map();
  private userConnections: Map<string, Set<string>> = new Map();

  private constructor() {}

  static getInstance(): SSEManager {
    // Use global cache to ensure a single instance across route/module graphs
    const g = globalThis as any;
    if (!g.__sseManager) {
      g.__sseManager = new SSEManager();
    }
    return g.__sseManager as SSEManager;
  }

  // Add a new SSE connection
  addConnection(userId: string, connectionId: string, writer: WritableStreamDefaultWriter) {
    this.connections.set(connectionId, writer);

    if (!this.userConnections.has(userId)) {
      this.userConnections.set(userId, new Set());
    }
    this.userConnections.get(userId)!.add(connectionId);

    // Update online status
    onlineStatusManager.setUserOnline(userId, connectionId);

  }

  // Remove SSE connection
  removeConnection(userId: string, connectionId: string) {
    this.connections.delete(connectionId);

    const userConns = this.userConnections.get(userId);
    if (userConns) {
      userConns.delete(connectionId);
      if (userConns.size === 0) {
        this.userConnections.delete(userId);
      }
    }

    // Update online status
    onlineStatusManager.setUserOffline(userId, connectionId);

    // Clear typing indicators
    typingManager.clearUserTyping(userId);

  }

  // Send message to specific user
  sendToUser(userId: string, event: string, data: any) {
    const userConns = this.userConnections.get(userId);
    if (!userConns) return;

    const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
    const encoder = new TextEncoder();

    // Create a copy of the connections to avoid modification during iteration
    const connectionIds = Array.from(userConns);

    connectionIds.forEach(connectionId => {
      const writer = this.connections.get(connectionId);
      if (writer) {
        try {
          writer.write(encoder.encode(message));
        } catch (error: any) {
          const msg = String(error?.message || error || '');
          // Closed/invalid writers are expected during reconnects; clean up quietly
          if (!msg.includes('Invalid state') && !msg.includes('closed')) {
            console.warn(`SSE send failed for ${userId} (${connectionId}):`, error);
          }
          this.removeConnection(userId, connectionId);
        }
      }
    });
  }

  // Send message to multiple users
  sendToUsers(userIds: string[], event: string, data: any) {
    userIds.forEach(userId => this.sendToUser(userId, event, data));
  }

  // Broadcast to all connected users
  broadcast(event: string, data: any) {
    const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
    const encoder = new TextEncoder();

    this.connections.forEach((writer, connectionId) => {
      try {
        writer.write(encoder.encode(message));
      } catch (error) {
        console.error(`Failed to broadcast to ${connectionId}:`, error);
      }
    });
  }

  // Get online users
  getOnlineUsers(): string[] {
    return Array.from(this.userConnections.keys());
  }

  // Check if user is online
  isUserOnline(userId: string): boolean {
    return this.userConnections.has(userId);
  }

  // Get user's connections
  getUserConnections(userId: string): Set<string> | undefined {
    return this.userConnections.get(userId);
  }
}

// Message types for real-time events
export interface RealtimeMessage {
  type: 'new_message' | 'message_read' | 'typing_start' | 'typing_stop' | 'user_online' | 'user_offline';
  data: any;
  timestamp: number;
  from?: string;
  to?: string;
}

// Helper function to create SSE response
export function createSSEResponse(): Response {
  const stream = new ReadableStream({
    start(controller) {
      // Send initial connection message
      const message = `event: connected\ndata: ${JSON.stringify({ status: 'connected' })}\n\n`;
      controller.enqueue(new TextEncoder().encode(message));
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control',
    },
  });
}
