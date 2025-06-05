import { NextResponse } from 'next/server';
import { AuthService } from '../../../../../middleware/auth';
import Session from '../../../../../models/Session';
import User from '../../../../../models/User';
import dbConnection from '../../../../../lib/db';
import AuditLogger from '../../../../../services/auditLogger';

// Get all active sessions (admin only)
export async function GET(request) {
  try {
    // Verify admin authentication
    const authResult = await AuthService.verifyAuth(request);
    if (!authResult.success) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    if (!authResult.user.isAdmin) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    await dbConnection.connectMongoDB();

    // Get URL parameters for pagination and filtering
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page')) || 1;
    const limit = parseInt(url.searchParams.get('limit')) || 20;
    const search = url.searchParams.get('search') || '';
    const skip = (page - 1) * limit;

    // Build query for active sessions
    const sessionQuery = {
      isActive: true,
      expiresAt: { $gt: new Date() }
    };

    // Get sessions with user data
    const sessionsAggregation = [
      { $match: sessionQuery },
      {
        $lookup: {
          from: 'users',
          localField: 'userId',
          foreignField: '_id',
          as: 'user'
        }
      },
      { $unwind: '$user' },
      {
        $match: search ? {
          $or: [
            { 'user.username': { $regex: search, $options: 'i' } },
            { 'user.email': { $regex: search, $options: 'i' } },
            { 'user.firstName': { $regex: search, $options: 'i' } },
            { 'user.lastName': { $regex: search, $options: 'i' } },
            { ipAddress: { $regex: search, $options: 'i' } }
          ]
        } : {}
      },
      { $sort: { lastActivity: -1 } },
      { $skip: skip },
      { $limit: limit },
      {
        $project: {
          sessionId: 1,
          ipAddress: 1,
          userAgent: 1,
          createdAt: 1,
          lastActivity: 1,
          expiresAt: 1,
          'user._id': 1,
          'user.username': 1,
          'user.email': 1,
          'user.firstName': 1,
          'user.lastName': 1,
          'user.role': 1,
          'user.isAdmin': 1
        }
      }
    ];

    const sessions = await Session.aggregate(sessionsAggregation);

    // Get total count for pagination
    const totalCountAggregation = [
      { $match: sessionQuery },
      {
        $lookup: {
          from: 'users',
          localField: 'userId',
          foreignField: '_id',
          as: 'user'
        }
      },
      { $unwind: '$user' },
      {
        $match: search ? {
          $or: [
            { 'user.username': { $regex: search, $options: 'i' } },
            { 'user.email': { $regex: search, $options: 'i' } },
            { 'user.firstName': { $regex: search, $options: 'i' } },
            { 'user.lastName': { $regex: search, $options: 'i' } },
            { ipAddress: { $regex: search, $options: 'i' } }
          ]
        } : {}
      },
      { $count: 'total' }
    ];

    const totalResult = await Session.aggregate(totalCountAggregation);
    const total = totalResult[0]?.total || 0;

    // Format sessions for response
    const formattedSessions = sessions.map(session => ({
      id: session.sessionId,
      userId: session.user._id,
      username: session.user.username,
      email: session.user.email,
      fullName: `${session.user.firstName} ${session.user.lastName}`,
      role: session.user.role,
      isAdmin: session.user.isAdmin,
      ipAddress: session.ipAddress,
      userAgent: session.userAgent,
      createdAt: session.createdAt,
      lastActivity: session.lastActivity,
      expiresAt: session.expiresAt
    }));

    return NextResponse.json({
      success: true,
      data: {
        sessions: formattedSessions,
        pagination: {
          current: page,
          pages: Math.ceil(total / limit),
          total,
          hasNext: page * limit < total,
          hasPrev: page > 1
        }
      }
    });

  } catch (error) {
    console.error('Get admin sessions error:', error);
    return NextResponse.json(
      { error: 'Failed to get sessions' },
      { status: 500 }
    );
  }
}

// Terminate specific session (admin only)
export async function DELETE(request) {
  try {
    // Verify admin authentication
    const authResult = await AuthService.verifyAuth(request);
    if (!authResult.success) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    if (!authResult.user.isAdmin) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { sessionId } = body;

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      );
    }

    await dbConnection.connectMongoDB();

    // Find the session with user data
    const sessionData = await Session.aggregate([
      { $match: { sessionId, isActive: true } },
      {
        $lookup: {
          from: 'users',
          localField: 'userId',
          foreignField: '_id',
          as: 'user'
        }
      },
      { $unwind: '$user' },
      {
        $project: {
          sessionId: 1,
          userId: 1,
          ipAddress: 1,
          userAgent: 1,
          'user.username': 1,
          'user.email': 1
        }
      }
    ]);

    if (!sessionData.length) {
      return NextResponse.json(
        { error: 'Session not found or already terminated' },
        { status: 404 }
      );
    }

    const session = sessionData[0];

    // Terminate the session
    await Session.findOneAndUpdate(
      { sessionId },
      { isActive: false, terminatedAt: new Date() }
    );

    // Log session termination
    const { ipAddress, userAgent } = AuditLogger.getRequestInfo(request);
    await AuditLogger.logLogout(
      session.userId,
      ipAddress,
      userAgent,
      { 
        sessionId,
        terminatedBy: 'admin',
        terminatedByUser: authResult.user.id,
        targetUser: session.user.username
      }
    );

    return NextResponse.json({
      success: true,
      message: 'Session terminated successfully',
      data: {
        sessionId,
        username: session.user.username
      }
    });

  } catch (error) {
    console.error('Terminate session error:', error);
    return NextResponse.json(
      { error: 'Failed to terminate session' },
      { status: 500 }
    );
  }
}
