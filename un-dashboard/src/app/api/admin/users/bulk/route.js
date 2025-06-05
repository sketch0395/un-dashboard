import { NextResponse } from 'next/server';
import { AuthService } from '../../../../../../middleware/auth';
import User from '../../../../../../models/User';
import dbConnection from '../../../../../../lib/db';

// Bulk user operations (admin only)
export async function POST(request) {
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

    const body = await request.json();
    const { action, userIds } = body;

    if (!action || !Array.isArray(userIds) || userIds.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'Action and user IDs are required'
      }, { status: 400 });
    }

    await dbConnection.connectMongoDB();

    let updateOperation = {};
    let successMessage = '';

    switch (action) {
      case 'activate':
        updateOperation = { isActive: true };
        successMessage = 'Users activated successfully';
        break;
      case 'deactivate':
        // Prevent admin from deactivating themselves
        if (userIds.includes(authData.user.id)) {
          return NextResponse.json({
            success: false,
            message: 'You cannot deactivate your own account'
          }, { status: 400 });
        }
        updateOperation = { isActive: false };
        successMessage = 'Users deactivated successfully';
        break;
      case 'delete':
        // Prevent admin from deleting themselves
        if (userIds.includes(authData.user.id)) {
          return NextResponse.json({
            success: false,
            message: 'You cannot delete your own account'
          }, { status: 400 });
        }
        
        // Delete users instead of update
        const deleteResult = await User.deleteMany({
          _id: { $in: userIds }
        });

        return NextResponse.json({
          success: true,
          message: `${deleteResult.deletedCount} users deleted successfully`,
          deletedCount: deleteResult.deletedCount
        });
      default:
        return NextResponse.json({
          success: false,
          message: 'Invalid action'
        }, { status: 400 });
    }

    // For activate/deactivate operations
    const result = await User.updateMany(
      { _id: { $in: userIds } },
      updateOperation
    );

    return NextResponse.json({
      success: true,
      message: successMessage,
      modifiedCount: result.modifiedCount
    });

  } catch (error) {
    console.error('Bulk user operation error:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to perform bulk operation'
    }, { status: 500 });
  }
}
