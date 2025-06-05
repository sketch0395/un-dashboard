const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
require('dotenv').config();

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  role: { type: String, enum: ['admin', 'user', 'viewer'], default: 'user' },
  isActive: { type: Boolean, default: false },
  approvedAt: { type: Date },
  approvedBy: { type: String }
}, { timestamps: true });

async function createAdmin() {
  try {
    console.log('Connecting to MongoDB...');
    const mongoUrl = process.env.MONGODB_URL || 'mongodb://admin:un-dashboard-2024@10.5.1.212:27017/undashboard?authSource=admin';
    await mongoose.connect(mongoUrl);
    console.log('✅ Connected to MongoDB');

    const User = mongoose.model('User', userSchema);

    // Check if admin already exists
    const existingAdmin = await User.findOne({ username: 'admin' });
    if (existingAdmin) {
      console.log('Admin user already exists:', existingAdmin.username);
      
      // Update to ensure it's active
      existingAdmin.isActive = true;
      existingAdmin.approvedAt = new Date();
      existingAdmin.approvedBy = 'system';
      await existingAdmin.save();
      console.log('✅ Admin user activated');
    } else {
      // Create new admin user
      const hashedPassword = await bcrypt.hash('admin123!', 10);
      
      const adminUser = new User({
        username: 'admin',
        email: 'admin@undashboard.local',
        password: hashedPassword,
        firstName: 'Admin',
        lastName: 'User',
        role: 'admin',
        isActive: true,
        approvedAt: new Date(),
        approvedBy: 'system'
      });

      await adminUser.save();
      console.log('✅ Admin user created successfully');
    }

    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB');
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

createAdmin();
