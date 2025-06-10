import mongoose from 'mongoose';
import fetch from 'node-fetch';

// Load environment variables
import dotenv from 'dotenv';
dotenv.config();

// MongoDB Schema
const scanHistorySchema = new mongoose.Schema({
  scanId: { type: String, required: true, unique: true },
  userId: { type: mongoose.Schema.Types.ObjectId, required: true },
  scanData: { type: Object, required: true },
  deviceCount: { type: Number, required: true },
  scanName: { type: String, required: true },
  ipRange: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

const ScanHistory = mongoose.model('ScanHistory', scanHistorySchema);

console.log('🔍 DETAILED SCAN EXAMINATION');
console.log('============================');

async function examineScans() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    
    // Get the most recent scan
    const scan = await ScanHistory.findOne().sort({ createdAt: -1 });
    
    if (!scan) {
      console.log('❌ No scans found');
      return;
    }
    
    console.log(`\n📊 EXAMINING SCAN: ${scan.scanName}`);
    console.log(`   ID: ${scan.scanId}`);
    console.log(`   Created: ${scan.createdAt}`);
    console.log(`   Device Count: ${scan.deviceCount}`);
    console.log(`   IP Range: ${scan.ipRange}`);
    
    console.log('\n🔍 DETAILED SCAN DATA STRUCTURE:');
    console.log('================================');
    
    if (scan.scanData) {
      console.log(`📊 scanData type: ${typeof scan.scanData}`);
      console.log(`🔑 scanData keys: [${Object.keys(scan.scanData).join(', ')}]`);
      
      if (scan.scanData.devices) {
        console.log('\n📱 DEVICES STRUCTURE:');
        console.log(`   📊 devices type: ${typeof scan.scanData.devices}`);
        console.log(`   🔑 vendor groups: [${Object.keys(scan.scanData.devices).join(', ')}]`);
        
        // Examine each vendor group
        for (const [vendor, devices] of Object.entries(scan.scanData.devices)) {
          console.log(`\n   🏷️  ${vendor} Vendor Group:`);
          console.log(`      📊 type: ${typeof devices}`);
          console.log(`      📱 device count: ${Array.isArray(devices) ? devices.length : 'not an array'}`);
          
          if (Array.isArray(devices) && devices.length > 0) {
            console.log(`      🔍 First device sample:`);
            const device = devices[0];
            console.log(`         📊 device type: ${typeof device}`);
            console.log(`         🔑 device keys: [${Object.keys(device).join(', ')}]`);
            console.log(`         📄 device data:`);
            console.log(`            IP: ${device.ip || 'N/A'}`);
            console.log(`            MAC: ${device.mac || 'N/A'}`);
            console.log(`            Hostname: ${device.hostname || 'N/A'}`);
            console.log(`            Vendor: ${device.vendor || 'N/A'}`);
            console.log(`            Last Seen: ${device.lastSeen || 'N/A'}`);
            console.log(`            Response Time: ${device.responseTime || 'N/A'}`);
            console.log(`            Status: ${device.status || 'N/A'}`);
            
            if (devices.length > 1) {
              console.log(`      📋 All devices in this group:`);
              devices.forEach((dev, idx) => {
                console.log(`         ${idx + 1}. ${dev.ip} - ${dev.hostname || 'no hostname'} (${dev.status || 'unknown status'})`);
              });
            }
          }
        }
      }
      
      if (scan.scanData.portScanResults) {
        console.log('\n🔌 PORT SCAN RESULTS:');
        console.log(`   📊 type: ${typeof scan.scanData.portScanResults}`);
        console.log(`   📊 count: ${Object.keys(scan.scanData.portScanResults).length}`);
        
        if (Object.keys(scan.scanData.portScanResults).length > 0) {
          console.log(`   🔑 IPs with port data: [${Object.keys(scan.scanData.portScanResults).join(', ')}]`);
        }
      }
    } else {
      console.log('❌ No scanData found');
    }
    
    console.log('\n🔍 TESTING API ACCESS:');
    console.log('======================');
    
    // Test the API endpoints
    try {      const listResponse = await fetch(`http://localhost:3001/api/scan-history`);
      if (listResponse.ok) {
        const listData = await listResponse.json();
        const thisScannInList = listData.find(s => s.id === scan.scanId);
        console.log('📋 List API Test:');
        console.log(`   ✅ Response: ${listResponse.status}`);
        console.log(`   📊 Total scans: ${listData.length}`);
        console.log(`   🔍 This scan in list: ${thisScannInList ? 'YES' : 'NO'}`);
        if (thisScannInList) {
          console.log(`   📊 Has scanData in list: ${thisScannInList.scanData ? 'YES' : 'NO'}`);
          console.log(`   📊 Has data field in list: ${thisScannInList.data ? 'YES' : 'NO'}`);
        }
      } else {
        console.log(`❌ List API failed: ${listResponse.status}`);
      }
      
      const detailResponse = await fetch(`http://localhost:3001/api/scan-history/${scan.scanId}`);
      if (detailResponse.ok) {
        const detailData = await detailResponse.json();
        console.log('\n📋 Detail API Test:');
        console.log(`   ✅ Response: ${detailResponse.status}`);
        console.log(`   📊 Has scanData: ${detailData.scanData ? 'YES' : 'NO'}`);
        if (detailData.scanData) {
          console.log(`   🔑 scanData keys: [${Object.keys(detailData.scanData).join(', ')}]`);
          if (detailData.scanData.devices) {
            const totalDevices = Object.values(detailData.scanData.devices).reduce((sum, devices) => sum + (Array.isArray(devices) ? devices.length : 0), 0);
            console.log(`   📱 Total devices via API: ${totalDevices}`);
          }
        }
      } else {
        console.log(`❌ Detail API failed: ${detailResponse.status}`);
      }
      
    } catch (apiError) {
      console.log(`⚠️  API test failed (server might not be running): ${apiError.message}`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

examineScans();
