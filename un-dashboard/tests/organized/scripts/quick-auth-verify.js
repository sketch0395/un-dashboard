// Quick authentication verification tool
require('dotenv').config({ path: './.env.local' });
const dbConnection = require('./lib/db');
const User = require('./models/User');

async function verifyAdminAuth() {
    console.log('🔍 Verifying admin authentication...');
    
    try {
        await dbConnection.connectMongoDB();
        console.log('✅ Connected to database');
        
        // Test the admin credentials
        const user = await User.findByCredentials('admin', 'admin123!');
        console.log('✅ Admin authentication successful!');
        console.log('👤 User details:');
        console.log('   Username:', user.username);
        console.log('   Email:', user.email);
        console.log('   Role:', user.role);
        console.log('   Active:', user.isActive);
        
        console.log('\n🎯 Ready for login at: http://localhost:3000/login');
        console.log('📝 Use credentials: admin / admin123!');
        
    } catch (error) {
        console.error('❌ Authentication failed:', error.message);
    } finally {
        await dbConnection.disconnectAll();
        process.exit(0);
    }
}

verifyAdminAuth();
