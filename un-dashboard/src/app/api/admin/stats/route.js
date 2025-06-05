import { NextResponse } from 'next/server';
import { connectToDatabase } from '../../../../../lib/db';
import User from '../../../../../models/User';
import { AuthService } from '../../../../../middleware/auth';

export async function GET(request) {
  try {
    // Verify authentication and admin role
    const authResult = await AuthService.verifyAuth(request);
    if (!authResult.success) {
      return NextResponse.json({ message: authResult.message }, { status: 401 });
    }

    if (!authResult.user.isAdmin) {
      return NextResponse.json({ message: 'Access denied' }, { status: 403 });
    }

    await connectToDatabase();// Get statistics
    const totalUsers = await User.countDocuments();
    const activeUsers = await User.countDocuments({ isActive: true });
    const pendingUsers = await User.countDocuments({ isActive: false });
    const adminUsers = await User.countDocuments({ role: 'admin' });
    
    // Count recent logins (last 24 hours)
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentLogins = await User.countDocuments({
      lastLogin: { $gte: twentyFourHoursAgo }
    });

    return NextResponse.json({
      totalUsers,
      activeUsers,
      pendingUsers,
      adminUsers,
      recentLogins,
    });

  } catch (error) {
    console.error('Admin stats error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}
