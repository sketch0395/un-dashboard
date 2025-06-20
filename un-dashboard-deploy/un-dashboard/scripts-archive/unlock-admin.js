const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB
async function connectMongoDB() {
    try {
        await mongoose.connect(process.env.MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        console.log('MongoDB connected successfully');
        console.log('Connected to database');
    } catch (error) {
        console.error('MongoDB connection error:', error);
        process.exit(1);
    }
}

// User schema (simplified for this script)
const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['admin', 'user'], default: 'user' },
    isActive: { type: Boolean, default: true },
    failedLoginAttempts: { type: Number, default: 0 },
    accountLocked: { type: Boolean, default: false },
    lockUntil: { type: Date },
    lastLogin: { type: Date },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

let User;
try {
    User = mongoose.model('User');
} catch (error) {
    User = mongoose.model('User', userSchema);
}

async function unlockAdmin() {
    try {
        const result = await User.updateOne(
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

        console.log('Unlock result:', result);

        // Verify the admin user is now unlocked
        const admin = await User.findOne({ username: 'admin' });
        console.log('\n=== Admin user after unlock ===');
        console.log('Username:', admin.username);
        console.log('Email:', admin.email);
        console.log('Role:', admin.role);
        console.log('IsActive:', admin.isActive);
        console.log('FailedLoginAttempts:', admin.failedLoginAttempts);
        console.log('AccountLocked:', admin.accountLocked);
        console.log('LockUntil:', admin.lockUntil);
        console.log('LastLogin:', admin.lastLogin);

        console.log('\n✅ Admin account has been unlocked and is ready for login!');
        
    } catch (error) {
        console.error('Error unlocking admin:', error);
    }
}

async function main() {
    await connectMongoDB();
    await unlockAdmin();
    await mongoose.disconnect();
    console.log('MongoDB disconnected');
    console.log('All database connections closed');
    process.exit(0);
}

main().catch(console.error);
