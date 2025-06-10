// Simple admin debug
console.log('Starting admin debug...');

require('dotenv').config({ path: './.env.local' });
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

async function simpleDebug() {
  try {
    console.log('Connecting to MongoDB...');
    const mongoUrl = process.env.MONGODB_URL || 'mongodb://admin:un-dashboard-2024@10.5.1.212:27017/undashboard?authSource=admin';
    await mongoose.connect(mongoUrl);
    console.log('✅ Connected to MongoDB');

    // Direct database access
    const db = mongoose.connection.db;
    const usersCollection = db.collection('users');
    
    const adminUser = await usersCollection.findOne({ username: 'admin' });
    console.log('📋 Admin user found:', !!adminUser);
    
    if (adminUser) {
      console.log('- Username:', adminUser.username);
      console.log('- Email:', adminUser.email);
      console.log('- IsActive:', adminUser.isActive);
      console.log('- Password hash exists:', !!adminUser.password);
      console.log('- Password hash length:', adminUser.password?.length || 0);
      
      // Test password
      const testPassword = 'admin123!';
      if (adminUser.password) {
        const isMatch = await bcrypt.compare(testPassword, adminUser.password);
        console.log('🔑 Password test result:', isMatch);
        
        if (!isMatch) {
          console.log('🔧 Updating password...');
          const newHash = await bcrypt.hash(testPassword, 12);
          
          await usersCollection.updateOne(
            { username: 'admin' },
            { 
              $set: { 
                password: newHash,
                isActive: true,
                updatedAt: new Date()
              },
              $unset: {
                loginAttempts: '',
                lockUntil: ''
              }
            }
          );
          
          console.log('✅ Password updated!');
        }
      }
    }
    
    await mongoose.disconnect();
    console.log('✅ Complete!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

simpleDebug();
