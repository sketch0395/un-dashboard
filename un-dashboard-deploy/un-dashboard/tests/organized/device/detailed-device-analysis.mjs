import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

// Use the existing schema
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

console.log('🔍 DETAILED DEVICE EXAMINATION');
console.log('==============================');

async function examineDevices() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    
    // Get all scans sorted by device count (most devices first)
    const scans = await ScanHistory.find().sort({ deviceCount: -1, createdAt: -1 });
    
    if (scans.length === 0) {
      console.log('❌ No scans found');
      return;
    }
    
    console.log(`\n📊 Found ${scans.length} scans total`);
    
    // Examine each scan in detail
    for (let i = 0; i < scans.length; i++) {
      const scan = scans[i];
      
      console.log(`\n${'='.repeat(60)}`);
      console.log(`🔍 SCAN ${i + 1}: ${scan.scanName}`);
      console.log(`${'='.repeat(60)}`);
      console.log(`📋 ID: ${scan.scanId}`);
      console.log(`📅 Created: ${scan.createdAt}`);
      console.log(`🌐 IP Range: ${scan.ipRange}`);
      console.log(`📊 Device Count: ${scan.deviceCount}`);
      console.log(`👤 User ID: ${scan.userId}`);
      
      if (scan.scanData) {
        console.log(`\n📦 SCAN DATA STRUCTURE:`);
        console.log(`   Type: ${typeof scan.scanData}`);
        console.log(`   Keys: [${Object.keys(scan.scanData).join(', ')}]`);
        
        if (scan.scanData.devices) {
          console.log(`\n📱 DEVICES ANALYSIS:`);
          console.log(`   Type: ${typeof scan.scanData.devices}`);
          console.log(`   Vendor Groups: [${Object.keys(scan.scanData.devices).join(', ')}]`);
          
          let deviceCounter = 0;
          
          // Examine each vendor group
          for (const [vendor, devices] of Object.entries(scan.scanData.devices)) {
            console.log(`\n   🏷️  VENDOR GROUP: "${vendor}"`);
            console.log(`      📊 Type: ${typeof devices}`);
            console.log(`      📦 Is Array: ${Array.isArray(devices)}`);
            
            if (Array.isArray(devices)) {
              console.log(`      📱 Device Count: ${devices.length}`);
              
              // Show each device in detail
              devices.forEach((device, deviceIndex) => {
                deviceCounter++;
                console.log(`\n      📱 DEVICE ${deviceCounter} (${vendor}[${deviceIndex}]):`);
                console.log(`         📊 Type: ${typeof device}`);
                console.log(`         🔑 Keys: [${Object.keys(device).join(', ')}]`);
                
                // Show all device properties
                console.log(`         📄 COMPLETE DEVICE DATA:`);
                Object.entries(device).forEach(([key, value]) => {
                  if (typeof value === 'object' && value !== null) {
                    console.log(`            ${key}: ${JSON.stringify(value, null, 14)}`);
                  } else {
                    console.log(`            ${key}: "${value}"`);
                  }
                });
                
                // Check for common issues
                console.log(`         🔍 ANALYSIS:`);
                console.log(`            ✅ Has IP: ${!!device.ip}`);
                console.log(`            ✅ Has Status: ${!!device.status}`);
                console.log(`            ✅ Has Vendor: ${!!device.vendor}`);
                console.log(`            ✅ Has MAC: ${!!device.mac}`);
                console.log(`            ✅ Has Hostname: ${!!device.hostname}`);
                console.log(`            ✅ Has Response Time: ${!!device.responseTime}`);
                console.log(`            ✅ Has Last Seen: ${!!device.lastSeen}`);
                
                // Check if device would be visible in UI
                const isVisibleDevice = device.ip && device.status;
                console.log(`            👁️  Visible in UI: ${isVisibleDevice ? 'YES' : 'NO'}`);
                
                if (!isVisibleDevice) {
                  console.log(`            ⚠️  ISSUE: Device missing required fields for UI display`);
                }
              });
            } else {
              console.log(`      ⚠️  WARNING: Devices is not an array`);
              console.log(`      📄 Raw content: ${JSON.stringify(devices, null, 6)}`);
            }
          }
          
          console.log(`\n   📊 SUMMARY:`);
          console.log(`      🔢 Total devices found: ${deviceCounter}`);
          console.log(`      🔢 Stored device count: ${scan.deviceCount}`);
          console.log(`      ✅ Counts match: ${deviceCounter === scan.deviceCount ? 'YES' : 'NO'}`);
          
          if (deviceCounter !== scan.deviceCount) {
            console.log(`      ⚠️  COUNT MISMATCH: Expected ${scan.deviceCount}, found ${deviceCounter}`);
          }
          
        } else {
          console.log(`\n   ❌ NO DEVICES FIELD in scanData`);
        }
        
        // Examine port scan results
        if (scan.scanData.portScanResults) {
          console.log(`\n🔌 PORT SCAN RESULTS:`);
          console.log(`   Type: ${typeof scan.scanData.portScanResults}`);
          console.log(`   Keys: [${Object.keys(scan.scanData.portScanResults).join(', ')}]`);
          console.log(`   Entry Count: ${Object.keys(scan.scanData.portScanResults).length}`);
          
          if (Object.keys(scan.scanData.portScanResults).length > 0) {
            console.log(`   📋 Port scan entries:`);
            Object.entries(scan.scanData.portScanResults).forEach(([ip, portData]) => {
              console.log(`      🌐 ${ip}:`);
              console.log(`         Type: ${typeof portData}`);
              console.log(`         Data: ${JSON.stringify(portData, null, 8)}`);
            });
          }
        } else {
          console.log(`\n🔌 NO PORT SCAN RESULTS`);
        }
        
      } else {
        console.log(`\n❌ NO SCAN DATA FOUND`);
      }
      
      // Test client-side extraction logic
      console.log(`\n🧪 CLIENT-SIDE EXTRACTION TEST:`);
      if (scan.scanData && scan.scanData.devices) {
        const extractedDevices = Object.values(scan.scanData.devices).flat();
        console.log(`   📤 Extracted device count: ${extractedDevices.length}`);
        console.log(`   ✅ Extraction successful: ${extractedDevices.length > 0 ? 'YES' : 'NO'}`);
        
        if (extractedDevices.length > 0) {
          console.log(`   📋 First extracted device:`);
          const firstDevice = extractedDevices[0];
          console.log(`      IP: ${firstDevice.ip}`);
          console.log(`      Status: ${firstDevice.status}`);
          console.log(`      Vendor: ${firstDevice.vendor}`);
          console.log(`      MAC: ${firstDevice.mac || 'None'}`);
          console.log(`      Hostname: ${firstDevice.hostname || 'None'}`);
          console.log(`      Response Time: ${firstDevice.responseTime || 'None'}`);
        }
      } else {
        console.log(`   ❌ Cannot extract devices - no devices field`);
      }
    }
    
    // Overall summary
    console.log(`\n${'='.repeat(60)}`);
    console.log(`📈 OVERALL SUMMARY`);
    console.log(`${'='.repeat(60)}`);
    
    const totalDevicesAcrossAllScans = scans.reduce((sum, scan) => {
      if (scan.scanData && scan.scanData.devices) {
        return sum + Object.values(scan.scanData.devices).flat().length;
      }
      return sum;
    }, 0);
    
    const totalStoredDeviceCount = scans.reduce((sum, scan) => sum + scan.deviceCount, 0);
    
    console.log(`📊 Total scans: ${scans.length}`);
    console.log(`📱 Total devices across all scans: ${totalDevicesAcrossAllScans}`);
    console.log(`📊 Total stored device count: ${totalStoredDeviceCount}`);
    console.log(`✅ Data integrity: ${totalDevicesAcrossAllScans === totalStoredDeviceCount ? 'GOOD' : 'ISSUES FOUND'}`);
    
    // Check for common device patterns
    const allDevices = scans.flatMap(scan => 
      scan.scanData && scan.scanData.devices 
        ? Object.values(scan.scanData.devices).flat()
        : []
    );
    
    console.log(`\n🔍 DEVICE PATTERN ANALYSIS:`);
    console.log(`   📱 Total unique devices: ${allDevices.length}`);
    
    const ipAddresses = [...new Set(allDevices.map(d => d.ip).filter(Boolean))];
    console.log(`   🌐 Unique IP addresses: ${ipAddresses.length}`);
    console.log(`   📋 IP addresses found: [${ipAddresses.join(', ')}]`);
    
    const statuses = [...new Set(allDevices.map(d => d.status).filter(Boolean))];
    console.log(`   📡 Device statuses: [${statuses.join(', ')}]`);
    
    const vendors = [...new Set(allDevices.map(d => d.vendor).filter(Boolean))];
    console.log(`   🏭 Vendors found: [${vendors.join(', ')}]`);
    
    const withHostnames = allDevices.filter(d => d.hostname && d.hostname !== null).length;
    console.log(`   🖥️  Devices with hostnames: ${withHostnames}`);
    
    const withMACs = allDevices.filter(d => d.mac && d.mac !== null).length;
    console.log(`   🏷️  Devices with MAC addresses: ${withMACs}`);
    
    const withResponseTimes = allDevices.filter(d => d.responseTime).length;
    console.log(`   ⏱️  Devices with response times: ${withResponseTimes}`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

examineDevices();
