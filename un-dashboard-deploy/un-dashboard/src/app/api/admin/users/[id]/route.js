import { NextResponse } from 'next/server';
import { AuthService } from '../../../../../../middleware/auth';
import User from '../../../../../../models/User';
import Session from '../../../../../../models/Session';
import dbConnection from '../../../../../../lib/db';

// Get specific user (admin only)
export async function GET(request, { params }) {
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

    // Check admin role
    if (authData.user.role !== 'admin') {
      return NextResponse.json({
        success: false,
        message: 'Admin access required'
      }, { status: 403 });
    }

    // Connect to database
    await dbConnection.connectMongoDB();

    const userId = params.id;
    const user = await User.findById(userId).select('-password -passwordResetToken -passwordResetExpires');

    if (!user) {
      return NextResponse.json({
        success: false,
        message: 'User not found'
      }, { status: 404 });
    }

    // Get user's active sessions
    const sessions = await Session.getActiveSessions(userId);

    return NextResponse.json({
      success: true,
      user: user,
      activeSessions: sessions.length
    });

  } catch (error) {
    console.error('Get user error:', error);
    
    return NextResponse.json({
      success: false,
      message: error.message || 'Failed to get user'
    }, { status: 500 });
  }
}

// Update specific user (admin only)
export async function PUT(request, { params }) {
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

    // Check admin role
    if (authData.user.role !== 'admin') {
      return NextResponse.json({
        success: false,
        message: 'Admin access required'
      }, { status: 403 });
    }

    // Connect to database
    await dbConnection.connectMongoDB();

    const userId = params.id;
    const body = await request.json();
    const { firstName, lastName, email, role, department, isActive, resetPassword } = body;

    const user = await User.findById(userId);
    if (!user) {
      return NextResponse.json({
        success: false,
        message: 'User not found'
      }, { status: 404 });
    }

    // Prevent admin from deactivating themselves
    if (userId === authData.user._id && isActive === false) {
      return NextResponse.json({
        success: false,
        message: 'Cannot deactivate your own account'
      }, { status: 400 });
    }

    // Update fields
    if (firstName !== undefined) user.firstName = firstName.trim();
    if (lastName !== undefined) user.lastName = lastName.trim();
    if (email !== undefined) {
      // Check if email already exists for another user
      const existingUser = await User.findOne({ email: email, _id: { $ne: userId } });
      if (existingUser) {
        return NextResponse.json({
          success: false,
          message: 'Email already exists'
        }, { status: 409 });
      }
      user.email = email.toLowerCase().trim();
    }
    if (role !== undefined) user.role = role;
    if (department !== undefined) user.department = department.trim();
    if (isActive !== undefined) user.isActive = isActive;

    // Reset password if requested
    if (resetPassword && resetPassword.newPassword) {
      if (resetPassword.newPassword.length < 8) {
        return NextResponse.json({
          success: false,
          message: 'Password must be at least 8 characters long'
        }, { status: 400 });
      }
      user.password = resetPassword.newPassword;
      
      // Logout all user sessions when password is reset
      await Session.deactivateUserSessions(userId);
    }

    await user.save();

    return NextResponse.json({
      success: true,
      message: 'User updated successfully',
      user: user.getProfile()
    });

  } catch (error) {
    console.error('Update user error:', error);

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
      message: error.message || 'Failed to update user'
    }, { status: 500 });
  }
}

// Delete specific user (admin only)
export async function DELETE(request, { params }) {
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

    // Check admin role
    if (authData.user.role !== 'admin') {
      return NextResponse.json({
        success: false,
        message: 'Admin access required'
      }, { status: 403 });
    }

    // Connect to database
    await dbConnection.connectMongoDB();

    const userId = params.id;

    // Prevent admin from deleting themselves
    if (userId === authData.user._id) {
      return NextResponse.json({
        success: false,
        message: 'Cannot delete your own account'
      }, { status: 400 });
    }

    const user = await User.findById(userId);
    if (!user) {
      return NextResponse.json({
        success: false,
        message: 'User not found'
      }, { status: 404 });
    }

    // Deactivate all user sessions
    await Session.deactivateUserSessions(userId);

    // Delete user
    await User.findByIdAndDelete(userId);

    return NextResponse.json({
      success: true,
      message: 'User deleted successfully'
    });

  } catch (error) {
    console.error('Delete user error:', error);
    
    return NextResponse.json({
      success: false,
      message: error.message || 'Failed to delete user'
    }, { status: 500 });
  }
}
