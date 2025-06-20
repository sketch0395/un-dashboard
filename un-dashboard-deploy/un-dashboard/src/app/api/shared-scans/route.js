import { NextResponse } from 'next/server';
import dbConnection from '../../../../lib/db';
import SharedScan from '../../../../models/SharedScan';
import jwt from 'jsonwebtoken';

// GET - Fetch all shared scans
export async function GET(request) {
  try {
    await dbConnection.connectMongoDB();
    
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page')) || 1;
    const limit = parseInt(searchParams.get('limit')) || 10;
    const search = searchParams.get('search') || '';
    const skip = (page - 1) * limit;
    
    // Build search query
    let query = {};
    if (search) {
      query = {
        $or: [
          { name: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } },
          { tags: { $in: [new RegExp(search, 'i')] } }
        ]
      };
    }
    
    // Only show public scans or user's own scans
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    let userId = null;
    
    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        userId = decoded.userId;
      } catch (err) {
        // Invalid token, continue as anonymous user
      }
    }
    
    // Add privacy filter
    if (userId) {
      query.$or = query.$or || [];
      query.$or.push(
        { 'sharing.visibility': 'public' },
        { ownerId: userId }
      );
    } else {
      query['sharing.visibility'] = 'public';
    }
    
    const scans = await SharedScan.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('ownerId', 'username email');
    
    const total = await SharedScan.countDocuments(query);
    
    return NextResponse.json({
      scans,
      pagination: {
        current: page,
        pages: Math.ceil(total / limit),
        total
      }
    });
  } catch (error) {
    console.error('Error fetching shared scans:', error);
    return NextResponse.json(
      { error: 'Failed to fetch shared scans' },
      { status: 500 }
    );
  }
}

// POST - Create a new shared scan
export async function POST(request) {
  try {
    await dbConnection.connectMongoDB();
    
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.userId;
    
    const body = await request.json();
    const { name, description, scanData, sharing = { visibility: 'public' }, tags = [], originalScanId } = body;
    
    if (!name || !scanData || !originalScanId) {
      return NextResponse.json(
        { error: 'Name, scan data, and original scan ID are required' },
        { status: 400 }
      );
    }
    
    const sharedScan = new SharedScan({
      name,
      description,
      scanData,
      originalScanId,
      ownerId: userId,
      sharing,
      tags,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    
    await sharedScan.save();
    
    return NextResponse.json(sharedScan, { status: 201 });
  } catch (error) {
    console.error('Error creating shared scan:', error);
    return NextResponse.json(
      { error: 'Failed to create shared scan' },
      { status: 500 }
    );
  }
}
