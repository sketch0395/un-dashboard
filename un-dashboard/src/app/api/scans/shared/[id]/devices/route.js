import dbConnection from '../../../../../../../lib/db';
import SharedScan from '../../../../../../../models/SharedScan';
import ScanCollaboration from '../../../../../../../models/ScanCollaboration';
import { AuthService } from '../../../../../../../middleware/auth';
import { NextResponse } from 'next/server';

// API endpoint for collaborative device updates
export async function PUT(request, { params }) {
  try {
    console.log('🔄 Device update API called');
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
      const user = authResult.user;    const { id } = await params;
    const { deviceId, deviceChanges } = await request.json();
    
    console.log('📝 Device update request details:');
    console.log('   - Scan ID:', id);
    console.log('   - Device ID:', deviceId);
    console.log('   - Changes:', deviceChanges);
    
    if (!deviceId || !deviceChanges) {
      return NextResponse.json({ 
        success: false, 
        message: 'Device ID and changes are required' 
      }, { status: 400 });
    }
    
    // Find the shared scan
    const sharedScan = await SharedScan.findById(id);
    
    if (!sharedScan) {
      return NextResponse.json({ success: false, message: 'Shared scan not found' }, { status: 404 });
    }
    
    // Check if collaboration is allowed
    if (!sharedScan.collaboration?.allowModification) {
      return NextResponse.json({ 
        success: false, 
        message: 'Collaboration not allowed for this scan' 
      }, { status: 403 });
    }
    
    // Check if user can modify (owner, admin, or collaboration is open)
    const canModify = sharedScan.ownerId.toString() === user._id.toString() || 
                     user.role === 'admin' || 
                     sharedScan.collaboration.allowModification;
    
    if (!canModify) {
      return NextResponse.json({ success: false, message: 'Permission denied' }, { status: 403 });
    }
      // Update the device in the scan data
    let updated = false;
    let deviceFound = false;
    
    console.log('🔍 Searching for device in scan data...');
    console.log('   Looking for device with ID:', deviceId);
    console.log('   Available vendors:', Object.keys(sharedScan.scanData?.devices || {}));
    
    if (sharedScan.scanData && sharedScan.scanData.devices) {
      // Find and update the device across all vendor categories
      Object.keys(sharedScan.scanData.devices).forEach(vendor => {
        if (Array.isArray(sharedScan.scanData.devices[vendor])) {
          console.log(`   Checking vendor "${vendor}" with ${sharedScan.scanData.devices[vendor].length} devices`);
          
          const deviceIndex = sharedScan.scanData.devices[vendor].findIndex(
            device => {
              console.log(`     - Device: ${device.ip || device.id} (looking for ${deviceId})`);
              return device.ip === deviceId || device.id === deviceId;
            }
          );
          
          if (deviceIndex !== -1) {
            deviceFound = true;
            console.log(`   📍 Found device at vendor "${vendor}", index ${deviceIndex}`);
            console.log('   🔄 Before update:', sharedScan.scanData.devices[vendor][deviceIndex]);
            
            // Merge the changes into the existing device
            sharedScan.scanData.devices[vendor][deviceIndex] = {
              ...sharedScan.scanData.devices[vendor][deviceIndex],
              ...deviceChanges
            };
            
            console.log('   ✅ After update:', sharedScan.scanData.devices[vendor][deviceIndex]);
            updated = true;
          }
        }
      });
    }
      console.log('🎯 Device search results:');
    console.log('   Device found:', deviceFound);
    console.log('   Device updated:', updated);
    
    if (!updated) {
      return NextResponse.json({ 
        success: false, 
        message: 'Device not found in scan data' 
      }, { status: 404 });
    }

    // Verify the device was actually updated in memory
    console.log('🔍 Verifying device update in memory before save...');
    for (const vendor of Object.keys(sharedScan.scanData?.devices || {})) {
      const devices = sharedScan.scanData.devices[vendor];
      if (Array.isArray(devices)) {
        const device = devices.find(d => d.ip === deviceId);
        if (device) {
          console.log('   ✅ Device found in memory:', {
            ip: device.ip,
            hostname: device.hostname,
            testProperty: device.testProperty
          });
          break;
        }
      }    }// Save the updated scan
    console.log('💾 Attempting to save updated scan to database...');
    sharedScan.updatedAt = new Date();
    
    // Mark the nested devices array as modified so Mongoose saves the changes
    sharedScan.markModified('scanData.devices');
    console.log('🔄 Marked scanData.devices as modified for Mongoose');
    
    try {
      const saveResult = await sharedScan.save();
      console.log('✅ Scan saved successfully:', saveResult._id);
      console.log('✅ Device 10.5.1.1 updated in shared scan 6848c12b80389e07c63b0863 - changes saved to database');
    } catch (saveError) {
      console.error('❌ Error saving scan:', saveError);
      throw saveError;
    }
    
    // Log the collaboration activity
    await ScanCollaboration.create({
      sharedScanId: id,
      userId: user._id,
      action: 'modify',
      data: {
        deviceId,
        changes: deviceChanges,
        timestamp: new Date()
      },
      ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown'
    });
    
    console.log(`✅ Device ${deviceId} updated in shared scan ${id} by user ${user.username}`);
    
    return NextResponse.json({
      success: true,
      message: 'Device updated successfully',
      deviceId,
      updatedAt: sharedScan.updatedAt
    });
    
  } catch (error) {
    console.error('Error updating device in shared scan:', error);
    return NextResponse.json({ 
      success: false, 
      message: 'Failed to update device' 
    }, { status: 500 });
  }
}
