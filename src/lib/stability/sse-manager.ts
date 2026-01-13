/**
 * Production-Grade SSE Connection Manager (Server-Side)
 * 
 * Features:
 * - Connection rate limiting per user/IP
 * - Maximum connections per user (prevents tab spam)
 * - Heartbeat mechanism with auto-cleanup
 * - Memory-safe connection tracking
 * - Graceful connection shutdown
 */

import { onlineStatusManager, typingManager } from '../realtime/online-status';

export interface SSEConnectionInfo {
  userId: string;
  connectionId: string;
  writer: WritableStreamDefaultWriter;
  createdAt: number;
  lastHeartbeat: number;
  ip?: string;
  userAgent?: string;
}

export interface SSERateLimitConfig {
  /** Maximum connections per user (default: 3) */
  maxConnectionsPerUser: number;
  /** Maximum connections per IP (default: 10) */
  maxConnectionsPerIP: number;
  /** Rate limit window in ms (default: 60000 = 1 minute) */
  rateLimitWindowMs: number;
  /** Maximum new connections per user per window (default: 10) */
  maxNewConnectionsPerWindow: number;
  /** Heartbeat interval in ms (default: 30000 = 30 seconds) */
  heartbeatIntervalMs: number;
  /** Connection timeout in ms (default: 120000 = 2 minutes) */
  connectionTimeoutMs: number;
}

const DEFAULT_CONFIG: SSERateLimitConfig = {
  maxConnectionsPerUser: 3,
  maxConnectionsPerIP: 10,
  rateLimitWindowMs: 60000,
  maxNewConnectionsPerWindow: 10,
  heartbeatIntervalMs: 30000,
  connectionTimeoutMs: 120000,
};

/**
 * Production-grade SSE Manager with rate limiting and cleanup
 */
export class ProductionSSEManager {
  private static instance: ProductionSSEManager;
  
  private connections: Map<string, SSEConnectionInfo> = new Map();
  private userConnections: Map<string, Set<string>> = new Map();
  private ipConnections: Map<string, Set<string>> = new Map();
  private connectionAttempts: Map<string, number[]> = new Map(); // userId -> timestamps
  private config: SSERateLimitConfig;
  private cleanupInterval: NodeJS.Timeout | null = null;

  private constructor(config: Partial<SSERateLimitConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.startCleanupLoop();
  }

  static getInstance(config?: Partial<SSERateLimitConfig>): ProductionSSEManager {
    const g = globalThis as any;
    if (!g.__productionSSEManager) {
      g.__productionSSEManager = new ProductionSSEManager(config);
    }
    return g.__productionSSEManager as ProductionSSEManager;
  }

