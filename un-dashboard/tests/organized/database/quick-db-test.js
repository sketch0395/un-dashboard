require('dotenv').config({ path: './.env.local' });
const mongoose = require('mongoose');

async function quickTest() {
  try {
    console.log('🔗 Connecting to MongoDB...');
    console.log('URL:', process.env.MONGODB_URL?.replace(/\/\/[^:]+:[^@]+@/, '//***:***@'));
    
    await mongoose.connect(process.env.MONGODB_URL);
    console.log('✅ Connected to MongoDB successfully!');
    
    // Import User model
    const User = require('./models/User');
    
    // Check existing users
    const userCount = await User.countDocuments();
    console.log(`📊 Found ${userCount} users in database`);
    
    if (userCount === 0) {
      console.log('🔨 Creating admin user...');
      
      const adminUser = new User({
        username: 'admin',
        email: 'admin@undashboard.local',
        password: 'admin123!',
        firstName: 'System',
        lastName: 'Administrator',
        role: 'admin',
        department: 'IT Administration',
        isActive: true,
        approvedAt: new Date(),
        approvedBy: null
      });
      
      await adminUser.save();
      console.log('✅ Admin user created!');
      console.log('   Username: admin');
      console.log('   Password: admin123!');
    } else {
      console.log('👥 Existing users:');
      const users = await User.find({}).select('username email role isActive');
      users.forEach(user => {
        console.log(`   - ${user.username} (${user.email}) - ${user.role} - ${user.isActive ? 'Active' : 'Inactive'}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
    process.exit(0);
  }
}

quickTest();
