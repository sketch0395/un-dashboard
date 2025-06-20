import { NextResponse } from 'next/server';
import User from '../../../../../models/User';
import dbConnection from '../../../../../lib/db';
import bcrypt from 'bcrypt';

export async function POST(request) {
  try {
    // Connect to database
    await dbConnection.connectMongoDB();
    
    // Check if admin already exists
    const existingAdmin = await User.findOne({ username: 'admin' });
      if (existingAdmin) {
      console.log('Updating existing admin user...');
      
      // Set password directly - let the User model pre-save middleware handle hashing
      existingAdmin.password = 'admin123!';
      existingAdmin.isActive = true;
      existingAdmin.loginAttempts = 0;
      existingAdmin.isLocked = false;
      existingAdmin.approvedAt = new Date();
      existingAdmin.approvedBy = null; // System creation
      
      await existingAdmin.save();
      
      return NextResponse.json({
        success: true,
        message: 'Admin user updated successfully',
        user: {
          username: existingAdmin.username,
          email: existingAdmin.email,
          isActive: existingAdmin.isActive
        }
      });
    } else {      console.log('Creating new admin user...');
      
      // Create new admin user - let User model handle password hashing
      const adminUser = new User({
        username: 'admin',
        email: 'admin@undashboard.local',
        password: 'admin123!', // Will be hashed by pre-save middleware
        firstName: 'Admin',
        lastName: 'User',
        role: 'admin',
        isActive: true,
        approvedAt: new Date(),
        approvedBy: null // System creation
      });
      
      await adminUser.save();
      
      return NextResponse.json({
        success: true,
        message: 'Admin user created successfully',
        user: {
          username: adminUser.username,
          email: adminUser.email,
          isActive: adminUser.isActive
        }
      });
    }
  } catch (error) {
    console.error('Error creating/updating admin:', error);
    return NextResponse.json({
      success: false,
      message: error.message
    }, { status: 500 });
  }
}
