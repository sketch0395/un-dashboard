import { NextResponse } from 'next/server';
import { connectToDatabase } from '../../../../../../lib/db';
import User from '../../../../../../models/User';
import { AuthService } from '../../../../../../middleware/auth';

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

        // Get query parameters for pagination and search
        const { searchParams } = new URL(request.url);
        const page = parseInt(searchParams.get('page')) || 1;
        const limit = parseInt(searchParams.get('limit')) || 10;
        const search = searchParams.get('search') || '';
        const sortBy = searchParams.get('sortBy') || 'createdAt';
        const sortOrder = searchParams.get('sortOrder') || 'desc';

        // Build search query
        let query = { isActive: false };
        if (search) {
            query.$or = [
                { username: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } },
                { firstName: { $regex: search, $options: 'i' } },
                { lastName: { $regex: search, $options: 'i' } }
            ];
        }

        // Calculate skip value for pagination
        const skip = (page - 1) * limit;

        // Get pending users with pagination
        const users = await User.find(query)
            .select('-password -__v')
            .sort({ [sortBy]: sortOrder === 'desc' ? -1 : 1 })
            .skip(skip)
            .limit(limit)
            .lean();

        // Get total count for pagination
        const totalCount = await User.countDocuments(query);
        const totalPages = Math.ceil(totalCount / limit);

        return NextResponse.json({
            success: true,
            data: {
                users,
                pagination: {
                    currentPage: page,
                    totalPages,
                    totalCount,
                    hasNextPage: page < totalPages,
                    hasPrevPage: page > 1
                }
            }
        });

    } catch (error) {
        console.error('Error fetching pending users:', error);
        return NextResponse.json(
            { error: 'Failed to fetch pending users' },
            { status: 500 }
        );
    }
}
