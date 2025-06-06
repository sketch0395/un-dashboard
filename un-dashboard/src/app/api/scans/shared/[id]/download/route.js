import dbConnection from '../../../../../../../lib/db';
import SharedScan from '../../../../../../../models/SharedScan';
import ScanCollaboration from '../../../../../../../models/ScanCollaboration';
import { AuthService } from '../../../../../../../middleware/auth';
import { NextResponse } from 'next/server';

export async function POST(request, { params }) {
  try {
    await dbConnection.connectMongoDB();
    
    // Extract token from cookies or headers
    const token = request.cookies.get('auth-token')?.value || 
                 request.headers.get('authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return NextResponse.json({ success: false, message: 'Authentication required' }, { status: 401 });
    }
    
    // Create mock request object for AuthService
    const mockReq = {
      cookies: { get: (name) => name === 'auth-token' ? { value: token } : null },
      headers: { get: (name) => request.headers.get(name) }
    };
    
    // Apply authentication
    const authResult = await AuthService.verifyAuth(mockReq);
    if (!authResult.success) {
      return NextResponse.json({ success: false, message: 'Authentication required' }, { status: 401 });
    }
    
    const user = authResult.user;
    const { id } = params;
    
    // Find the shared scan
    const sharedScan = await SharedScan.findById(id).populate('ownerId', 'username email');
    
    if (!sharedScan) {
      return NextResponse.json({ success: false, message: 'Shared scan not found' }, { status: 404 });
    }
    
    // Check access permissions
    const hasAccess = checkScanAccess(sharedScan, user);
    if (!hasAccess) {
      return NextResponse.json({ success: false, message: 'Access denied' }, { status: 403 });
    }
    
    // Increment download count
    await SharedScan.findByIdAndUpdate(id, { $inc: { 'stats.downloadCount': 1 } });
    
    // Record download action
    const collaboration = new ScanCollaboration({
      sharedScanId: id,
      userId: user._id,
      action: 'download',
      ipAddress: request.headers.get('x-forwarded-for') || request.ip,
      userAgent: request.headers.get('user-agent')
    });
    await collaboration.save();
    
    // Prepare download data
    const downloadData = {
      metadata: {
        name: sharedScan.name,
        description: sharedScan.description,
        sharedBy: sharedScan.ownerId.username,
        originalScanId: sharedScan.originalScanId,
        downloadedAt: new Date().toISOString(),
        downloadedBy: user.username
      },
      scanData: sharedScan.scanData,
      scanMetadata: sharedScan.metadata,
      tags: sharedScan.tags,
      category: sharedScan.category
    };
    
    return NextResponse.json({
      success: true,
      message: 'Scan downloaded successfully',
      data: downloadData
    });
  } catch (error) {
    console.error('Error downloading shared scan:', error);
    return NextResponse.json({ success: false, message: 'Failed to download shared scan' }, { status: 500 });
  }
}

function checkScanAccess(sharedScan, user) {
  // Admin can access all scans
  if (user.role === 'admin') {
    return true;
  }
  
  // Owner can access their own scans
  if (sharedScan.ownerId._id.toString() === user._id.toString()) {
    return true;
  }
  
  // Check visibility
  if (sharedScan.sharing.visibility === 'public') {
    return true;
  }
  
  if (sharedScan.sharing.visibility === 'restricted') {
    // Check if user is in allowed users list
    if (sharedScan.sharing.allowedUsers.some(userId => userId.toString() === user._id.toString())) {
      return true;
    }
    
    // Check if user role is in allowed roles
    if (sharedScan.sharing.allowedRoles.includes(user.role)) {
      return true;
    }
  }
  
  return false;
}
