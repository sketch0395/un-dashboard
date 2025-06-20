// User management utility
require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

async function connectDB() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('✅ Connected to database');
}

async function listUsers() {
  const users = await User.find({});
  console.log(`\n📋 Found ${users.length} users:`);
  users.forEach((user, index) => {
    console.log(`${index + 1}. ${user.username} (${user.email})`);
    console.log(`   Role: ${user.role}, Active: ${user.isActive}, Locked: ${user.isLocked || false}`);
    console.log(`   Created: ${user.createdAt}, Last Login: ${user.lastLogin || 'Never'}`);
    console.log('');
  });
}

async function activateUser(username) {
  const user = await User.findOne({ username });
  if (!user) {
    console.log(`❌ User '${username}' not found`);
    return;
  }
  
  user.isActive = true;
  user.approvedAt = new Date();
  await user.save();
  console.log(`✅ User '${username}' activated`);
}

async function unlockUser(username) {
  const user = await User.findOne({ username });
  if (!user) {
    console.log(`❌ User '${username}' not found`);
    return;
  }
  
  await user.resetLoginAttempts();
  console.log(`✅ User '${username}' unlocked`);
}

async function createUser(username, email, password, role = 'user') {
  try {
    const user = new User({
      username,
      email,
      password,
      firstName: 'User',
      lastName: 'Name',
      role,
      department: 'General',
      isActive: true,
      approvedAt: new Date()
    });
    
    await user.save();
    console.log(`✅ User '${username}' created successfully`);
  } catch (error) {
    console.error(`❌ Error creating user: ${error.message}`);
  }
}

async function resetPassword(username, newPassword) {
  const user = await User.findOne({ username });
  if (!user) {
    console.log(`❌ User '${username}' not found`);
    return;
  }
  
  user.password = newPassword;
  await user.save();
  console.log(`✅ Password reset for user '${username}'`);
}

function askQuestion(question) {
  return new Promise((resolve) => {
    rl.question(question, resolve);
  });
}

async function main() {
  try {
    await connectDB();
    
    console.log('\n🔧 UN Dashboard User Management Utility');
    console.log('=====================================');
    
    while (true) {
      console.log('\nOptions:');
      console.log('1. List all users');
      console.log('2. Activate user');
      console.log('3. Unlock user');
      console.log('4. Create new user');
      console.log('5. Reset user password');
      console.log('6. Exit');
      
      const choice = await askQuestion('\nEnter your choice (1-6): ');
      
      switch (choice) {
        case '1':
          await listUsers();
          break;
          
        case '2':
          const activateUsername = await askQuestion('Enter username to activate: ');
          await activateUser(activateUsername);
          break;
          
        case '3':
          const unlockUsername = await askQuestion('Enter username to unlock: ');
          await unlockUser(unlockUsername);
          break;
          
        case '4':
          const newUsername = await askQuestion('Enter username: ');
          const newEmail = await askQuestion('Enter email: ');
          const newPassword = await askQuestion('Enter password: ');
          const newRole = await askQuestion('Enter role (admin/user/viewer) [user]: ') || 'user';
          await createUser(newUsername, newEmail, newPassword, newRole);
          break;
          
        case '5':
          const resetUsername = await askQuestion('Enter username: ');
          const resetPassword = await askQuestion('Enter new password: ');
          await resetPassword(resetUsername, resetPassword);
          break;
          
        case '6':
          console.log('👋 Goodbye!');
          process.exit(0);
          break;
          
        default:
          console.log('❌ Invalid choice');
      }
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
    rl.close();
  }
}

main();
