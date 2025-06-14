// Debug admin login issue
require('dotenv').config({ path: './.env.local' });
const dbConnection = require('./lib/db');
const User = require('./models/User');
const bcrypt = require('bcrypt');

async function debugAdminLogin() {
  try {
    await dbConnection.connectMongoDB();
    console.log('Connected to database');

    // Find the admin user
    const adminUser = await User.findOne({ username: 'admin' });
    if (!adminUser) {
      console.log('❌ Admin user not found');
      return;
    }

    console.log('📋 Admin user details:');
    console.log('- Username:', adminUser.username);
    console.log('- Email:', adminUser.email);
    console.log('- Role:', adminUser.role);
    console.log('- IsActive:', adminUser.isActive);
    console.log('- Password hash length:', adminUser.password.length);
    console.log('- LoginAttempts:', adminUser.loginAttempts);
    console.log('- IsLocked:', adminUser.isLocked);
    console.log('- LockUntil:', adminUser.lockUntil);

    // Test direct password comparison
    const testPassword = 'admin123!';
    console.log('\n🔑 Testing password:', testPassword);
    
    try {
      const isMatch = await bcrypt.compare(testPassword, adminUser.password);
      console.log('🔍 Password match result:', isMatch);
      
      if (!isMatch) {
        console.log('\n🔧 Password does not match, updating...');
        
        // Hash the new password
        const newHash = await bcrypt.hash(testPassword, 12);
        
        // Update the user directly
        await User.updateOne(
          { username: 'admin' },
          { 
            $set: { 
              password: newHash,
              isActive: true,
              updatedAt: new Date()
            },
            $unset: {
              loginAttempts: '',
              lockUntil: ''
            }
          }
        );
        
        console.log('✅ Password updated successfully');
        
        // Verify the update
        const updatedUser = await User.findOne({ username: 'admin' });
        const newMatch = await bcrypt.compare(testPassword, updatedUser.password);
        console.log('🧪 New password verification:', newMatch);
      }
      
    } catch (error) {
      console.error('❌ Password comparison error:', error);
    }

    // Test the findByCredentials method
    console.log('\n🧪 Testing findByCredentials...');
    try {
      const user = await User.findByCredentials('admin', testPassword);
      console.log('✅ findByCredentials success:', user.username);
    } catch (error) {
      console.log('❌ findByCredentials failed:', error.message);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await dbConnection.disconnectAll();
    process.exit(0);
  }
}

debugAdminLogin();
