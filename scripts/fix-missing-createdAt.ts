/**
 * Migration script to add createdAt field to users that don't have it
 * Run this script once to fix existing data
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error('Please define the MONGODB_URI environment variable');
}

async function fixMissingCreatedAt() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    const db = mongoose.connection.db;
    const usersCollection = db.collection('users');

    // Find all users without createdAt field
    const usersWithoutCreatedAt = await usersCollection.find({
      createdAt: { $exists: false }
    }).toArray();

    console.log(`Found ${usersWithoutCreatedAt.length} users without createdAt field`);

    if (usersWithoutCreatedAt.length === 0) {
      console.log('All users have createdAt field. Nothing to fix.');
      return;
    }

    // Update each user to add createdAt field
    const now = new Date();
    const bulkOps = usersWithoutCreatedAt.map(user => ({
      updateOne: {
        filter: { _id: user._id },
        update: {
          $set: {
            createdAt: user._id.getTimestamp() || now, // Use ObjectId timestamp if available
            updatedAt: now
          }
        }
      }
    }));

    const result = await usersCollection.bulkWrite(bulkOps);
    console.log(`Updated ${result.modifiedCount} users with createdAt field`);

    // Verify the fix
    const stillMissing = await usersCollection.countDocuments({
      createdAt: { $exists: false }
    });

    if (stillMissing === 0) {
      console.log('✅ All users now have createdAt field');
    } else {
      console.log(`⚠️ Warning: ${stillMissing} users still missing createdAt field`);
    }

  } catch (error) {
    console.error('Error fixing createdAt:', error);
    throw error;
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Run the migration
fixMissingCreatedAt()
  .then(() => {
    console.log('Migration completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Migration failed:', error);
    process.exit(1);
  });

