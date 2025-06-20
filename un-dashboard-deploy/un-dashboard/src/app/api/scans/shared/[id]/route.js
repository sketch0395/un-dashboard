import dbConnection from '../../../../../../lib/db';
import SharedScan from '../../../../../../models/SharedScan';
import ScanCollaboration from '../../../../../../models/ScanCollaboration';
import { AuthService } from '../../../../../../middleware/auth';
import AuditLogger from '../../../../../../services/auditLogger';
import { NextResponse } from 'next/server';

// Access control function
function checkScanAccess(sharedScan, user) {
  // Admin can access all scans
  if (user.role === 'admin') {
    return true;
  }
  
  // Owner can access their own scans
  if (sharedScan.ownerId.toString() === user._id.toString()) {
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

export async function GET(request, { params }) {
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
    if (!authResult || !authResult.user) {
      return NextResponse.json({ success: false, message: 'Authentication required' }, { status: 401 });
    }
    
    const user = authResult.user;
    const { id } = await params;
    
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
    
    // Increment view count
    await SharedScan.findByIdAndUpdate(id, { $inc: { 'stats.viewCount': 1 } });
    
    // Record view action
    const collaboration = new ScanCollaboration({
      sharedScanId: id,
      userId: user._id,
      action: 'view',
      ipAddress: request.headers.get('x-forwarded-for') || request.ip,
      userAgent: request.headers.get('user-agent')
    });
    await collaboration.save();
    
    return NextResponse.json({
      success: true,
      data: sharedScan
    });
  } catch (error) {
    console.error('Error fetching shared scan:', error);
    return NextResponse.json({ success: false, message: 'Failed to fetch shared scan' }, { status: 500 });
  }
}

export async function PUT(request, { params }) {
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
    if (!authResult || !authResult.user) {
      return NextResponse.json({ success: false, message: 'Authentication required' }, { status: 401 });
    }
      const user = authResult.user;
    const { id } = await params;
    const body = await request.json();
    
    // Find the shared scan
    const sharedScan = await SharedScan.findById(id);
    
    if (!sharedScan) {
      return NextResponse.json({ success: false, message: 'Shared scan not found' }, { status: 404 });
    }
    
    // Check if user can modify (owner or admin)
    if (sharedScan.ownerId.toString() !== user._id.toString() && user.role !== 'admin') {
      return NextResponse.json({ success: false, message: 'Permission denied' }, { status: 403 });
    }
      // Update allowed fields
    const updateFields = {};
    if (body.name) updateFields.name = body.name;
    if (body.description !== undefined) updateFields.description = body.description;
    if (body.sharing) updateFields.sharing = { ...sharedScan.sharing, ...body.sharing };
    if (body.collaboration) updateFields.collaboration = { ...sharedScan.collaboration, ...body.collaboration };
    if (body.tags) updateFields.tags = body.tags;
    if (body.category) updateFields.category = body.category;
    if (body.isTemplate !== undefined) updateFields.isTemplate = body.isTemplate;
    if (body.scanData) updateFields.scanData = body.scanData;
    
    const updatedScan = await SharedScan.findByIdAndUpdate(id, updateFields, { new: true });
      // Log the update
    await AuditLogger.log({
      action: 'SCAN_UPDATED',
      description: `User updated shared scan: ${updatedScan.name}`,
      userId: user._id,
      ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown',
      details: {
        sharedScanId: id,
        scanName: updatedScan.name,
        changes: Object.keys(updateFields)
      }
    });
    
    // Record modification action
    const collaboration = new ScanCollaboration({
      sharedScanId: id,
      userId: user._id,
      action: 'modify',
      data: { changes: Object.keys(updateFields) },
      ipAddress: request.headers.get('x-forwarded-for') || request.ip,
      userAgent: request.headers.get('user-agent')
    });
    await collaboration.save();
    
    return NextResponse.json({
      success: true,
      message: 'Shared scan updated successfully',
      data: updatedScan
    });
  } catch (error) {
    console.error('Error updating shared scan:', error);
    return NextResponse.json({ success: false, message: 'Failed to update shared scan' }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
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
    if (!authResult || !authResult.user) {
      return NextResponse.json({ success: false, message: 'Authentication required' }, { status: 401 });
    }
    
    const user = authResult.user;
    const { id } = params;
    
    // Find the shared scan
    const sharedScan = await SharedScan.findById(id);
    
    if (!sharedScan) {
      return NextResponse.json({ success: false, message: 'Shared scan not found' }, { status: 404 });
    }
    
    // Check if user can delete (owner or admin)
    if (sharedScan.ownerId.toString() !== user._id.toString() && user.role !== 'admin') {
      return NextResponse.json({ success: false, message: 'Permission denied' }, { status: 403 });
    }
    
    // Delete the shared scan
    await SharedScan.findByIdAndDelete(id);
    
    // Delete associated collaboration records
    await ScanCollaboration.deleteMany({ sharedScanId: id });
      // Log the deletion
    await AuditLogger.log({
      action: 'SCAN_DELETED',
      description: `User deleted shared scan: ${sharedScan.name}`,
      userId: user._id,
      ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown',
      details: {
        sharedScanId: id,
        scanName: sharedScan.name
      }
    });
    
    return NextResponse.json({
      success: true,
      message: 'Shared scan deleted successfully'
    });  } catch (error) {
    console.error('Error deleting shared scan:', error);
    return NextResponse.json({ success: false, message: 'Failed to delete shared scan' }, { status: 500 });
  }
}
