const mongoose = require('mongoose');
const User = require('./models/User');

async function checkUsers() {
    try {
        console.log('🔄 Connecting to MongoDB...');
        await mongoose.connect('mongodb://10.5.1.212:27017/undashboard');
        console.log('✅ Connected to MongoDB');

        console.log('\n👥 Checking existing users...');
        const users = await User.find({}).select('username email role isActive');
        
        if (users.length === 0) {
            console.log('❌ No users found in database');
            console.log('\n🛠️ Creating default admin user...');
            
            const adminUser = new User({
                username: 'admin',
                email: 'admin@example.com',
                password: 'admin123',
                role: 'admin',
                isActive: true
            });
            
            await adminUser.save();
            console.log('✅ Default admin user created');
            console.log('   Username: admin');
            console.log('   Password: admin123');
        } else {
            console.log(`✅ Found ${users.length} users:`);
            users.forEach(user => {
                console.log(`   - ${user.username} (${user.email}) - Role: ${user.role} - Active: ${user.isActive}`);
            });
        }
    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await mongoose.disconnect();
        console.log('\n🔐 MongoDB connection closed');
    }
}

checkUsers();
