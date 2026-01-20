import mongoose from 'mongoose';

// Import all models to register their schemas before any operations
import './models/User';
import './models/Tag';
import './models/Task';
import './models/Appointment';
import './models/Recipe';
import './models/MealPlan';
import './models/Message';
import './models/Payment';
import './models/SystemAlert';
import './models/ProgressEntry';
import './models/FoodLog';
import './models/WooCommerceClient';
import './models/WatiContact';
import './models/ClientDocuments';
import './models/DietaryRecall';
import './models/LifestyleInfo';
import './models/MedicalInfo';
import './models/JournalTracking';
import './models/DietTemplate';
import './models/History';
import './models/ActivityAssignment';

// MongoDB URI from environment
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/dtps-nutrition';

if (!MONGODB_URI) {
  throw new Error('Please define the MONGODB_URI environment variable inside .env.local');
}

/**
 * Global cache to maintain connection across hot reloads in development.
 * Prevents connection explosion during API Route usage.
 */
interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
  lastError: Error | null;
  retryCount: number;
  isConnecting: boolean;
}

// Use a simple global variable with type assertion
let cached: MongooseCache = (global as any).mongoose;

if (!cached) {
  cached = (global as any).mongoose = {
    conn: null,
    promise: null,
    lastError: null,
    retryCount: 0,
    isConnecting: false,
  };
}

// Optimized connection options for MongoDB Atlas
const connectionOptions: mongoose.ConnectOptions = {
  // Buffer commands when disconnected - mongoose will auto-reconnect
  bufferCommands: true,
  
  // Timeouts - be patient but not too patient
  serverSelectionTimeoutMS: 45000,  // 45s to find a server
  socketTimeoutMS: 45000,           // 45s socket timeout
  connectTimeoutMS: 30000,          // 30s to establish connection
  
  // Force IPv4 - helps with some DNS issues
  family: 4,
  
  // Connection pool settings
  maxPoolSize: 50,                  // Max connections in pool
  minPoolSize: 5,                   // Keep some connections ready
  maxIdleTimeMS: 60000,             // Close idle connections after 1 min
  
  // Retry settings (MongoDB driver handles these)
  retryWrites: true,
  retryReads: true,
  
  // Heartbeat to detect dead connections
  heartbeatFrequencyMS: 10000,      // Check every 10s
  
  // Auto-index in development only
  autoIndex: process.env.NODE_ENV !== 'production',
};

// Retry configuration
const MAX_RETRIES = 3;
const BASE_DELAY_MS = 1000;
const MAX_DELAY_MS = 10000;

/**
 * Calculate delay with exponential backoff and jitter
 */
function getRetryDelay(attempt: number): number {
  const exponentialDelay = BASE_DELAY_MS * Math.pow(2, attempt);
  const jitter = Math.random() * 1000; // Add 0-1s jitter
  return Math.min(exponentialDelay + jitter, MAX_DELAY_MS);
}

/**
 * Sleep utility
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Check if mongoose is connected
 */
function isConnected(): boolean {
  return mongoose.connection.readyState === 1;
}

/**
 * Check if mongoose is connecting
 */
function isConnecting(): boolean {
  return mongoose.connection.readyState === 2;
}

/**
 * Connect to MongoDB with graceful retry logic
 * 
 * Features:
 * - Singleton pattern - reuses existing connections
 * - Exponential backoff with jitter for retries
 * - Graceful error handling
 * - Auto-reconnection via mongoose driver
 */
