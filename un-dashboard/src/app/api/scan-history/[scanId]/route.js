import { NextResponse } from 'next/server';
import dbConnection from '../../../../../lib/db';
import ScanHistory from '../../../../../models/ScanHistory';
import { AuthService } from '../../../../../middleware/auth';

// GET - Fetch single scan with full data
export async function GET(request, { params }) {
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
    };

    // Verify authentication
    const authData = await AuthService.verifyAuth(mockReq);
    if (!authData || !authData.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = authData.user;

    const { scanId } = params;
    
    if (!scanId) {
      return NextResponse.json({ error: 'Scan ID is required' }, { status: 400 });
    }
    
    // Find scan that belongs to the user
    const scan = await ScanHistory.findOne({ 
      userId: user._id, 
      scanId: scanId 
    });
    
    if (!scan) {
      return NextResponse.json({ error: 'Scan not found' }, { status: 404 });
    }
    
    return NextResponse.json(scan);
    
  } catch (error) {
    console.error('Error fetching scan details:', error);
    return NextResponse.json(
      { error: 'Failed to fetch scan details' },
      { status: 500 }
    );
  }
}

// PUT - Update scan details
export async function PUT(request, { params }) {
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
    };

    // Verify authentication
    const authData = await AuthService.verifyAuth(mockReq);
    if (!authData || !authData.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = authData.user;
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { scanId } = params;
    const body = await request.json();
    
    if (!scanId) {
      return NextResponse.json({ error: 'Scan ID is required' }, { status: 400 });
    }
    
    // Build update object (only allow certain fields to be updated)
    const allowedUpdates = {};
    
    if (body.name !== undefined) allowedUpdates.name = body.name;
    if (body.settings !== undefined) {
      // Merge settings instead of replacing
      const scan = await ScanHistory.findOne({ userId: user._id, scanId });
      if (scan) {
        allowedUpdates.settings = { ...scan.settings, ...body.settings };
      }
    }
    if (body.scanData !== undefined) allowedUpdates.scanData = body.scanData;
    
    // Add updated timestamp
    allowedUpdates.updatedAt = new Date();
    
    // Update scan that belongs to the user
    const updatedScan = await ScanHistory.findOneAndUpdate(
      { userId: user._id, scanId: scanId },
      { $set: allowedUpdates },
      { new: true, runValidators: true }
    );
    
    if (!updatedScan) {
      return NextResponse.json({ error: 'Scan not found' }, { status: 404 });
    }
    
    // Return without large scanData field for response
    const response = updatedScan.toObject();
    if (!body.includeData) {
      delete response.scanData;
    }
    
    return NextResponse.json(response);
    
  } catch (error) {
    console.error('Error updating scan:', error);
    return NextResponse.json(
      { error: 'Failed to update scan' },
      { status: 500 }
    );
  }
}

// DELETE - Delete single scan
export async function DELETE(request, { params }) {
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
    };

    // Verify authentication
    const authData = await AuthService.verifyAuth(mockReq);
    if (!authData || !authData.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = authData.user;

    const { scanId } = params;
    
    if (!scanId) {
      return NextResponse.json({ error: 'Scan ID is required' }, { status: 400 });
    }
    
    // Delete scan that belongs to the user
    const deletedScan = await ScanHistory.findOneAndDelete({ 
      userId: user._id, 
      scanId: scanId 
    });
    
    if (!deletedScan) {
      return NextResponse.json({ error: 'Scan not found' }, { status: 404 });
    }
    
    return NextResponse.json({ 
      message: 'Scan deleted successfully',
      deletedScan: {
        _id: deletedScan._id,
        scanId: deletedScan.scanId,
        name: deletedScan.name
      }
    });
    
  } catch (error) {
    console.error('Error deleting scan:', error);
    return NextResponse.json(
      { error: 'Failed to delete scan' },
      { status: 500 }
    );
  }
}
