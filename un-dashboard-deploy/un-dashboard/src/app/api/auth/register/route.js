import { NextResponse } from 'next/server';
import User from '../../../../../models/User';
import dbConnection from '../../../../../lib/db';
import AuditLogger from '../../../../../services/auditLogger';
import { withRateLimit } from '../../../utils/rateLimiter';
import { withSecurityHeaders } from '../../../utils/securityHeaders';

async function registerHandler(request) {
  try {
    const body = await request.json();
    const { username, email, password, firstName, lastName, department } = body;

    // Validate required fields
    if (!username || !email || !password || !firstName || !lastName) {
      return NextResponse.json({
        success: false,
        message: 'All required fields must be provided'
      }, { status: 400 });
    }

    // Validate password strength
    if (password.length < 8) {
      return NextResponse.json({
        success: false,
        message: 'Password must be at least 8 characters long'
      }, { status: 400 });
    }

    // Validate email format
    const emailRegex = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({
        success: false,
        message: 'Please enter a valid email address'
      }, { status: 400 });
    }

    // Connect to database
    await dbConnection.connectMongoDB();

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [
        { username: username },
        { email: email }
      ]
    });

    if (existingUser) {
      return NextResponse.json({
        success: false,
        message: 'Username or email already exists'
      }, { status: 409 });
    }    // Create new user with pending approval status
    const newUser = new User({
      username: username.trim(),
      email: email.toLowerCase().trim(),
      password,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      department: department?.trim() || '',
      role: 'user', // Default role
      isActive: false // New users require admin approval
    });    await newUser.save();

    // Log successful registration
    const { ipAddress, userAgent } = AuditLogger.getRequestInfo(request);
    await AuditLogger.logUserRegistration(
      newUser._id,
      ipAddress,
      userAgent,
      {
        username: newUser.username,
        email: newUser.email,
        firstName: newUser.firstName,
        lastName: newUser.lastName,
        department: newUser.department,
        pendingApproval: true
      }
    );

    // Return success response (without password)
    return NextResponse.json({
      success: true,
      message: 'Registration successful! Your account is pending admin approval. You will be notified once approved.',
      user: newUser.getProfile(),
      pendingApproval: true
    }, { status: 201 });
  } catch (error) {
    console.error('Registration error:', error);

    // Log registration failure
    const { ipAddress, userAgent } = AuditLogger.getRequestInfo(request);
    const body = await request.json().catch(() => ({}));
    await AuditLogger.logSystemError(
      'USER_REGISTRATION_ERROR',
      error.message,
      {
        ipAddress,
        userAgent,
        username: body.username,
        email: body.email
      }
    );

    // Handle mongoose validation errors
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return NextResponse.json({
        success: false,
        message: 'Validation error',
        errors: errors
      }, { status: 400 });
    }

    // Handle duplicate key errors
    if (error.code === 11000) {
      return NextResponse.json({
        success: false,
        message: 'Username or email already exists'
      }, { status: 409 });
    }

    return NextResponse.json({
      success: false,
      message: 'Registration failed'
    }, { status: 500 });
  }
}

// Apply security middleware stack to the register endpoint
// Note: Register endpoint should not require CSRF token since no session exists yet
export const POST = withSecurityHeaders(
  withRateLimit(registerHandler),
  { isAPI: true }
);

export async function GET() {
  return NextResponse.json({
    success: false,
    message: 'Method not allowed'
  }, { status: 405 });
}
