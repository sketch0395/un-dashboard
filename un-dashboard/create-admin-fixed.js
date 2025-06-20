// Create initial admin user - Fixed version
require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

async function createAdminUser() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to database');

    // Check if admin user already exists
    const existingAdmin = await User.findOne({ username: 'admin' });
    if (existingAdmin) {
      console.log('Admin user already exists');
      console.log('Current admin status:', {
        username: existingAdmin.username,
        email: existingAdmin.email,
        role: existingAdmin.role,
        isActive: existingAdmin.isActive,
        isLocked: existingAdmin.isLocked
      });
      return;
    }    // Create admin user
    const adminUser = new User({
      username: 'admin',
      email: 'admin@example.com',
      password: 'admin123!',
      firstName: 'System',
      lastName: 'Administrator',
      role: 'admin',
      department: 'IT Administration',
      isActive: true, // Admin user should be active by default
      approvedAt: new Date(),
      approvedBy: null // Self-approved as initial admin
    });

    await adminUser.save();
    console.log('✅ Admin user created successfully');
    console.log('Username: admin');
    console.log('Password: admin123!');
    console.log('Email: admin@undashboard.local');
    console.log('Role: admin');
    console.log('Status: Active');

  } catch (error) {
    console.error('❌ Error creating admin user:', error.message);
    if (error.code === 11000) {
      console.error('A user with this username or email already exists');
    }
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

createAdminUser();
