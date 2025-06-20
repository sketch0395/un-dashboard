import { NextResponse } from 'next/server';
import { AuthService } from '../../../../../middleware/auth';
import { performanceOptimizer } from '../../../utils/performanceOptimizer';
import { withSecurityHeaders } from '../../../utils/securityHeaders';

async function performanceHandler(request) {
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
      // Get performance statistics
      const cacheStats = performanceOptimizer.getCacheStats();
      const sessionStats = await performanceOptimizer.getSessionStats();
      const auditStats = await performanceOptimizer.getAuditLogStats('24h');

      return NextResponse.json({
        success: true,
        data: {
          cache: cacheStats,
          sessions: sessionStats,
          auditLogs: auditStats,
          timestamp: new Date().toISOString()
        }
      });
    }

    if (method === 'POST') {
      const body = await request.json();
      const { action, params = {} } = body;

      let result = {};

      switch (action) {
        case 'clearCache':
          performanceOptimizer.clearCache(params.pattern);
          result = { message: 'Cache cleared successfully' };
          break;

        case 'createIndexes':
          result = await performanceOptimizer.createOptimalIndexes();
          break;

        case 'archiveLogs':
          result = await performanceOptimizer.archiveOldAuditLogs(
            params.olderThanDays || 90,
            params.batchSize || 5000
          );
          break;

        case 'cleanupSessions':
          result = await performanceOptimizer.cleanupSessionsBatch(
            params.criteria || {},
            params.batchSize || 1000
          );
          break;

        default:
          return NextResponse.json({
            success: false,
            message: 'Invalid action'
          }, { status: 400 });
      }

      return NextResponse.json({
        success: true,
        action,
        result
      });
    }

    return NextResponse.json({
      success: false,
      message: 'Method not allowed'
    }, { status: 405 });

  } catch (error) {
    console.error('Performance monitoring error:', error);
    return NextResponse.json({
      success: false,
      message: error.message || 'Internal server error'
    }, { status: 500 });
  }
}

// Apply security headers to the performance monitoring endpoint
export const GET = withSecurityHeaders(performanceHandler, { isAPI: true });
export const POST = withSecurityHeaders(performanceHandler, { isAPI: true });
