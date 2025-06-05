import { NextResponse } from 'next/server';
import { connectToDatabase } from '../../../../../../../lib/db';
import User from '../../../../../../../models/User';
import { AuthService } from '../../../../../../../middleware/auth';
import AuditLogger from '../../../../../../../services/auditLogger';

export async function DELETE(request, { params }) {
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

        // Check if user is already active (approved)
        if (user.isActive) {
            return NextResponse.json(
                { error: 'Cannot reject an already approved user' },
                { status: 400 }
            );
        }

        // Store user info for logging before deletion
        const userInfo = {
            id: user._id,
            username: user.username,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            createdAt: user.createdAt
        };

        // Delete the user (reject registration)
        await User.findByIdAndDelete(id);

        // Get request info for audit logging
        const { ipAddress, userAgent } = AuditLogger.getRequestInfo(request);

        // Log the rejection action
        await AuditLogger.logUserRejection(
            authResult.user.id,
            userInfo.id,
            ipAddress,
            userAgent,
            {
                username: userInfo.username,
                email: userInfo.email,
                firstName: userInfo.firstName,
                lastName: userInfo.lastName
            }
        );

        return NextResponse.json({
            success: true,
            message: 'User registration rejected and account deleted',
            data: {
                id: userInfo.id,
                username: userInfo.username,
                email: userInfo.email
            }
        });

    } catch (error) {
        console.error('Error rejecting user:', error);
        return NextResponse.json(
            { error: 'Failed to reject user' },
            { status: 500 }
        );
    }
}
