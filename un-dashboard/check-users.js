// Check what users exist in the database
const mongoose = require('mongoose');
const User = require('./models/User');
require('dotenv').config();

async function checkUsers() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');
        
        const users = await User.find({});
        console.log('Users in database:', users.length);
        
        users.forEach((user, index) => {
            console.log(`${index + 1}. Username: ${user.username}, Email: ${user.email}, Role: ${user.role}, Active: ${user.isActive}`);
        });
        
        if (users.length === 0) {
            console.log('No users found in database!');
            console.log('You may need to create an admin user first.');
        }
        
    } catch (error) {
        console.error('Error:', error.message);
    } finally {
        await mongoose.disconnect();
    }
}

checkUsers();
