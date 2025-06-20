import { NextResponse } from 'next/server';
import { AuthService } from '../../../../../middleware/auth';
import User from '../../../../../models/User';
import dbConnection from '../../../../../lib/db';

// Get user profile
export async function GET(request) {
  try {
    // Get token from cookies or authorization header
    const token = request.cookies.get('auth-token')?.value || 
                  request.headers.get('authorization')?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json({
        success: false,
        message: 'Authentication required'
      }, { status: 401 });
    }

    // Create mock request object for AuthService
    const mockReq = {
      headers: {
        authorization: `Bearer ${token}`
      }
    };

    // Verify authentication
    const authData = await AuthService.verifyAuth(mockReq);

    return NextResponse.json({
      success: true,
      user: authData.user
    });

  } catch (error) {
    console.error('Get profile error:', error);
    
    return NextResponse.json({
      success: false,
      message: error.message || 'Failed to get profile'
    }, { status: 401 });
  }
}

// Update user profile
export async function PUT(request) {
  try {
    // Get token from cookies or authorization header
    const token = request.cookies.get('auth-token')?.value || 
                  request.headers.get('authorization')?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json({
        success: false,
        message: 'Authentication required'
      }, { status: 401 });
    }

    // Create mock request object for AuthService
    const mockReq = {
      headers: {
        authorization: `Bearer ${token}`
      }
    };

    // Verify authentication
    const authData = await AuthService.verifyAuth(mockReq);

    // Get update data
    const body = await request.json();
    const { firstName, lastName, department, preferences } = body;

    // Connect to database
    await dbConnection.connectMongoDB();

    // Find and update user
    const user = await User.findById(authData.user._id);
    if (!user) {
      return NextResponse.json({
        success: false,
        message: 'User not found'
      }, { status: 404 });
    }

    // Update allowed fields
    if (firstName !== undefined) user.firstName = firstName.trim();
    if (lastName !== undefined) user.lastName = lastName.trim();
    if (department !== undefined) user.department = department.trim();
    if (preferences !== undefined) {
      user.preferences = { ...user.preferences, ...preferences };
    }

    await user.save();

    return NextResponse.json({
      success: true,
      message: 'Profile updated successfully',
      user: user.getProfile()
    });

  } catch (error) {
    console.error('Update profile error:', error);
    
    // Handle mongoose validation errors
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return NextResponse.json({
        success: false,
        message: 'Validation error',
        errors: errors
      }, { status: 400 });
    }

    return NextResponse.json({
      success: false,
      message: error.message || 'Failed to update profile'
    }, { status: 500 });
  }
}
