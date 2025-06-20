import { NextResponse } from 'next/server';
import { AuthService } from '../../../../../middleware/auth';
import AuditLogger from '../../../../../services/auditLogger';
import { withRateLimit } from '../../../utils/rateLimiter';
import { withSecurityHeaders } from '../../../utils/securityHeaders';
import { emailNotificationService } from '../../../utils/emailNotifications';
import User from '../../../../../models/User';
import dbConnection from '../../../../../lib/db';

async function loginHandler(request) {
  let body = {};
  
  try {
    body = await request.json();
    const { username, password } = body;    // Validate input
    if (!username || !password) {
      return NextResponse.json({
        success: false,
        message: 'Username and password are required'
      }, { status: 400 });
    }    // Attempt login
    const loginResult = await AuthService.login(username, password, request);    // Log successful login
    const clientIP = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     request.ip || 
                     'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';
    
    try {
      console.log('📝 Attempting to log successful login for user:', loginResult.user._id);
      await AuditLogger.logUserLogin(
        loginResult.user._id, 
        clientIP, 
        userAgent, 
        true
      );
      console.log('✅ Successfully logged audit event');
    } catch (auditError) {
      console.error('❌ Failed to log audit event:', auditError);
    }

    // Set secure HTTP-only cookie for session
    const response = NextResponse.json({
      success: true,
      message: 'Login successful',
      user: loginResult.user
    });

    response.cookies.set('auth-token', loginResult.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 24 * 60 * 60, // 24 hours
      path: '/'
    });

    response.cookies.set('session-id', loginResult.sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 24 * 60 * 60, // 24 hours
      path: '/'
    });

    return response;  } catch (error) {
    console.error('Login error:', error);
    
    // Log failed login attempt
    const clientIP = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     request.ip || 
                     'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';
    
    try {
      // Try to find user to log failed attempt against their ID
      await dbConnection.connectMongoDB();
      const user = await User.findOne({
        $or: [
          { username: body.username },
          { email: body.username }
        ]
      });
      
      if (user) {
        await AuditLogger.logUserLogin(user._id, clientIP, userAgent, false);
      } else {
        // Log failed attempt without user ID
        await AuditLogger.log({
          action: 'LOGIN_ATTEMPT_FAILED',
          description: `Failed login attempt for unknown user: ${body.username}`,
          level: 'warning',
          ipAddress: clientIP,
          userAgent,
          details: { username: body.username }
        });
      }
    } catch (auditError) {
      console.error('Failed to log audit event:', auditError);
    }
    
    return NextResponse.json({
      success: false,
      message: error.message || 'Login failed'
    }, { status: 401 });
  }
}

// Apply security middleware stack to the login endpoint
// Note: Login endpoint should not require CSRF token since no session exists yet
export const POST = withSecurityHeaders(
  withRateLimit(loginHandler),
  { isAPI: true }
);

export async function GET() {
  return NextResponse.json({
    success: false,
    message: 'Method not allowed'
  }, { status: 405 });
}
