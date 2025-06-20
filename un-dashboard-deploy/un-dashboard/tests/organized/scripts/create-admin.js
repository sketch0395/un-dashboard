// Create initial admin user
require('dotenv').config({ path: './.env.local' });
const dbConnection = require('./lib/db');
const User = require('./models/User');

async function createAdminUser() {
  try {
    await dbConnection.connectMongoDB();
    console.log('Connected to database');

    // Check if admin user already exists
    const existingAdmin = await User.findOne({ username: 'admin' });
    if (existingAdmin) {
      console.log('Admin user already exists');
      return;
    }    // Create admin user
    const adminUser = new User({
      username: 'admin',
      email: 'admin@undashboard.local',
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

  } catch (error) {
    console.error('❌ Error creating admin user:', error.message);
  } finally {
    await dbConnection.disconnectAll();
    process.exit(0);
  }
}

createAdminUser();
