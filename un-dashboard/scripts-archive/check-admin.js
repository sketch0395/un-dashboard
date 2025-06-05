// Check admin user in database
require('dotenv').config({ path: './.env.local' });
const dbConnection = require('./lib/db');
const User = require('./models/User');

async function checkAdminUser() {
  try {
    await dbConnection.connectMongoDB();
    console.log('Connected to database');

    // Find admin user by username
    const adminByUsername = await User.findOne({ username: 'admin' });
    console.log('\n=== Admin user by username ===');
    if (adminByUsername) {
      console.log('Found admin user:');
      console.log('ID:', adminByUsername._id);
      console.log('Username:', adminByUsername.username);
      console.log('Email:', adminByUsername.email);
      console.log('Role:', adminByUsername.role);
      console.log('IsActive:', adminByUsername.isActive);
      console.log('Created:', adminByUsername.createdAt);
    } else {
      console.log('No admin user found by username');
    }

    // Find admin user by email
    const adminByEmail = await User.findOne({ email: 'admin@undashboard.local' });
    console.log('\n=== Admin user by email ===');
    if (adminByEmail) {
      console.log('Found admin user:');
      console.log('ID:', adminByEmail._id);
      console.log('Username:', adminByEmail.username);
      console.log('Email:', adminByEmail.email);
      console.log('Role:', adminByEmail.role);
      console.log('IsActive:', adminByEmail.isActive);
      console.log('Created:', adminByEmail.createdAt);
    } else {
      console.log('No admin user found by email');
    }

    // Count total users
    const totalUsers = await User.countDocuments();
    console.log('\n=== User statistics ===');
    console.log('Total users in database:', totalUsers);

    // List all users
    const allUsers = await User.find({}, 'username email role isActive').limit(10);
    console.log('\n=== All users (first 10) ===');
    allUsers.forEach((user, index) => {
      console.log(`${index + 1}. ${user.username} (${user.email}) - ${user.role} - Active: ${user.isActive}`);
    });

  } catch (error) {
    console.error('❌ Error checking admin user:', error.message);
  } finally {
    await dbConnection.disconnectAll();
    process.exit(0);
  }
}

checkAdminUser();
