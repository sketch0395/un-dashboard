import { NextResponse } from 'next/server';
import { AuthService } from '../../../../../middleware/auth';
import Session from '../../../../../models/Session';
import dbConnection from '../../../../../lib/db';
import AuditLogger from '../../../../../services/auditLogger';

// Get active sessions for current user
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

    await dbConnection.connectMongoDB();

    // Get all active sessions for the user
    const sessions = await Session.find({
      userId: authData.user._id,
      isActive: true,
      expiresAt: { $gt: new Date() }
    })
    .sort({ lastActivity: -1 })
    .select('sessionId ipAddress userAgent createdAt lastActivity expiresAt');

    // Format sessions for response
    const formattedSessions = sessions.map(session => ({
      id: session.sessionId,
      ipAddress: session.ipAddress,
      userAgent: session.userAgent,
      createdAt: session.createdAt,
      lastActivity: session.lastActivity,
      expiresAt: session.expiresAt,
      isCurrent: session.sessionId === authData.sessionId
    }));

    return NextResponse.json({
      success: true,
      sessions: formattedSessions
    });

  } catch (error) {
    console.error('Get sessions error:', error);
    
    return NextResponse.json({
      success: false,
      message: error.message || 'Failed to get sessions'
    }, { status: 500 });
  }
}

// Terminate specific session (other than current)
export async function DELETE(request) {
  try {
    const body = await request.json();
    const { sessionId } = body;

    if (!sessionId) {
      return NextResponse.json({
        success: false,
        message: 'Session ID is required'
      }, { status: 400 });
    }

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

    // Prevent user from terminating their current session
    if (sessionId === authData.sessionId) {
      return NextResponse.json({
        success: false,
        message: 'Cannot terminate current session. Use logout instead.'
      }, { status: 400 });
    }

    await dbConnection.connectMongoDB();

    // Find and verify the session belongs to the current user
    const session = await Session.findOne({
      sessionId,
      userId: authData.user._id,
      isActive: true
    });

    if (!session) {
      return NextResponse.json({
        success: false,
        message: 'Session not found or already terminated'
      }, { status: 404 });
    }

    // Deactivate the session
    await session.deactivate();

    // Log session termination
    const { ipAddress, userAgent } = AuditLogger.getRequestInfo(request);
    await AuditLogger.logLogout(
      authData.user.id,
      ipAddress,
      userAgent,
      { 
        sessionId,
        terminatedBy: 'user',
        terminatedVia: 'session_management'
      }
    );

    return NextResponse.json({
      success: true,
      message: 'Session terminated successfully'
    });

  } catch (error) {
    console.error('Terminate session error:', error);
    
    return NextResponse.json({
      success: false,
      message: error.message || 'Failed to terminate session'
    }, { status: 500 });
  }
}
