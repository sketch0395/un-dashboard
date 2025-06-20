import { NextResponse } from 'next/server';
import { AuthService } from '../../../../../middleware/auth';
import { sessionCleanupService } from '../../../utils/sessionCleanup';
import { withRateLimit } from '../../../utils/rateLimiter';
import { withSecurityHeaders } from '../../../utils/securityHeaders';
import { withCSRFProtection } from '../../../utils/csrfProtection';

async function sessionCleanupHandler(request) {
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

    // Verify authentication and admin role
    const mockReq = {
      headers: {
        authorization: `Bearer ${token}`
      }
    };

    const authData = await AuthService.verifyAuth(mockReq);
    
    if (authData.user.role !== 'admin') {
      return NextResponse.json({
        success: false,
        message: 'Admin access required'
      }, { status: 403 });
    }

    const method = request.method;

    if (method === 'GET') {
      // Get cleanup service status and statistics
      const stats = sessionCleanupService.getStats();
      const sessionStats = await sessionCleanupService.getSessionStats();

      return NextResponse.json({
        success: true,
        data: {
          cleanupService: stats,
          sessionStats
        }
      });

    } else if (method === 'POST') {
      const body = await request.json();
      const { action, options = {} } = body;

      switch (action) {
        case 'manual-cleanup':
          const result = await sessionCleanupService.manualCleanup(options);
          return NextResponse.json({
            success: result.success,
            message: result.message,
            data: { deletedCount: result.deletedCount }
          }, { status: result.success ? 200 : 500 });

        case 'start-service':
          const interval = options.intervalMinutes || 60;
          sessionCleanupService.start(interval);
          return NextResponse.json({
            success: true,
            message: `Cleanup service started with ${interval} minute interval`
          });

        case 'stop-service':
          sessionCleanupService.stop();
          return NextResponse.json({
            success: true,
            message: 'Cleanup service stopped'
          });

        case 'restart-service':
          const restartInterval = options.intervalMinutes || 60;
          sessionCleanupService.stop();
          setTimeout(() => {
            sessionCleanupService.start(restartInterval);
          }, 1000);
          return NextResponse.json({
            success: true,
            message: `Cleanup service restarted with ${restartInterval} minute interval`
          });

        case 'cleanup-user':
          if (!options.userId) {
            return NextResponse.json({
              success: false,
              message: 'User ID is required for user cleanup'
            }, { status: 400 });
          }
          
          const userResult = await sessionCleanupService.cleanupUserSessions(
            options.userId,
            options.keepCurrent || false,
            options.currentSessionId
          );
          
          return NextResponse.json({
            success: userResult.success,
            message: userResult.success ? 
              `Cleaned ${userResult.deletedCount} sessions for user` : 
              'Failed to clean user sessions',
            data: { deletedCount: userResult.deletedCount }
          }, { status: userResult.success ? 200 : 500 });

        default:
          return NextResponse.json({
            success: false,
            message: 'Invalid action'
          }, { status: 400 });
      }

    } else {
      return NextResponse.json({
        success: false,
        message: 'Method not allowed'
      }, { status: 405 });
    }

  } catch (error) {
    console.error('Session cleanup API error:', error);
    return NextResponse.json({
      success: false,
      message: error.message || 'Internal server error'
    }, { status: 500 });
  }
}

// Apply security headers and CSRF protection to admin endpoints
export const GET = withSecurityHeaders(sessionCleanupHandler, { isAPI: true });
export const POST = withSecurityHeaders(
  withCSRFProtection(
    sessionCleanupHandler,
    { requireToken: true, singleUse: false }
  ),
  { isAPI: true }
);
export const DELETE = withSecurityHeaders(
  withCSRFProtection(
    sessionCleanupHandler,
    { requireToken: true, singleUse: false }
  ),
  { isAPI: true }
);
