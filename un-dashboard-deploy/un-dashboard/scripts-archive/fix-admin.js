// Fix admin user credentials and activation
require('dotenv').config({ path: './.env.local' });
const dbConnection = require('./lib/db');
const User = require('./models/User');
const bcrypt = require('bcryptjs');

async function fixAdminUser() {
  try {
    await dbConnection.connectMongoDB();
    console.log('Connected to database');

    // Find admin user
    let adminUser = await User.findOne({ username: 'admin' });
    
    if (!adminUser) {
      console.log('❌ Admin user not found, creating new one...');
      
      // Create new admin user
      adminUser = new User({
        username: 'admin',
        email: 'admin@undashboard.local',
        password: 'admin123!',
        firstName: 'System',
        lastName: 'Administrator',
        role: 'admin',
        department: 'IT Administration',
        isActive: true,
        approvedAt: new Date(),
        approvedBy: null
      });

      await adminUser.save();
      console.log('✅ New admin user created successfully');
    } else {
      console.log('✅ Admin user found, checking status...');
      
      // Check if admin user is active
      if (!adminUser.isActive) {
        console.log('⚠️  Admin user is inactive, activating...');
        adminUser.isActive = true;
        adminUser.approvedAt = new Date();
        await adminUser.save();
        console.log('✅ Admin user activated');
      } else {
        console.log('✅ Admin user is already active');
      }

      // Reset password to ensure it's correct
      console.log('🔒 Resetting admin password to admin123!...');
      adminUser.password = 'admin123!';
      await adminUser.save();
      console.log('✅ Admin password reset successfully');
    }

    // Verify the credentials work
    console.log('\n🧪 Testing credentials...');
    
    try {
      // Test with username
      const testUser1 = await User.findByCredentials('admin', 'admin123!');
      console.log('✅ Login with username "admin" works');
      
      // Test with email
      const testUser2 = await User.findByCredentials('admin@undashboard.local', 'admin123!');
      console.log('✅ Login with email "admin@undashboard.local" works');
      
      console.log('\n📋 Admin user details:');
      console.log('Username:', testUser1.username);
      console.log('Email:', testUser1.email);
      console.log('Role:', testUser1.role);
      console.log('Active:', testUser1.isActive);
      console.log('Created:', testUser1.createdAt);
      
    } catch (credError) {
      console.log('❌ Credential test failed:', credError.message);
    }

  } catch (error) {
    console.error('❌ Error fixing admin user:', error.message);
  } finally {
    await dbConnection.disconnectAll();
    process.exit(0);
  }
}

fixAdminUser();
