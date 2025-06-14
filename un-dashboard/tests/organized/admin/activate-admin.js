// Activate the admin user
require('dotenv').config({ path: './.env.local' });
const dbConnection = require('./lib/db');
const User = require('./models/User');

async function activateAdminUser() {
  try {
    await dbConnection.connectMongoDB();
    console.log('Connected to database');

    // Find the admin user
    const adminUser = await User.findOne({ username: 'admin' });
    if (!adminUser) {
      console.log('❌ Admin user not found');
      return;
    }

    // Check if already active
    if (adminUser.isActive) {
      console.log('✅ Admin user is already active');
      console.log('Username:', adminUser.username);
      console.log('Email:', adminUser.email);
      console.log('Role:', adminUser.role);
      console.log('Active:', adminUser.isActive);
      return;
    }

    // Activate the admin user
    adminUser.isActive = true;
    adminUser.approvedAt = new Date();
    adminUser.approvedBy = adminUser._id; // Self-approved
    
    await adminUser.save();
    
    console.log('✅ Admin user activated successfully');
    console.log('Username:', adminUser.username);
    console.log('Email:', adminUser.email);
    console.log('Role:', adminUser.role);
    console.log('Active:', adminUser.isActive);

  } catch (error) {
    console.error('❌ Error activating admin user:', error.message);
  } finally {
    await dbConnection.disconnectAll();
    process.exit(0);
  }
}

activateAdminUser();
