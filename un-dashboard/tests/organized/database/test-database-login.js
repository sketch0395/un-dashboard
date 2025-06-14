const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

// Import the User model
const User = require('./models/User');

const testDatabaseLogin = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URL);
    console.log('Connected to MongoDB successfully');

    // Test login with the reset credentials
    const user = await User.findByCredentials('admin', 'admin123');
    console.log('Login test SUCCESS!');
    console.log('User profile:', user.getProfile());

    // Also test with email
    const userByEmail = await User.findByCredentials('admin@undashboard.com', 'admin123');
    console.log('Email login test SUCCESS!');
    
  } catch (error) {
    console.error('Login test FAILED:', error.message);
  } finally {
    await mongoose.connection.close();
    console.log('Database connection closed');
  }
};

testDatabaseLogin();
