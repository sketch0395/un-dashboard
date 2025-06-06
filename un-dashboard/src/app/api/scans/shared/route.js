import dbConnection from '../../../../../lib/db';
import SharedScan from '../../../../../models/SharedScan';
import ScanCollaboration from '../../../../../models/ScanCollaboration';
import User from '../../../../../models/User';
import { AuthService } from '../../../../../middleware/auth';
import AuditLogger from '../../../../../services/auditLogger';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request) {
  try {
    await dbConnection.connectMongoDB();
    
    // Get token from cookies or authorization header
    const token = request.cookies.get('auth-token')?.value || 
                  request.headers.get('authorization')?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json({ success: false, message: 'Authentication required' }, { status: 401 });
    }

    // Create mock request object for AuthService
    const mockReq = {
      headers: {
        authorization: `Bearer ${token}`
      }
    };

    // Verify authentication
    const authData = await AuthService.verifyAuth(mockReq);
    
    return handleGetSharedScans(request, authData.user);
  } catch (error) {
    console.error('Shared scans API error:', error);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    await dbConnection.connectMongoDB();
    
    // Get token from cookies or authorization header
    const token = request.cookies.get('auth-token')?.value || 
                  request.headers.get('authorization')?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json({ success: false, message: 'Authentication required' }, { status: 401 });
    }

    // Create mock request object for AuthService
    const mockReq = {
      headers: {
        authorization: `Bearer ${token}`
      }
    };

    // Verify authentication
    const authData = await AuthService.verifyAuth(mockReq);
    
    return handleShareScan(request, authData.user);
  } catch (error) {
    console.error('Shared scans API error:', error);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}

async function handleGetSharedScans(request, user) {
  try {
    const { searchParams } = new URL(request.url);
    const page = searchParams.get('page') || '1';
    const limit = searchParams.get('limit') || '20';
    const category = searchParams.get('category');
    const tags = searchParams.get('tags');
    const search = searchParams.get('search');
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortOrder = searchParams.get('sortOrder') || 'desc';
    const visibility = searchParams.get('visibility');
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Build query based on user permissions
    let query = {};
    
    if (user.role === 'admin') {
      // Admins can see all scans
      if (visibility) {
        query['sharing.visibility'] = visibility;
      }
    } else {
      // Regular users can only see public scans and scans shared with them
      query.$or = [
        { 'sharing.visibility': 'public' },
        { 
          'sharing.visibility': 'restricted',
          $or: [
            { 'sharing.allowedUsers': user._id },
            { 'sharing.allowedRoles': user.role }
          ]
        },
        { ownerId: user._id } // User's own scans
      ];
    }
    
    // Add filters
    if (category) {
      query.category = category;
    }
    
    if (tags) {
      const tagArray = tags.split(',');
      query.tags = { $in: tagArray };
    }
    
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { tags: { $regex: search, $options: 'i' } }
      ];
    }
    
    // Sort options
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;
    
    const sharedScans = await SharedScan.find(query)
      .populate('ownerId', 'username email')
      .sort(sortOptions)
      .skip(skip)
      .limit(parseInt(limit))
      .select('-scanData'); // Don't include full scan data in list view
    
    const total = await SharedScan.countDocuments(query);
    
    return NextResponse.json({
      success: true,
      data: sharedScans,
      pagination: {
        current: parseInt(page),
        total: Math.ceil(total / parseInt(limit)),
        count: total
      }
    });
  } catch (error) {
    console.error('Error fetching shared scans:', error);
    return NextResponse.json({ success: false, message: 'Failed to fetch shared scans' }, { status: 500 });
  }
}

async function handleShareScan(request, user) {
  try {
    const body = await request.json();
    const {
      name,
      description,
      originalScanId,
      scanData,
      metadata,
      sharing,
      collaboration,
      tags,
      category,
      isTemplate
    } = body;
      // Validate required fields
    if (!name || !originalScanId || !scanData) {
      return NextResponse.json({ 
        success: false, 
        message: 'Name, original scan ID, and scan data are required' 
      }, { status: 400 });
    }
    
    // Normalize metadata scanType to match enum values
    const normalizedMetadata = { ...metadata };
    if (normalizedMetadata && normalizedMetadata.scanType) {
      // Map network scan type to valid enum value
      if (normalizedMetadata.scanType === 'network') {
        normalizedMetadata.scanType = 'full'; // Network scans are typically comprehensive
      }
      // Ensure scanType is valid, default to 'custom' if not recognized
      const validScanTypes = ['ping', 'os', 'full', 'custom'];
      if (!validScanTypes.includes(normalizedMetadata.scanType)) {
        normalizedMetadata.scanType = 'custom';
      }
    }
    
    // Create new shared scan
    const sharedScan = new SharedScan({
      name,
      description,
      originalScanId,
      ownerId: user._id,
      scanData,
      metadata: normalizedMetadata || {},
      sharing: {
        visibility: sharing?.visibility || 'private',
        allowedUsers: sharing?.allowedUsers || [],
        allowedRoles: sharing?.allowedRoles || []
      },
      collaboration: {
        allowComments: collaboration?.allowComments !== false,
        allowRating: collaboration?.allowRating !== false,
        allowModification: collaboration?.allowModification || false
      },
      tags: tags || [],
      category: category || 'other',
      isTemplate: isTemplate || false
    });
    
    await sharedScan.save();
      // Log the sharing action
    await AuditLogger.log({
      action: 'SCAN_SHARED',
      description: `User shared scan: ${name}`,
      userId: user._id,
      ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown',
      details: {
        sharedScanId: sharedScan._id,
        scanName: name,
        visibility: sharing?.visibility || 'private'
      }
    });
    
    // Record collaboration action
    const collaboration_record = new ScanCollaboration({
      sharedScanId: sharedScan._id,
      userId: user._id,
      action: 'share',
      data: { visibility: sharing?.visibility || 'private' },
      ipAddress: request.headers.get('x-forwarded-for') || request.ip,
      userAgent: request.headers.get('user-agent')
    });
    await collaboration_record.save();
    
    return NextResponse.json({
      success: true,
      message: 'Scan shared successfully',
      data: sharedScan
    }, { status: 201 });  } catch (error) {
    console.error('Error sharing scan:', error);
    return NextResponse.json({ success: false, message: 'Failed to share scan' }, { status: 500 });
  }
}
