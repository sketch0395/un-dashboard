const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
require('dotenv').config({ path: '.env.local' });

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URL, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Connected to MongoDB successfully');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

// User schema (simplified for this script)
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  role: { type: String, enum: ['admin', 'user', 'viewer'], default: 'user' },
  isActive: { type: Boolean, default: true },
  loginAttempts: { type: Number, default: 0 },
  lockUntil: { type: Date, default: null }
}, {
  timestamps: true,
  collection: 'users'
});

// Create or get User model
let User;
try {
  User = mongoose.model('User');
} catch {
  User = mongoose.model('User', userSchema);
}

const resetAdminPassword = async () => {
  await connectDB();
  
  try {
    const newPassword = 'admin123';
    const hashedPassword = await bcrypt.hash(newPassword, 12);
    
    // Find and update the admin user
    const result = await User.updateOne(
      { username: 'admin' },
      { 
        $set: { 
          password: hashedPassword,
          isActive: true,
          loginAttempts: 0,
          lockUntil: null
        }
      }
    );
    
    if (result.matchedCount === 0) {
      console.log('Admin user not found. Creating new admin user...');
      
      const adminUser = new User({
        username: 'admin',
        email: 'admin@undashboard.com',
        password: hashedPassword,
        firstName: 'Admin',
        lastName: 'User',
        role: 'admin',
        isActive: true
      });
      
      await adminUser.save();
      console.log('Admin user created successfully');
    } else {
      console.log('Admin password reset successfully');
    }
    
    // Verify the user can be found and password works
    const adminUser = await User.findOne({ username: 'admin' });
    if (adminUser) {
      const isMatch = await bcrypt.compare(newPassword, adminUser.password);
      console.log('Password verification:', isMatch ? 'SUCCESS' : 'FAILED');
      console.log('User details:', {
        username: adminUser.username,
        email: adminUser.email,
        role: adminUser.role,
        isActive: adminUser.isActive,
        loginAttempts: adminUser.loginAttempts,
        isLocked: adminUser.lockUntil && adminUser.lockUntil > Date.now()
      });
    }
    
  } catch (error) {
    console.error('Error resetting admin password:', error);
  } finally {
    await mongoose.connection.close();
    console.log('Database connection closed');
  }
};

resetAdminPassword();
