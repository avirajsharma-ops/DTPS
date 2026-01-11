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

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/dtps-nutrition';

if (!MONGODB_URI) {
  throw new Error('Please define the MONGODB_URI environment variable inside .env.local');
}

/**
 * Global is used here to maintain a cached connection across hot reloads
 * in development. This prevents connections growing exponentially
 * during API Route usage.
 */
let cached = (global as any).mongoose;

if (!cached) {
  cached = (global as any).mongoose = { conn: null, promise: null, lastError: null, retryCount: 0 };
}

// Connection options optimized for production stability
const connectionOptions = {
  bufferCommands: false,
  serverSelectionTimeoutMS: 15000, // 15 second timeout (increased for stability)
  socketTimeoutMS: 45000, // 45 second socket timeout
  family: 4, // Force IPv4 to avoid DNS issues
  maxPoolSize: 50, // Increase pool size for concurrent requests
  minPoolSize: 5, // Keep minimum connections warm
  maxIdleTimeMS: 30000, // Close idle connections after 30s
  retryWrites: true,
  retryReads: true,
  heartbeatFrequencyMS: 10000, // Check connection health every 10s
};

// Retry configuration
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

/**
 * Sleep utility for retry delays
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Check if connection is healthy
 */
function isConnectionHealthy(): boolean {
  return mongoose.connection.readyState === 1; // 1 = connected
}

/**
 * Connect to MongoDB with retry logic and connection pooling
 * - Retries up to 3 times on failure
 * - Reuses existing connections
 * - Handles connection drops gracefully
 */
async function connectDB(retryAttempt = 0): Promise<typeof mongoose> {
  // If already connected and healthy, return immediately
  if (cached.conn && isConnectionHealthy()) {
    return cached.conn;
  }

  // If connection exists but is unhealthy, reset it
  if (cached.conn && !isConnectionHealthy()) {
    console.warn('MongoDB connection unhealthy, resetting...');
    cached.conn = null;
    cached.promise = null;
  }

  // Create new connection promise if needed
  if (!cached.promise) {
    cached.promise = mongoose.connect(MONGODB_URI, connectionOptions);
    
    // Set up connection event handlers (only once)
    mongoose.connection.on('error', (err) => {
      console.error('MongoDB connection error event:', err.message);
      cached.lastError = err;
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('MongoDB disconnected, will reconnect on next request');
      cached.conn = null;
      cached.promise = null;
    });

    mongoose.connection.on('reconnected', () => {
      console.log('MongoDB reconnected successfully');
      cached.lastError = null;
    });
  }

  try {
    const connection = await cached.promise;
    cached.conn = connection;
    cached.retryCount = 0;
    cached.lastError = null;
    return cached.conn;
  } catch (e: any) {
    cached.promise = null;
    cached.lastError = e;
    
    // Retry logic
    if (retryAttempt < MAX_RETRIES) {
      const delay = RETRY_DELAY_MS * Math.pow(2, retryAttempt); // Exponential backoff
      console.warn(`MongoDB connection failed, retrying in ${delay}ms (attempt ${retryAttempt + 1}/${MAX_RETRIES}):`, e.message);
      await sleep(delay);
      return connectDB(retryAttempt + 1);
    }
    
    console.error('MongoDB connection failed after all retries:', e);
    throw new Error(`Database connection failed: ${e.message}`);
  }
}

/**
 * Check database health status
 */
export async function checkDBHealth(): Promise<{ healthy: boolean; error?: string }> {
  try {
    if (!isConnectionHealthy()) {
      await connectDB();
    }
    await mongoose.connection.db?.admin().ping();
    return { healthy: true };
  } catch (e: any) {
    return { healthy: false, error: e.message };
  }
}

/**
 * Get connection statistics
 */
export function getConnectionStats() {
  return {
    readyState: mongoose.connection.readyState,
    lastError: cached.lastError?.message || null,
    retryCount: cached.retryCount,
  };
}

export default connectDB;