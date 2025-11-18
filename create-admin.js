const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Try to load .env file if dotenv is available
try {
  require('dotenv').config();
} catch (e) {
  // dotenv not available, will use default connection
}

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  role: { type: String, enum: ['client', 'dietitian', 'admin', 'health_counselor'], default: 'client' },
  status: { type: String, enum: ['active', 'inactive', 'pending'], default: 'active' },
}, { timestamps: true });

async function createAdmin() {
  try {
    console.log('Connecting to database...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/dtps-nutrition');
    console.log('✅ Connected to database\n');
    
    const User = mongoose.model('User', userSchema);
    
    // Check for existing admin
    const existingAdmin = await User.findOne({ email: 'admin@dtps.com' });
    
    if (existingAdmin) {
      console.log('📋 Admin user already exists:\n');
      console.log('📧 Email: admin@dtps.com');
      console.log('👤 Name:', existingAdmin.firstName, existingAdmin.lastName);
      console.log('🔑 Password: admin123 (if not changed)\n');
      
      // Update password to admin123
      const hashedPassword = await bcrypt.hash('admin123', 10);
      existingAdmin.password = hashedPassword;
      existingAdmin.status = 'active';
      await existingAdmin.save();
      console.log('✅ Password reset to: admin123\n');
    } else {
      console.log('Creating new admin user...\n');
      
      const hashedPassword = await bcrypt.hash('admin123', 10);
      
      const newAdmin = await User.create({
        email: 'admin@dtps.com',
        password: hashedPassword,
        firstName: 'Admin',
        lastName: 'User',
        role: 'admin',
        status: 'active'
      });
      
      console.log('✅ Admin user created successfully!\n');
      console.log('📧 Email: admin@dtps.com');
      console.log('🔑 Password: admin123');
      console.log('👤 Name: Admin User\n');
    }
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🎯 USE THESE CREDENTIALS TO LOGIN:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📧 Email:    admin@dtps.com');
    console.log('🔑 Password: admin123');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    await mongoose.connection.close();
    console.log('✅ Done!\n');
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

createAdmin();

