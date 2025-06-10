import { NextResponse } from 'next/server';
import dbConnection from '../../../../lib/db';
import ScanHistory from '../../../../models/ScanHistory';
import { AuthService } from '../../../../middleware/auth';

// GET - Fetch user's scan history
export async function GET(request) {
  try {
    await dbConnection.connectMongoDB();
    
    // Get token from cookies or authorization header
    const token = request.cookies.get('auth-token')?.value || 
                  request.headers.get('authorization')?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Create mock request object for AuthService
    const mockReq = {
      headers: {
        authorization: `Bearer ${token}`
      }
    };    // Verify authentication
    const authData = await AuthService.verifyAuth(mockReq);
    if (!authData || !authData.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = authData.user;

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page')) || 1;
    const limit = parseInt(searchParams.get('limit')) || 50;
    const ipRange = searchParams.get('ipRange');
    const tags = searchParams.get('tags')?.split(',').filter(Boolean);
    const favorites = searchParams.get('favorites') === 'true';
    const search = searchParams.get('search');
    
    const skip = (page - 1) * limit;
    
    // Build query
    let query = { userId: user._id };
    
    if (ipRange) {
      query.ipRange = ipRange;
    }
    
    if (tags && tags.length > 0) {
      query['settings.tags'] = { $in: tags };
    }
    
    if (favorites) {
      query['settings.isFavorite'] = true;
    }
    
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { ipRange: { $regex: search, $options: 'i' } },
        { 'settings.notes': { $regex: search, $options: 'i' } },
        { 'settings.tags': { $in: [new RegExp(search, 'i')] } }
      ];
    }
    
    // Execute query
    const [scanHistory, totalCount] = await Promise.all([
      ScanHistory.find(query)
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip(skip)
        .select('-scanData'), // Exclude large scan data from list view
      ScanHistory.countDocuments(query)
    ]);
    
    return NextResponse.json({
      scanHistory,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
        hasNextPage: page < Math.ceil(totalCount / limit),
        hasPrevPage: page > 1
      }
    });
    
  } catch (error) {
    console.error('Error fetching scan history:', error);
    return NextResponse.json(
      { error: 'Failed to fetch scan history' },
      { status: 500 }
    );
  }
}

// POST - Save new scan to history
export async function POST(request) {
  try {
    await dbConnection.connectMongoDB();
    
    // Get token from cookies or authorization header
    const token = request.cookies.get('auth-token')?.value || 
                  request.headers.get('authorization')?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Create mock request object for AuthService
    const mockReq = {
      headers: {
        authorization: `Bearer ${token}`
      }
    };    // Verify authentication
    const authData = await AuthService.verifyAuth(mockReq);
    if (!authData || !authData.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = authData.user;

    const body = await request.json();
    const { scanId, name, ipRange, deviceCount, scanData, metadata, settings } = body;
    
    if (!scanId || !ipRange || deviceCount === undefined || !scanData) {
      return NextResponse.json(
        { error: 'Missing required fields: scanId, ipRange, deviceCount, scanData' },
        { status: 400 }
      );
    }
    
    // Check for duplicate scan
    const existingScan = await ScanHistory.findOne({ 
      userId: user._id, 
      scanId 
    });
    
    if (existingScan) {
      return NextResponse.json(
        { error: 'Scan with this ID already exists' },
        { status: 409 }
      );
    }
    
    // Create new scan history entry
    const newScanHistory = new ScanHistory({
      userId: user._id,
      scanId,
      name: name || `Scan ${ipRange} - ${new Date().toLocaleDateString()}`,
      ipRange,
      deviceCount,
      scanData,
      metadata: {
        scanType: metadata?.scanType || 'ping',
        scanDuration: metadata?.scanDuration,
        osDetection: metadata?.osDetection || false,
        serviceDetection: metadata?.serviceDetection || false,
        ports: metadata?.ports || [],
        hasNetworkTopology: metadata?.hasNetworkTopology || false,
        vendor: metadata?.vendor,
        deviceTypes: metadata?.deviceTypes || []
      },
      settings: {
        isPrivate: settings?.isPrivate !== false, // Default to private
        isFavorite: settings?.isFavorite || false,
        tags: settings?.tags || [],
        notes: settings?.notes || ''
      }
    });
    
    const savedScan = await newScanHistory.save();
    
    // Return without the large scanData field
    const response = savedScan.toObject();
    delete response.scanData;
      return NextResponse.json(response, { status: 201 });
  } catch (error) {
    console.error('Error saving scan history:', error);
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    if (error.errors) {
      console.error('Validation errors:', error.errors);
    }
    
    // Handle MongoDB duplicate key error specifically
    if (error.code === 11000 || error.message.includes('E11000 duplicate key error')) {
      console.log('Duplicate scan detected at database level');
      return NextResponse.json(
        { error: 'Scan with this ID already exists' },
        { status: 409 }
      );
    }
    
    // Return more specific error information for other errors
    let errorMessage = 'Failed to save scan history';
    if (error.name === 'ValidationError') {
      errorMessage = `Validation error: ${Object.keys(error.errors).join(', ')}`;
    } else if (error.name === 'MongoError' || error.name === 'MongoServerError') {
      errorMessage = `Database error: ${error.message}`;
    }
    
    return NextResponse.json(
      { error: errorMessage, details: error.message },
      { status: 500 }
    );
  }
}

// DELETE - Bulk delete scan history entries
export async function DELETE(request) {
  try {
    await dbConnection.connectMongoDB();
    
    // Get token from cookies or authorization header
    const token = request.cookies.get('auth-token')?.value || 
                  request.headers.get('authorization')?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Create mock request object for AuthService
    const mockReq = {
      headers: {
        authorization: `Bearer ${token}`
      }
    };    // Verify authentication
    const authData = await AuthService.verifyAuth(mockReq);
    if (!authData || !authData.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = authData.user;

    const body = await request.json();
    const { scanIds } = body;
    
    if (!scanIds || !Array.isArray(scanIds) || scanIds.length === 0) {
      return NextResponse.json(
        { error: 'scanIds array is required' },
        { status: 400 }
      );
    }
    
    // Delete only user's own scans
    const result = await ScanHistory.deleteMany({
      userId: user._id,
      scanId: { $in: scanIds }
    });
    
    return NextResponse.json({ 
      deletedCount: result.deletedCount,
      message: `Deleted ${result.deletedCount} scan history entries`
    });
    
  } catch (error) {
    console.error('Error deleting scan history:', error);
    return NextResponse.json(
      { error: 'Failed to delete scan history' },
      { status: 500 }
    );
  }
}
