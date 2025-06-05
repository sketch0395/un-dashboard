import { NextResponse } from 'next/server';
import { connectToDatabase } from '../../../../../../../lib/db';
import User from '../../../../../../../models/User';
import { AuthService } from '../../../../../../../middleware/auth';
import AuditLogger from '../../../../../../../services/auditLogger';

export async function POST(request, { params }) {
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

        const { id } = params;
        
        if (!id) {
            return NextResponse.json(
                { error: 'User ID is required' },
                { status: 400 }
            );
        }

        await connectToDatabase();

        // Find the user
        const user = await User.findById(id);
        if (!user) {
            return NextResponse.json(
                { error: 'User not found' },
                { status: 404 }
            );
        }

        // Check if user is already active
        if (user.isActive) {
            return NextResponse.json(
                { error: 'User is already approved' },
                { status: 400 }
            );
        }

        // Approve the user
        user.isActive = true;
        user.approvedAt = new Date();
        user.approvedBy = authResult.user.id;
        await user.save();

        // Get request info for audit logging
        const { ipAddress, userAgent } = AuditLogger.getRequestInfo(request);

        // Log the approval action
        await AuditLogger.logUserApproval(
            authResult.user.id,
            user._id,
            ipAddress,
            userAgent,
            {
                username: user.username,
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName
            }
        );

        return NextResponse.json({
            success: true,
            message: 'User approved successfully',
            data: {
                id: user._id,
                username: user.username,
                email: user.email,
                isActive: user.isActive,
                approvedAt: user.approvedAt
            }
        });

    } catch (error) {
        console.error('Error approving user:', error);
        return NextResponse.json(
            { error: 'Failed to approve user' },
            { status: 500 }
        );
    }
}
