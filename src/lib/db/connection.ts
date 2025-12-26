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
  cached = (global as any).mongoose = { conn: null, promise: null };
}

async function connectDB() {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
      serverSelectionTimeoutMS: 10000, // 10 second timeout
      socketTimeoutMS: 45000, // 45 second socket timeout
      family: 4, // Force IPv4 to avoid some DNS issues
    };

    cached.promise = mongoose.connect(MONGODB_URI, opts);
  }

  try {
    const connection = await cached.promise;
    cached.conn = connection;
  } catch (e) {
    cached.promise = null;
    console.error('MongoDB connection error:', e);
    throw e;
  }

  return cached.conn;
}

export default connectDB;