async function connectDB(): Promise<typeof mongoose> {
  // Already connected - return immediately
  if (cached.conn && isConnected()) {
    return cached.conn;
  }

  // Connection in progress - wait for it
  if (cached.promise && (isConnecting() || cached.isConnecting)) {
    try {
      return await cached.promise;
    } catch {
      // Promise failed, will create new one below
    }
  }

  // Prevent concurrent connection attempts
  if (cached.isConnecting) {
    await sleep(100);
    return connectDB();
  }

  cached.isConnecting = true;

  // Create new connection with retry logic
  cached.promise = (async (): Promise<typeof mongoose> => {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        if (attempt > 0) {
          const delay = getRetryDelay(attempt - 1);
          console.log(`[MongoDB] Retry attempt ${attempt}/${MAX_RETRIES} in ${Math.round(delay)}ms...`);
          await sleep(delay);
        }

        // If already connected (maybe by another concurrent call), return
        if (isConnected() && cached.conn) {
          return cached.conn;
        }

        // Disconnect first if in a bad state
        if (mongoose.connection.readyState !== 0 && mongoose.connection.readyState !== 1) {
          try {
            await mongoose.disconnect();
          } catch {
            // Ignore disconnect errors
          }
        }

        console.log(`[MongoDB] Connecting to database${attempt > 0 ? ` (attempt ${attempt + 1})` : ''}...`);
        
        const conn = await mongoose.connect(MONGODB_URI, connectionOptions);
        
        console.log('[MongoDB] Connected successfully!');
        cached.conn = conn;
        cached.lastError = null;
        cached.retryCount = 0;
        
        return conn;
      } catch (error: any) {
        lastError = error;
        cached.lastError = error;
        cached.retryCount = attempt + 1;
        
        console.error(`[MongoDB] Connection attempt ${attempt + 1} failed:`, error.message);
        
        // Don't retry on authentication errors
        if (error.message?.includes('authentication') || error.message?.includes('auth')) {
          console.error('[MongoDB] Authentication error - not retrying');
          break;
        }
      }
    }

    throw lastError || new Error('Failed to connect to MongoDB after all retries');
  })();

  try {
    const result = await cached.promise;
    setupEventHandlers();
    return result;
  } catch (error) {
    cached.promise = null;
    throw error;
  } finally {
    cached.isConnecting = false;
  }
}

let eventHandlersSetup = false;

/**
 * Set up mongoose event handlers (once per process)
 */
function setupEventHandlers(): void {
  if (eventHandlersSetup) return;
  eventHandlersSetup = true;

  mongoose.connection.on('connected', () => {
    console.log('[MongoDB] Connection established');
    cached.lastError = null;
  });

  mongoose.connection.on('error', (err) => {
    console.error('[MongoDB] Connection error:', err.message);
    cached.lastError = err;
  });

  mongoose.connection.on('disconnected', () => {
    console.warn('[MongoDB] Disconnected from database');
    cached.conn = null;
    // Don't reset promise - let the next request trigger reconnection
  });

  mongoose.connection.on('reconnected', () => {
    console.log('[MongoDB] Reconnected to database');
    cached.lastError = null;
  });

  // Handle process termination gracefully
  const cleanup = async () => {
    try {
      await mongoose.disconnect();
      console.log('[MongoDB] Disconnected through app termination');
    } catch (err) {
      console.error('[MongoDB] Error during disconnect:', err);
    }
    process.exit(0);
  };

  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);
}

/**
 * Check database health
 */
export async function checkDBHealth(): Promise<{ 
  healthy: boolean; 
  error?: string;
  readyState: number;
  readyStateLabel: string;
}> {
  const readyStateLabels = ['disconnected', 'connected', 'connecting', 'disconnecting'];
  
  try {
    if (!isConnected()) {
      await connectDB();
    }
    
    // Ping to verify connection works
    await mongoose.connection.db?.admin().ping();
    
    return {
      healthy: true,
      readyState: mongoose.connection.readyState,
      readyStateLabel: readyStateLabels[mongoose.connection.readyState] || 'unknown',
    };
  } catch (error: any) {
    return {
      healthy: false,
      error: error.message,
      readyState: mongoose.connection.readyState,
      readyStateLabel: readyStateLabels[mongoose.connection.readyState] || 'unknown',
    };
  }
}

/**
 * Get connection statistics for debugging
 */
export function getConnectionStats(): {
  readyState: number;
  readyStateLabel: string;
  lastError: string | null;
  retryCount: number;
  host: string | null;
  isConnecting: boolean;
} {
  const readyStateLabels = ['disconnected', 'connected', 'connecting', 'disconnecting'];
  
  return {
    readyState: mongoose.connection.readyState,
    readyStateLabel: readyStateLabels[mongoose.connection.readyState] || 'unknown',
    lastError: cached.lastError?.message || null,
    retryCount: cached.retryCount,
    host: mongoose.connection.host || null,
    isConnecting: cached.isConnecting,
  };
}

export default connectDB;