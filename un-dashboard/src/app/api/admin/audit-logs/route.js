import { NextResponse } from 'next/server';
import { connectToDatabase } from '../../../../../lib/db';
import AuditLog from '../../../../../models/AuditLog';
import { AuthService } from '../../../../../middleware/auth';

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

        // Check if user is admin
        if (!authResult.user.isAdmin) {
            return NextResponse.json(
                { error: 'Admin access required' },
                { status: 403 }
            );
        }

        await connectToDatabase();

        // Get query parameters
        const { searchParams } = new URL(request.url);
        const page = parseInt(searchParams.get('page')) || 1;
        const limit = Math.min(parseInt(searchParams.get('limit')) || 50, 100); // Max 100 per page
        const search = searchParams.get('search') || '';
        const dateFrom = searchParams.get('dateFrom');
        const dateTo = searchParams.get('dateTo');
        const action = searchParams.get('action');
        const level = searchParams.get('level');
        const userId = searchParams.get('userId');
        const sortBy = searchParams.get('sortBy') || 'timestamp';
        const sortOrder = searchParams.get('sortOrder') || 'desc';

        // Build query
        let query = {};

        // Text search across multiple fields
        if (search) {
            query.$or = [
                { action: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } },
                { 'user.username': { $regex: search, $options: 'i' } },
                { 'user.email': { $regex: search, $options: 'i' } },
                { ipAddress: { $regex: search, $options: 'i' } }
            ];
        }

        // Date range filter
        if (dateFrom || dateTo) {
            query.timestamp = {};
            if (dateFrom) {
                query.timestamp.$gte = new Date(dateFrom);
            }
            if (dateTo) {
                // Add one day to include the entire end date
                const endDate = new Date(dateTo);
                endDate.setDate(endDate.getDate() + 1);
                query.timestamp.$lt = endDate;
            }
        }

        // Action filter
        if (action) {
            query.action = action;
        }

        // Level filter
        if (level) {
            query.level = level;
        }

        // User filter
        if (userId) {
            query.userId = userId;
        }

        // Calculate skip value for pagination
        const skip = (page - 1) * limit;

        // Get audit logs with pagination
        const logs = await AuditLog.find(query)
            .populate('userId', 'username email firstName lastName')
            .sort({ [sortBy]: sortOrder === 'desc' ? -1 : 1 })
            .skip(skip)
            .limit(limit)
            .lean();

        // Transform the data to include user info at the top level
        const transformedLogs = logs.map(log => ({
            ...log,
            user: log.userId ? {
                id: log.userId._id,
                username: log.userId.username,
                email: log.userId.email,
                firstName: log.userId.firstName,
                lastName: log.userId.lastName
            } : null
        }));

        // Get total count for pagination
        const totalCount = await AuditLog.countDocuments(query);
        const totalPages = Math.ceil(totalCount / limit);

        return NextResponse.json({
            success: true,
            data: {
                logs: transformedLogs,
                pagination: {
                    currentPage: page,
                    totalPages,
                    totalCount,
                    limit,
                    hasNextPage: page < totalPages,
                    hasPrevPage: page > 1
                }
            }
        });

    } catch (error) {
        console.error('Error fetching audit logs:', error);
        return NextResponse.json(
            { error: 'Failed to fetch audit logs' },
            { status: 500 }
        );
    }
}