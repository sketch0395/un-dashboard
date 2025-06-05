import { NextResponse } from 'next/server';
import { AuthService } from '../../../../../middleware/auth';
import User from '../../../../../models/User';
import dbConnection from '../../../../../lib/db';
import AuditLogger from '../../../../../services/auditLogger';
import { withRateLimit } from '../../../utils/rateLimiter';
import { withSecurityHeaders } from '../../../utils/securityHeaders';
import { withCSRFProtection } from '../../../utils/csrfProtection';
import { emailNotificationService } from '../../../utils/emailNotifications';

async function changePasswordHandler(request) {
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

    // Get password data
    const body = await request.json();
    const { currentPassword, newPassword, confirmPassword } = body;

    // Validate input
    if (!currentPassword || !newPassword || !confirmPassword) {
      return NextResponse.json({
        success: false,
        message: 'All password fields are required'
      }, { status: 400 });
    }

    if (newPassword !== confirmPassword) {
      return NextResponse.json({
        success: false,
        message: 'New passwords do not match'
      }, { status: 400 });
    }

    if (newPassword.length < 8) {
      return NextResponse.json({
        success: false,
        message: 'New password must be at least 8 characters long'
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

    // Verify current password
    const isCurrentPasswordValid = await user.comparePassword(currentPassword);
    if (!isCurrentPasswordValid) {
      return NextResponse.json({
        success: false,
        message: 'Current password is incorrect'
      }, { status: 400 });
    }

    // Update password    user.password = newPassword;
    await user.save();    // Log password change
    const { ipAddress, userAgent } = AuditLogger.getRequestInfo(request);
    await AuditLogger.logPasswordChange(
      authData.user.id,
      ipAddress,
      userAgent,
      { username: authData.user.username }
    );

    // Send email notification for password change
    try {
      if (user.email) {
        await emailNotificationService.notifyPasswordChange(
          user.email,
          user.username,
          ipAddress,
          userAgent
        );
      }
    } catch (emailError) {
      console.error('Failed to send password change notification:', emailError);
      // Don't fail the response if email fails
    }

    return NextResponse.json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    console.error('Change password error:', error);
    
    // Log password change failure
    const { ipAddress, userAgent } = AuditLogger.getRequestInfo(request);
    const token = request.cookies.get('auth-token')?.value || 
                  request.headers.get('authorization')?.replace('Bearer ', '');
    
    let userId = null;
    try {
      if (token) {
        const mockReq = { headers: { authorization: `Bearer ${token}` } };
        const authData = await AuthService.verifyAuth(mockReq);
        userId = authData.user.id;
      }
    } catch (authError) {
      // Ignore auth errors for logging
    }
    
    await AuditLogger.logSystemError(
      'PASSWORD_CHANGE_ERROR',
      error.message,
      { ipAddress, userAgent, userId }
    );
    
    return NextResponse.json({
      success: false,
      message: error.message || 'Failed to change password'
    }, { status: 500 });
  }
}

// Apply security middleware stack to the change password endpoint
export const POST = withSecurityHeaders(
  withCSRFProtection(
    withRateLimit(changePasswordHandler),
    { requireToken: true, singleUse: true } // Use single-use tokens for password changes
  ),
  { isAPI: true }
);

export async function GET() {
  return NextResponse.json({
    success: false,
    message: 'Method not allowed'
  }, { status: 405 });
}
