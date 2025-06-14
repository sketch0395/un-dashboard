/**
 * Simple MongoDB user creation script
 */

/**
 * Simple MongoDB user creation script
 */

const mongoose = require('mongoose');
const User = require('./models/User');

async function createAdmin() {
    console.log('🔄 Creating admin user...');
    try {
        await mongoose.connect('mongodb://admin:un-dashboard-2024@10.5.1.212:27017/undashboard?authSource=admin');
        console.log('✅ Connected to MongoDB');

        // Check if admin exists
        const existingAdmin = await User.findOne({ username: 'admin' });
        if (existingAdmin) {
            console.log('✅ Admin user already exists');
            console.log(`   Username: ${existingAdmin.username}`);
            console.log(`   Email: ${existingAdmin.email}`);
            console.log(`   Role: ${existingAdmin.role}`);
            return;
        }

        // Create admin user
        const admin = new User({
            username: 'admin',
            email: 'admin@example.com', 
            password: 'admin123',
            role: 'admin',
            isActive: true
        });

        await admin.save();
        console.log('✅ Admin user created successfully');
        console.log('   Username: admin');
        console.log('   Password: admin123');
        
    } catch (error) {
        console.error('❌ Error creating admin:', error.message);
    } finally {
        await mongoose.disconnect();
        console.log('🔐 MongoDB disconnected');
        process.exit(0);
    }
}

createAdmin();
