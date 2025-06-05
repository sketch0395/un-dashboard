const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
require('dotenv').config();

async function resetAdminPassword() {
  try {
    console.log('Connecting to MongoDB...');
    const mongoUrl = process.env.MONGODB_URL || 'mongodb://admin:un-dashboard-2024@10.5.1.212:27017/undashboard?authSource=admin';
    await mongoose.connect(mongoUrl);
    console.log('✅ Connected to MongoDB');

    // Import the User model to get the exact schema
    const User = require('./models/User');

    // Find the admin user
    const adminUser = await User.findOne({ username: 'admin' });
    if (!adminUser) {
      console.log('❌ Admin user not found');
      return;
    }

    console.log('🔍 Found admin user:', adminUser.username);
    console.log('📧 Email:', adminUser.email);
    console.log('🔑 Current hash length:', adminUser.password.length);

    // Hash the new password
    const newPassword = 'admin123!';
    console.log('🔐 Creating new password hash...');
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    console.log('✅ New hash created, length:', hashedPassword.length);

    // Update the user's password
    adminUser.password = hashedPassword;
    adminUser.isActive = true; // Ensure active
    adminUser.loginAttempts = 0; // Reset login attempts
    adminUser.isLocked = false; // Unlock if locked
    
    await adminUser.save();
    console.log('✅ Admin password updated successfully!');

    // Test the new password
    console.log('🧪 Testing new password...');
    const testResult = await bcrypt.compare(newPassword, hashedPassword);
    console.log('🧪 Password test result:', testResult);

    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB');
    
    console.log('\\n🎉 Admin user is ready!');
    console.log('Username: admin');
    console.log('Password: admin123!');
    console.log('Email: ' + adminUser.email);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

resetAdminPassword();
