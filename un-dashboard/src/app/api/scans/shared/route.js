import { connectDB } from '../../../../lib/db';
import SharedScan from '../../../../models/SharedScan';
import ScanCollaboration from '../../../../models/ScanCollaboration';
import User from '../../../../models/User';
import { authMiddleware } from '../../../../middleware/auth';
import { auditLogger } from '../../../../services/auditLogger';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request) {
  try {
    await connectDB();
    
    // Apply authentication middleware
    const authResult = await authMiddleware(request);
    if (!authResult.success) {
      return NextResponse.json({ success: false, message: 'Authentication required' }, { status: 401 });
    }
    
    const user = authResult.user;
    return handleGetSharedScans(request, user);
  } catch (error) {
    console.error('Shared scans API error:', error);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    await connectDB();
    
    // Apply authentication middleware
    const authResult = await authMiddleware(request);
    if (!authResult.success) {
      return NextResponse.json({ success: false, message: 'Authentication required' }, { status: 401 });
    }
    
    const user = authResult.user;
    return handleShareScan(request, user);
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
    
    // Create new shared scan
    const sharedScan = new SharedScan({
      name,
      description,
      originalScanId,
      ownerId: user._id,
      scanData,
      metadata: metadata || {},
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
    await auditLogger.log(user._id, 'SCAN_SHARED', {
      sharedScanId: sharedScan._id,
      scanName: name,
      visibility: sharing?.visibility || 'private'
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
    }, { status: 201 });
  } catch (error) {
    console.error('Error sharing scan:', error);
    return NextResponse.json({ success: false, message: 'Failed to share scan' }, { status: 500 });
  }
}
