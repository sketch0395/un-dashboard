import { NextResponse } from 'next/server';
import dbConnection from '../../../../../../lib/db';
import User from '../../../../../../models/User';
import { AuthService } from '../../../../../../middleware/auth';

export async function POST(request) {
    try {
        // Verify admin authentication
        const authResult = await AuthService.verifyAuth(request);
        if (!authResult.success) {
            return NextResponse.json(
                { error: 'Authentication required' },
                { status: 401 }
            );
        }

        // Check if user is admin
        if (!authResult.user.isAdmin) {
            return NextResponse.json(
                { error: 'Admin access required' },
                { status: 403 }
            );
        }

        const body = await request.json();
        const { userIds } = body;

        if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
            return NextResponse.json(
                { error: 'User IDs array is required' },
                { status: 400 }
            );
        }

        await dbConnection.connectMongoDB();

        // Find all users to be rejected
        const users = await User.find({
            _id: { $in: userIds },
            isActive: false
        });

        if (users.length === 0) {
            return NextResponse.json(
                { error: 'No pending users found with provided IDs' },
                { status: 404 }
            );
        }

        // Store user info for logging before deletion
        const rejectedUsers = users.map(user => ({
            id: user._id,
            username: user.username,
            email: user.email,
            createdAt: user.createdAt
        }));

        // Bulk delete users (reject registrations)
        await User.deleteMany({
            _id: { $in: userIds },
            isActive: false
        });

        // Log the bulk rejection action
        console.log(`Bulk rejection: ${rejectedUsers.length} user registrations rejected and deleted by admin ${authResult.user.username}`);
        console.log('Rejected users:', rejectedUsers.map(u => `${u.username} (${u.email})`).join(', '));

        return NextResponse.json({
            success: true,
            message: `${rejectedUsers.length} user registrations rejected and accounts deleted`,
            data: {
                rejectedUsers: rejectedUsers.map(u => ({
                    id: u.id,
                    username: u.username,
                    email: u.email
                })),
                totalRejected: rejectedUsers.length,
                totalRequested: userIds.length
            }
        });

    } catch (error) {
        console.error('Error bulk rejecting users:', error);
        return NextResponse.json(
            { error: 'Failed to reject users' },
            { status: 500 }
        );
    }
}
