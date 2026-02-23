/**
 * Script to create optimized indexes for User model
 * Run this to ensure all indexes are created in the database
 * 
 * Usage: node scripts/create-user-indexes.js
 */

require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');

async function createIndexes() {
  try {
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/dtps');
    console.log('✅ Connected to MongoDB\n');

    const db = mongoose.connection.db;
    const usersCollection = db.collection('users');

    console.log('📊 Creating indexes for users collection...\n');

    // Drop existing indexes (except _id)
    console.log('1️⃣ Dropping old indexes...');
    const existingIndexes = await usersCollection.indexes();
    for (const index of existingIndexes) {
      if (index.name !== '_id_') {
        try {
          await usersCollection.dropIndex(index.name);
          console.log(`   ✅ Dropped: ${index.name}`);
        } catch (err) {
          console.log(`   ⚠️  Could not drop: ${index.name}`);
        }
      }
    }

    // Create new optimized indexes
    console.log('\n2️⃣ Creating new optimized indexes...');

    await usersCollection.createIndex({ role: 1 });
    console.log('   ✅ Created: role');

    await usersCollection.createIndex({ assignedDietitian: 1 });
    console.log('   ✅ Created: assignedDietitian');

    await usersCollection.createIndex({ assignedDietitians: 1 });
    console.log('   ✅ Created: assignedDietitians');

    await usersCollection.createIndex({ clientStatus: 1 });
    console.log('   ✅ Created: clientStatus');

    await usersCollection.createIndex({ createdAt: -1 });
    console.log('   ✅ Created: createdAt (desc)');

    await usersCollection.createIndex({ email: 1 });
    console.log('   ✅ Created: email');

    // Compound indexes for admin panel queries
    await usersCollection.createIndex({ role: 1, clientStatus: 1 });
    console.log('   ✅ Created: role + clientStatus');

    await usersCollection.createIndex({ role: 1, assignedDietitian: 1 });
    console.log('   ✅ Created: role + assignedDietitian');

    await usersCollection.createIndex({ role: 1, createdAt: -1 });
    console.log('   ✅ Created: role + createdAt');

    // Text index for search
    await usersCollection.createIndex(
      { firstName: 'text', lastName: 'text', email: 'text' },
      { weights: { firstName: 10, lastName: 10, email: 5 } }
    );
    console.log('   ✅ Created: text index (firstName, lastName, email)');

    console.log('\n✨ All indexes created successfully!');
    console.log('\n📋 Verifying indexes...');

    const newIndexes = await usersCollection.indexes();
    console.log(`\n📊 Total indexes: ${newIndexes.length}`);
    newIndexes.forEach(index => {
      console.log(`   - ${index.name}: ${JSON.stringify(index.key)}`);
    });

    console.log('\n✅ Index creation complete!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating indexes:', error);
    process.exit(1);
  }
}

createIndexes();
