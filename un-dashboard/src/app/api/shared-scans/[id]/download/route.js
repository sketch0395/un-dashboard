import { NextResponse } from 'next/server';
import dbConnection from '../../../../../../lib/db';
import SharedScan from '../../../../../../models/SharedScan';
import jwt from 'jsonwebtoken';

export async function GET(request, { params }) {
  try {
    await dbConnection.connectMongoDB();
    
    const { id } = params;
    const scan = await SharedScan.findById(id);
    
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
    
    // Increment download count
    await SharedScan.findByIdAndUpdate(id, { $inc: { 'stats.downloadCount': 1 } });
    
    // Prepare the scan data for download
    const downloadData = {
      name: scan.name,
      description: scan.description,
      scanData: scan.scanData,
      metadata: {
        createdAt: scan.createdAt,
        tags: scan.tags,
        ...(scan.metadata || {})
      }
    };
    
    // Return as JSON download
    const response = new NextResponse(JSON.stringify(downloadData, null, 2));
    response.headers.set('Content-Type', 'application/json');
    response.headers.set('Content-Disposition', `attachment; filename="${scan.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_scan.json"`);
    
    return response;
  } catch (error) {
    console.error('Error downloading shared scan:', error);
    return NextResponse.json(
      { error: 'Failed to download shared scan' },
      { status: 500 }
    );
  }
}
