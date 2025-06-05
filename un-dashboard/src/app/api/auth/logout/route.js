import { NextResponse } from 'next/server';
import { AuthService } from '../../../../../middleware/auth';
import AuditLogger from '../../../../../services/auditLogger';
import { withRateLimit } from '../../../utils/rateLimiter';
import { withSecurityHeaders } from '../../../utils/securityHeaders';
import { withCSRFProtection } from '../../../utils/csrfProtection';
import { emailNotificationService } from '../../../utils/emailNotifications';
import User from '../../../../../models/User';
import dbConnection from '../../../../../lib/db';

async function logoutHandler(request) {
  try {
    // Get token and session ID from cookies
    const token = request.cookies.get('auth-token')?.value;
    const sessionId = request.cookies.get('session-id')?.value;
    
    let userId = null;
    let userInfo = null;
    
    // Try to get user info for audit logging and email notifications before logout
    if (token) {
      try {
        const mockReq = {
          headers: {
            authorization: `Bearer ${token}`
          }
        };
        const authData = await AuthService.verifyAuth(mockReq);
        userId = authData.user.id;
        userInfo = authData.user;
      } catch (error) {
        // Ignore auth errors, we'll still proceed with logout
      }
    }
    
    if (sessionId) {
      // Logout the session
      await AuthService.logout(sessionId);
    }

    // Send email notification for session termination
    if (userInfo && userInfo.email) {
      try {
        await dbConnection.connectMongoDB();
        const user = await User.findById(userId);
        
        if (user && user.email) {
          const { ipAddress, userAgent } = AuditLogger.getRequestInfo(request);
          await emailNotificationService.notifySessionTermination(
            user.email,
            user.username,
            ipAddress,
            userAgent
          );
        }
      } catch (emailError) {
        console.error('Failed to send session termination notification:', emailError);
        // Don't fail the logout if email fails
      }
    }

    // Log logout event
    const { ipAddress, userAgent } = AuditLogger.getRequestInfo(request);
    await AuditLogger.logLogout(
      userId,
      ipAddress,
      userAgent,
      { sessionId }
    );    // Create response
    const response = NextResponse.json({
      success: true,
      message: 'Logged out successfully'
    });

    // Add cache-busting headers
    response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');

    // Clear cookies with explicit domain and path
    response.cookies.set('auth-token', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 0,
      path: '/',
      expires: new Date(0)
    });

    response.cookies.set('session-id', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 0,
      path: '/',
      expires: new Date(0)
    });

    return response;
  } catch (error) {
    console.error('Logout error:', error);
    
    // Even if logout fails, clear cookies and log the attempt
    const { ipAddress, userAgent } = AuditLogger.getRequestInfo(request);
    await AuditLogger.logSystemError(
      'AUTH_LOGOUT_ERROR',
      error.message,
      { ipAddress, userAgent }
    );
      const response = NextResponse.json({
      success: true,
      message: 'Logged out successfully'
    });

    // Add cache-busting headers
    response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');

    response.cookies.set('auth-token', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 0,
      path: '/',
      expires: new Date(0)
    });

    response.cookies.set('session-id', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 0,
      path: '/',
      expires: new Date(0)
    });

    return response;
  }
}

// Logout all sessions
export async function DELETE(request) {
  try {
    // Get token from cookies or header
    const token = request.cookies.get('auth-token')?.value || 
                  request.headers.get('authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return NextResponse.json({
        success: false,
        message: 'No active session found'
      }, { status: 401 });
    }

    // Verify auth to get user ID
    const mockReq = {
      headers: {
        authorization: `Bearer ${token}`
      }
    };

    const authData = await AuthService.verifyAuth(mockReq);
    
    // Logout all sessions for this user
    await AuthService.logoutAll(authData.user._id);

    // Log logout all event
    const { ipAddress, userAgent } = AuditLogger.getRequestInfo(request);
    await AuditLogger.logLogout(
      authData.user.id,
      ipAddress,
      userAgent,
      { logoutType: 'all_sessions' }
    );

    // Create response
    const response = NextResponse.json({
      success: true,
      message: 'All sessions logged out successfully'
    });

    // Clear cookies
    response.cookies.set('auth-token', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 0,
      path: '/'
    });

    response.cookies.set('session-id', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 0,
      path: '/'
    });

    return response;
  } catch (error) {
    console.error('Logout all error:', error);
    
    // Log the error
    const { ipAddress, userAgent } = AuditLogger.getRequestInfo(request);
    await AuditLogger.logSystemError(
      'AUTH_LOGOUT_ALL_ERROR',
      error.message,
      { ipAddress, userAgent }
    );
    
    return NextResponse.json({
      success: false,
      message: 'Failed to logout all sessions'
    }, { status: 500 });
  }
}

// Apply security middleware stack to the logout endpoint
export const POST = withSecurityHeaders(
  withCSRFProtection(
    withRateLimit(logoutHandler),
    { requireToken: true, singleUse: false }
  ),
  { isAPI: true }
);

export async function GET() {
  return NextResponse.json({
    success: false,
    message: 'Method not allowed'
  }, { status: 405 });
}
