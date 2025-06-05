const mongoose = require('mongoose');

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

const unlockAdmin = async () => {
    try {
        // Use direct collection access to avoid model issues
        const db = mongoose.connection.db;
        const usersCollection = db.collection('users');
        
        console.log('🔍 Looking for admin user...');
        const adminUser = await usersCollection.findOne({ username: 'admin' });
        
        if (!adminUser) {
            console.log('❌ Admin user not found');
            return;
        }
        
        console.log('📋 Current admin user state:');
        console.log('- Username:', adminUser.username);
        console.log('- Email:', adminUser.email);
        console.log('- IsActive:', adminUser.isActive);
        console.log('- FailedLoginAttempts:', adminUser.failedLoginAttempts);
        console.log('- AccountLocked:', adminUser.accountLocked);
        console.log('- LockUntil:', adminUser.lockUntil);
        
        console.log('\n🔧 Unlocking admin account...');
        const result = await usersCollection.updateOne(
            { username: 'admin' },
            {
                $unset: {
                    failedLoginAttempts: "",
                    accountLocked: "",
                    lockUntil: ""
                },
                $set: {
                    isActive: true,
                    updatedAt: new Date()
                }
            }
        );
        
        console.log('✅ Update result:', result.modifiedCount, 'document(s) modified');
        
        // Verify the changes
        const updatedAdmin = await usersCollection.findOne({ username: 'admin' });
        console.log('\n📋 Updated admin user state:');
        console.log('- Username:', updatedAdmin.username);
        console.log('- Email:', updatedAdmin.email);
        console.log('- IsActive:', updatedAdmin.isActive);
        console.log('- FailedLoginAttempts:', updatedAdmin.failedLoginAttempts);
        console.log('- AccountLocked:', updatedAdmin.accountLocked);
        console.log('- LockUntil:', updatedAdmin.lockUntil);
        
        console.log('\n🎉 Admin account unlocked successfully!');
        
    } catch (error) {
        console.error('❌ Error unlocking admin:', error.message);
    }
};

const main = async () => {
    await connectDB();
    await unlockAdmin();
    await mongoose.disconnect();
    console.log('👋 Disconnected from MongoDB');
};

main().catch(error => {
    console.error('❌ Script error:', error.message);
    process.exit(1);
});
