const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

// Connect to MongoDB
const connectDB = async () => {
    try {
        await mongoose.connect('mongodb://admin:un-dashboard-2024@10.5.1.212:27017/undashboard?authSource=admin');
        console.log('✅ Connected to MongoDB');
    } catch (error) {
        console.error('❌ MongoDB connection error:', error.message);
        process.exit(1);
    }
};

const testLogin = async () => {
    try {
        const db = mongoose.connection.db;
        const usersCollection = db.collection('users');
        
        // Get the admin user
        const admin = await usersCollection.findOne({ username: 'admin' });
        
        if (!admin) {
            console.log('❌ Admin user not found');
            return;
        }
        
        console.log('📋 Admin user details:');
        console.log('- Username:', admin.username);
        console.log('- Email:', admin.email);
        console.log('- IsActive:', admin.isActive);
        console.log('- Password hash length:', admin.password ? admin.password.length : 'NO PASSWORD');
        
        // Test password
        const testPassword = 'admin123!';
        console.log(`\n🔑 Testing password: "${testPassword}"`);
        
        if (!admin.password) {
            console.log('❌ No password hash found');
            return;
        }
        
        const isMatch = await bcrypt.compare(testPassword, admin.password);
        console.log('🔑 Password match result:', isMatch);
        
        if (!isMatch) {
            console.log('❌ Password does not match');
            console.log('🔧 Updating password...');
            
            // Hash the password and update
            const hashedPassword = await bcrypt.hash(testPassword, 10);
            const result = await usersCollection.updateOne(
                { username: 'admin' },
                { 
                    $set: { 
                        password: hashedPassword,
                        updatedAt: new Date()
                    },
                    $unset: {
                        failedLoginAttempts: "",
                        accountLocked: "",
                        lockUntil: ""
                    }
                }
            );
            
            console.log('✅ Password updated successfully:', result.modifiedCount, 'document(s) modified');
            
            // Test again
            const updatedAdmin = await usersCollection.findOne({ username: 'admin' });
            const secondTest = await bcrypt.compare(testPassword, updatedAdmin.password);
            console.log('🔑 Second test result:', secondTest);
        } else {
            console.log('✅ Password matches correctly!');
        }
        
    } catch (error) {
        console.error('❌ Error testing login:', error.message);
    }
};

const main = async () => {
    await connectDB();
    await testLogin();
    await mongoose.disconnect();
    console.log('👋 Disconnected from MongoDB');
};

main().catch(error => {
    console.error('❌ Script error:', error.message);
    process.exit(1);
});
