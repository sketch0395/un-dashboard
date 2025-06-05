import { NextResponse } from 'next/server';
import { connectToDatabase } from '../../../../../../lib/db';
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

        await connectToDatabase();

        // Find all users to be approved
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

        // Bulk approve users
        const approvedUsers = [];
        const now = new Date();
        
        for (const user of users) {
            user.isActive = true;
            user.approvedAt = now;
            user.approvedBy = authResult.user.id;
            await user.save();
            
            approvedUsers.push({
                id: user._id,
                username: user.username,
                email: user.email,
                approvedAt: user.approvedAt
            });
        }

        // Log the bulk approval action
        console.log(`Bulk approval: ${approvedUsers.length} users approved by admin ${authResult.user.username}`);
        console.log('Approved users:', approvedUsers.map(u => `${u.username} (${u.email})`).join(', '));

        return NextResponse.json({
            success: true,
            message: `${approvedUsers.length} users approved successfully`,
            data: {
                approvedUsers,
                totalApproved: approvedUsers.length,
                totalRequested: userIds.length
            }
        });

    } catch (error) {
        console.error('Error bulk approving users:', error);
        return NextResponse.json(
            { error: 'Failed to approve users' },
            { status: 500 }
        );
    }
}
