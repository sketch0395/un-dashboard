// Startup script to ensure admin user exists
// This runs when the application starts

const mongoose = require('mongoose');
const User = require('./models/User');
const dbConnection = require('./lib/db');

async function ensureAdminUser() {
  console.log('🔧 Checking for admin user...');
  
  try {
    // Connect to database
    await dbConnection.connectMongoDB();
    console.log('✅ Database connected for admin check');

    // Check if admin user exists
    const existingAdmin = await User.findOne({ 
      $or: [
        { username: 'admin' },
        { role: 'admin', isActive: true }
      ]
    });

    if (existingAdmin) {
      console.log('✅ Admin user already exists:', {
        username: existingAdmin.username,
        email: existingAdmin.email,
        role: existingAdmin.role,
        isActive: existingAdmin.isActive
      });
      return existingAdmin;
    }

    // Create admin user
    console.log('👤 Creating default admin user...');
    
    const adminUser = new User({
      username: 'admin',
      email: 'admin@example.com',
      password: 'admin123!', // Will be hashed by the pre-save middleware
      firstName: 'System',
      lastName: 'Administrator',
      role: 'admin',
      department: 'IT Administration',
      isActive: true,
      approvedAt: new Date(),
      approvedBy: null,
      preferences: {
        theme: 'auto',
        notifications: {
          email: true,
          push: true
        },
        dashboard: {
          refreshInterval: 30000,
          defaultView: 'overview'
        }
      }
    });

    await adminUser.save();
    
    console.log('✅ Default admin user created successfully!');
    console.log('📋 Admin credentials:');
    console.log('   Username: admin');
    console.log('   Password: admin123!');
    console.log('   Email: admin@example.com');
    console.log('   Role: admin');
    console.log('   Status: Active');
    
    return adminUser;

  } catch (error) {
    console.error('❌ Error ensuring admin user:', error.message);
    
    // Don't fail the application startup if admin creation fails
    // The user can create an admin manually later
    console.log('⚠️  Continuing application startup without admin user');
    console.log('💡 You can create an admin user manually using create-admin-fixed.js');
    
    return null;
  }
}

// Export for use in startup scripts
module.exports = { ensureAdminUser };

// Run if called directly
if (require.main === module) {
  ensureAdminUser()
    .then(() => {
      console.log('🎉 Admin user check completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Admin user check failed:', error);
      process.exit(1);
    });
}
