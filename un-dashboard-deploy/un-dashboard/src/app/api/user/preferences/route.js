import { NextResponse } from 'next/server';
import { AuthService } from '../../../../../middleware/auth';
import User from '../../../../../models/User';
import dbConnection from '../../../../../lib/db';

// Get user preferences
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

    // Connect to database
    await dbConnection.connectMongoDB();

    // Get user with preferences
    const user = await User.findById(authData.user._id).select('preferences');
    if (!user) {
      return NextResponse.json({
        success: false,
        message: 'User not found'
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      preferences: user.preferences || {}
    });

  } catch (error) {
    console.error('Get preferences error:', error);
    
    return NextResponse.json({
      success: false,
      message: error.message || 'Failed to get preferences'
    }, { status: 500 });
  }
}

// Update user preferences
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

    // Get preferences data
    const body = await request.json();
    const { preferences } = body;

    if (!preferences || typeof preferences !== 'object') {
      return NextResponse.json({
        success: false,
        message: 'Valid preferences object is required'
      }, { status: 400 });
    }

    // Connect to database
    await dbConnection.connectMongoDB();

    // Find user
    const user = await User.findById(authData.user._id);
    if (!user) {
      return NextResponse.json({
        success: false,
        message: 'User not found'
      }, { status: 404 });
    }

    // Validate and merge preferences
    const updatedPreferences = { ...user.preferences };

    // Theme preference
    if (preferences.theme && ['light', 'dark', 'auto'].includes(preferences.theme)) {
      updatedPreferences.theme = preferences.theme;
    }

    // Notification preferences
    if (preferences.notifications) {
      updatedPreferences.notifications = {
        ...updatedPreferences.notifications,
        ...preferences.notifications
      };
    }

    // Dashboard preferences
    if (preferences.dashboard) {
      updatedPreferences.dashboard = {
        ...updatedPreferences.dashboard,
        ...preferences.dashboard
      };

      // Validate refresh interval (minimum 5 seconds, maximum 5 minutes)
      if (preferences.dashboard.refreshInterval) {
        const interval = parseInt(preferences.dashboard.refreshInterval);
        if (interval >= 5000 && interval <= 300000) {
          updatedPreferences.dashboard.refreshInterval = interval;
        }
      }

      // Validate default view
      if (preferences.dashboard.defaultView && 
          ['overview', 'network', 'docker', 'logs'].includes(preferences.dashboard.defaultView)) {
        updatedPreferences.dashboard.defaultView = preferences.dashboard.defaultView;
      }
    }

    // Update user preferences
    user.preferences = updatedPreferences;
    await user.save();

    return NextResponse.json({
      success: true,
      message: 'Preferences updated successfully',
      preferences: user.preferences
    });

  } catch (error) {
    console.error('Update preferences error:', error);
    
    return NextResponse.json({
      success: false,
      message: error.message || 'Failed to update preferences'
    }, { status: 500 });
  }
}

// Reset preferences to default
export async function DELETE(request) {
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

    // Connect to database
    await dbConnection.connectMongoDB();

    // Find user and reset preferences
    const user = await User.findById(authData.user._id);
    if (!user) {
      return NextResponse.json({
        success: false,
        message: 'User not found'
      }, { status: 404 });
    }

    // Reset to default preferences
    user.preferences = {
      theme: 'auto',
      notifications: {
        email: true,
        push: true
      },
      dashboard: {
        refreshInterval: 30000,
        defaultView: 'overview'
      }
    };

    await user.save();

    return NextResponse.json({
      success: true,
      message: 'Preferences reset to default',
      preferences: user.preferences
    });

  } catch (error) {
    console.error('Reset preferences error:', error);
    
    return NextResponse.json({
      success: false,
      message: error.message || 'Failed to reset preferences'
    }, { status: 500 });
  }
}