  /**
   * Configure the manager
   */
  configure(config: Partial<SSERateLimitConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Check if a new connection is allowed (rate limiting)
   */
  canConnect(userId: string, ip?: string): { allowed: boolean; reason?: string } {
    // Check user connection limit
    const userConns = this.userConnections.get(userId);
    if (userConns && userConns.size >= this.config.maxConnectionsPerUser) {
      return { 
        allowed: false, 
        reason: `Maximum connections (${this.config.maxConnectionsPerUser}) reached for user` 
      };
    }

    // Check IP connection limit
    if (ip) {
      const ipConns = this.ipConnections.get(ip);
      if (ipConns && ipConns.size >= this.config.maxConnectionsPerIP) {
        return { 
          allowed: false, 
          reason: `Maximum connections (${this.config.maxConnectionsPerIP}) reached for IP` 
        };
      }
    }

    // Check rate limit (new connections per window)
    const now = Date.now();
    const attempts = this.connectionAttempts.get(userId) || [];
    const recentAttempts = attempts.filter(
      t => now - t < this.config.rateLimitWindowMs
    );
    
    if (recentAttempts.length >= this.config.maxNewConnectionsPerWindow) {
      return { 
        allowed: false, 
        reason: `Too many connection attempts. Please wait.` 
      };
    }

    return { allowed: true };
  }

  /**
   * Add a new SSE connection
   */
  addConnection(
    userId: string, 
    connectionId: string, 
    writer: WritableStreamDefaultWriter,
    options: { ip?: string; userAgent?: string } = {}
  ): boolean {
    const { allowed, reason } = this.canConnect(userId, options.ip);
    
    if (!allowed) {
      console.warn(`[SSE] Connection rejected for ${userId}: ${reason}`);
      return false;
    }

    // Record connection attempt for rate limiting
    const attempts = this.connectionAttempts.get(userId) || [];
    attempts.push(Date.now());
    this.connectionAttempts.set(userId, attempts);

    // If user already has max connections, close the oldest one
    const userConns = this.userConnections.get(userId);
    if (userConns && userConns.size >= this.config.maxConnectionsPerUser) {
      const oldestConnectionId = this.findOldestConnection(userId);
      if (oldestConnectionId) {
        this.closeConnection(userId, oldestConnectionId, 'replaced');
      }
    }

    const now = Date.now();
    
    // Store connection info
    this.connections.set(connectionId, {
      userId,
      connectionId,
      writer,
      createdAt: now,
      lastHeartbeat: now,
      ip: options.ip,
      userAgent: options.userAgent,
    });

    // Track user connections
    if (!this.userConnections.has(userId)) {
      this.userConnections.set(userId, new Set());
    }
    this.userConnections.get(userId)!.add(connectionId);

    // Track IP connections
    if (options.ip) {
      if (!this.ipConnections.has(options.ip)) {
        this.ipConnections.set(options.ip, new Set());
      }
      this.ipConnections.get(options.ip)!.add(connectionId);
    }

    // Update online status
    onlineStatusManager.setUserOnline(userId, connectionId);

    console.log(`[SSE] Connection added: ${userId} (${connectionId}), total: ${this.connections.size}`);
    return true;
  }

  /**
   * Find the oldest connection for a user
   */
  private findOldestConnection(userId: string): string | null {
    const userConns = this.userConnections.get(userId);
    if (!userConns || userConns.size === 0) return null;

    let oldestId: string | null = null;
    let oldestTime: number = Infinity;
    
    userConns.forEach(connId => {
      const conn = this.connections.get(connId);
      if (conn && conn.createdAt < oldestTime) {
        oldestId = connId;
        oldestTime = conn.createdAt;
      }
    });

    return oldestId;
  }

  /**
   * Close a specific connection
   */
  closeConnection(userId: string, connectionId: string, reason: string = 'closed'): void {
    const conn = this.connections.get(connectionId);
    if (!conn) return;

    // Try to close the writer gracefully
    try {
      conn.writer.close();
    } catch {
      // Already closed
    }

    // Remove from tracking
    this.connections.delete(connectionId);

    const userConns = this.userConnections.get(userId);
    if (userConns) {
      userConns.delete(connectionId);
      if (userConns.size === 0) {
        this.userConnections.delete(userId);
      }
    }

    if (conn.ip) {
      const ipConns = this.ipConnections.get(conn.ip);
      if (ipConns) {
        ipConns.delete(connectionId);
        if (ipConns.size === 0) {
          this.ipConnections.delete(conn.ip);
        }
      }
    }

    // Update online status
    onlineStatusManager.setUserOffline(userId, connectionId);
    typingManager.clearUserTyping(userId);

    console.log(`[SSE] Connection closed: ${userId} (${connectionId}), reason: ${reason}`);
  }

  /**
   * Remove connection (alias for closeConnection)
   */
  removeConnection(userId: string, connectionId: string): void {
    this.closeConnection(userId, connectionId, 'disconnected');
  }

  /**
   * Update heartbeat timestamp for a connection
   */
  updateHeartbeat(connectionId: string): void {
    const conn = this.connections.get(connectionId);
    if (conn) {
      conn.lastHeartbeat = Date.now();
      onlineStatusManager.updateLastSeen(conn.userId);
    }
  }

  /**
   * Send message to specific user
   */
  sendToUser(userId: string, event: string, data: any): void {
    const userConns = this.userConnections.get(userId);
    if (!userConns || userConns.size === 0) {
      return;
    }

    const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
    const encoder = new TextEncoder();
    const encoded = encoder.encode(message);

    const connectionIds = Array.from(userConns);
    
    connectionIds.forEach(connectionId => {
      const conn = this.connections.get(connectionId);
      if (conn) {
        try {
          conn.writer.write(encoded);
        } catch (error: any) {
          const msg = String(error?.message || error || '');
          if (!msg.includes('Invalid state') && !msg.includes('closed')) {
            console.warn(`[SSE] Send failed for ${userId} (${connectionId}):`, error);
          }
          this.closeConnection(userId, connectionId, 'send-error');
        }
      }
    });
  }

  /**
   * Send message to multiple users
   */
  sendToUsers(userIds: string[], event: string, data: any): void {
    userIds.forEach(userId => this.sendToUser(userId, event, data));
  }

  /**
   * Broadcast to all connected users
   */
  broadcast(event: string, data: any): void {
    const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
    const encoder = new TextEncoder();
    const encoded = encoder.encode(message);

    this.connections.forEach((conn, connectionId) => {
      try {
        conn.writer.write(encoded);
      } catch (error) {
        this.closeConnection(conn.userId, connectionId, 'broadcast-error');
      }
    });
  }

  /**
   * Get online users list
   */
  getOnlineUsers(): string[] {
    return Array.from(this.userConnections.keys());
  }

  /**
   * Check if user is online
   */
  isUserOnline(userId: string): boolean {
    return this.userConnections.has(userId);
  }

  /**
   * Get connection count for a user
   */
  getUserConnectionCount(userId: string): number {
    return this.userConnections.get(userId)?.size || 0;
  }

  /**
   * Get total connection count
   */
  getTotalConnectionCount(): number {
    return this.connections.size;
  }

  /**
   * Get stats for monitoring
   */
  getStats(): {
    totalConnections: number;
    uniqueUsers: number;
    uniqueIPs: number;
    oldestConnection: number;
  } {
    let oldest = Date.now();
    this.connections.forEach(conn => {
      if (conn.createdAt < oldest) oldest = conn.createdAt;
    });

    return {
      totalConnections: this.connections.size,
      uniqueUsers: this.userConnections.size,
      uniqueIPs: this.ipConnections.size,
      oldestConnection: Date.now() - oldest,
    };
  }

  /**
   * Start the cleanup loop for stale connections
   */
  private startCleanupLoop(): void {
    if (this.cleanupInterval) return;

    this.cleanupInterval = setInterval(() => {
      this.cleanupStaleConnections();
      this.cleanupOldAttempts();
    }, 30000); // Run every 30 seconds
  }

  /**
   * Cleanup stale connections (no heartbeat received)
   */
  private cleanupStaleConnections(): void {
    const now = Date.now();
    const staleThreshold = this.config.connectionTimeoutMs;
    let cleaned = 0;

    this.connections.forEach((conn, connectionId) => {
      if (now - conn.lastHeartbeat > staleThreshold) {
        this.closeConnection(conn.userId, connectionId, 'timeout');
        cleaned++;
      }
    });

    if (cleaned > 0) {
      console.log(`[SSE] Cleaned up ${cleaned} stale connections`);
    }
  }

  /**
   * Cleanup old connection attempts from rate limiting tracker
   */
  private cleanupOldAttempts(): void {
    const now = Date.now();
    const windowMs = this.config.rateLimitWindowMs;

    this.connectionAttempts.forEach((attempts, userId) => {
      const recent = attempts.filter(t => now - t < windowMs);
      if (recent.length === 0) {
        this.connectionAttempts.delete(userId);
      } else if (recent.length < attempts.length) {
        this.connectionAttempts.set(userId, recent);
      }
    });
  }

  /**
   * Gracefully shutdown all connections
   */
  shutdown(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }

    this.connections.forEach((conn, connectionId) => {
      this.closeConnection(conn.userId, connectionId, 'shutdown');
    });

    this.connections.clear();
    this.userConnections.clear();
    this.ipConnections.clear();
    this.connectionAttempts.clear();

    console.log('[SSE] Manager shutdown complete');
  }
}

// Export singleton instance getter
export function getSSEManager(config?: Partial<SSERateLimitConfig>): ProductionSSEManager {
  return ProductionSSEManager.getInstance(config);
}
