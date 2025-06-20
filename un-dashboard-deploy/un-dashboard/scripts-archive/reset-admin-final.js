const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

// Connect to MongoDB
async function connectDB() {
    try {
        await mongoose.connect('mongodb://admin:un-dashboard-2024@10.5.1.212:27017/undashboard?authSource=admin');
        console.log('✅ Connected to MongoDB');
    } catch (error) {
        console.error('❌ MongoDB connection error:', error.message);
        process.exit(1);
    }
}

async function resetAdminPassword() {
    try {
        const db = mongoose.connection.db;
        const usersCollection = db.collection('users');
        
        // Get current admin
        const admin = await usersCollection.findOne({ username: 'admin' });
        if (!admin) {
            console.log('❌ Admin user not found');
            return;
        }
        
        console.log('📋 Current admin:', admin.username, admin.email);
        console.log('📋 Current password hash length:', admin.password ? admin.password.length : 'NO PASSWORD');
        
        // Create new password hash
        const newPassword = 'admin123!';
        console.log('🔧 Creating new password hash for:', newPassword);
        
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(newPassword, saltRounds);
        console.log('✅ New hash created, length:', hashedPassword.length);
        
        // Test the new hash immediately
        const testResult = await bcrypt.compare(newPassword, hashedPassword);
        console.log('🧪 Immediate test of new hash:', testResult);
        
        // Update the database
        const updateResult = await usersCollection.updateOne(
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
        
        console.log('📝 Database update result:', updateResult.modifiedCount, 'document(s) modified');
        
        // Verify the update
        const updatedAdmin = await usersCollection.findOne({ username: 'admin' });
        const finalTest = await bcrypt.compare(newPassword, updatedAdmin.password);
        console.log('🧪 Final verification test:', finalTest);
        
        console.log('✅ Admin password reset completed successfully!');
        
    } catch (error) {
        console.error('❌ Error resetting password:', error.message);
    }
}

async function main() {
    await connectDB();
    await resetAdminPassword();
    await mongoose.disconnect();
    console.log('👋 Disconnected from MongoDB');
}

main().catch(error => {
    console.error('❌ Script error:', error.message);
    process.exit(1);
});
