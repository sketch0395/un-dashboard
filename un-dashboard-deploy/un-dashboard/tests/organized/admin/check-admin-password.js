const mongoose = require('mongoose');
const User = require('./models/User');

async function checkAdminPassword() {
    try {
        await mongoose.connect('mongodb://admin:un-dashboard-2024@10.5.1.212:27017/undashboard?authSource=admin');
        console.log('✅ Connected to MongoDB');

        const admin = await User.findOne({ username: 'admin' });
        if (!admin) {
            console.log('❌ Admin user not found');
            return;
        }

        console.log('👤 Admin user details:');
        console.log(`   Username: ${admin.username}`);
        console.log(`   Email: ${admin.email}`);
        console.log(`   Role: ${admin.role}`);
        console.log(`   Active: ${admin.isActive}`);
        console.log(`   Login Attempts: ${admin.loginAttempts || 0}`);
        console.log(`   Account Locked: ${admin.isLocked || false}`);
        
        // Test common passwords
        const commonPasswords = ['admin123', 'admin', 'password', 'admin1234', 'undashboard', 'Admin123!'];
        
        console.log('\n🔐 Testing common passwords...');
        
        for (const password of commonPasswords) {
            try {
                const isMatch = await admin.comparePassword(password);
                if (isMatch) {
                    console.log(`✅ FOUND CORRECT PASSWORD: "${password}"`);
                    break;
                }
            } catch (error) {
                console.log(`❌ Password "${password}" failed: ${error.message}`);
            }
        }
        
        // Reset login attempts if locked
        if (admin.loginAttempts && admin.loginAttempts > 0) {
            console.log('\n🔧 Resetting login attempts...');
            await admin.resetLoginAttempts();
            console.log('✅ Login attempts reset');
        }
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await mongoose.disconnect();
        console.log('\n🔐 MongoDB disconnected');
    }
}

checkAdminPassword();
