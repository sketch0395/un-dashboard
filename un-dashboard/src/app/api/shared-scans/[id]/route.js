import { NextResponse } from 'next/server';
import dbConnection from '../../../../../lib/db';
import SharedScan from '../../../../../models/SharedScan';
import jwt from 'jsonwebtoken';

// GET - Fetch a specific shared scan
export async function GET(request, { params }) {
  try {
    await dbConnection.connectMongoDB();
    
    const { id } = params;
    const scan = await SharedScan.findById(id).populate('ownerId', 'username email');
    
    if (!scan) {
      return NextResponse.json({ error: 'Shared scan not found' }, { status: 404 });
    }
    
    // Check privacy settings
    if (scan.sharing && scan.sharing.visibility === 'private') {
      const token = request.headers.get('authorization')?.replace('Bearer ', '');
      if (!token) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      if (scan.ownerId.toString() !== decoded.userId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }
    
    // Increment view count
    await SharedScan.findByIdAndUpdate(id, { $inc: { 'stats.viewCount': 1 } });
    
    return NextResponse.json(scan);
  } catch (error) {
    console.error('Error fetching shared scan:', error);
    return NextResponse.json(
      { error: 'Failed to fetch shared scan' },
      { status: 500 }
    );
  }
}

// PUT - Update a shared scan
export async function PUT(request, { params }) {
  try {
    await dbConnection.connectMongoDB();
    
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const { id } = params;
    
    const scan = await SharedScan.findById(id);
    if (!scan) {
      return NextResponse.json({ error: 'Shared scan not found' }, { status: 404 });
    }
    
    // Only owner can update
    if (scan.ownerId.toString() !== decoded.userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    const body = await request.json();
    const { name, description, visibility, tags } = body;
    
    const updates = {
      ...(name && { name }),
      ...(description && { description }),
      ...(visibility && { 'sharing.visibility': visibility }),
      ...(tags && { tags }),
      updatedAt: new Date()
    };
    
    const updatedScan = await SharedScan.findByIdAndUpdate(id, updates, { new: true });
    
    return NextResponse.json(updatedScan);
  } catch (error) {
    console.error('Error updating shared scan:', error);
    return NextResponse.json(
      { error: 'Failed to update shared scan' },
      { status: 500 }
    );
  }
}

// DELETE - Delete a shared scan
export async function DELETE(request, { params }) {
  try {
    await dbConnection.connectMongoDB();
    
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const { id } = params;
    
    const scan = await SharedScan.findById(id);
    if (!scan) {
      return NextResponse.json({ error: 'Shared scan not found' }, { status: 404 });
    }
    
    // Only owner can delete
    if (scan.ownerId.toString() !== decoded.userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    await SharedScan.findByIdAndDelete(id);
    
    return NextResponse.json({ message: 'Shared scan deleted successfully' });
  } catch (error) {
    console.error('Error deleting shared scan:', error);
    return NextResponse.json(
      { error: 'Failed to delete shared scan' },
      { status: 500 }
    );
  }
}
