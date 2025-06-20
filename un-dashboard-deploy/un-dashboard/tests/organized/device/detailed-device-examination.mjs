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

console.log('🔍 DETAILED DEVICE DATA EXAMINATION');
console.log('===================================');

async function examineDeviceData() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    
    // Get the most recent scan with the most devices
    const scan = await ScanHistory.findOne().sort({ deviceCount: -1, createdAt: -1 });
    
    if (!scan) {
      console.log('❌ No scans found');
      return;
    }
    
    console.log(`\n📊 EXAMINING SCAN WITH MOST DEVICES:`);
    console.log(`   📋 Name: ${scan.scanName}`);
    console.log(`   🆔 ID: ${scan.scanId}`);
    console.log(`   📱 Device Count: ${scan.deviceCount}`);
    console.log(`   🌐 IP Range: ${scan.ipRange}`);
    console.log(`   📅 Created: ${scan.createdAt}`);
    
    console.log('\n🔍 COMPLETE DEVICE DATA STRUCTURE:');
    console.log('==================================');
    
    if (scan.scanData && scan.scanData.devices) {
      console.log(`📊 scanData.devices type: ${typeof scan.scanData.devices}`);
      console.log(`🔑 Vendor groups: [${Object.keys(scan.scanData.devices).join(', ')}]`);
      
      let totalDevicesFound = 0;
      
      for (const [vendor, devices] of Object.entries(scan.scanData.devices)) {
        console.log(`\n🏷️  VENDOR GROUP: "${vendor}"`);
        console.log(`   📊 Type: ${typeof devices}`);
        console.log(`   📦 Is Array: ${Array.isArray(devices)}`);
        console.log(`   📱 Device Count: ${Array.isArray(devices) ? devices.length : 'N/A'}`);
        
        if (Array.isArray(devices)) {
          totalDevicesFound += devices.length;
          
          devices.forEach((device, index) => {
            console.log(`\n   📱 DEVICE ${index + 1}:`);
            console.log(`      📊 Type: ${typeof device}`);
            console.log(`      🔑 Keys: [${Object.keys(device).join(', ')}]`);
            console.log(`      📄 Raw Data:`);
            console.log(`         🌐 IP: "${device.ip || 'N/A'}"`);
            console.log(`         🏷️  MAC: "${device.mac || 'N/A'}"`);
            console.log(`         🖥️  Hostname: "${device.hostname || 'N/A'}"`);
            console.log(`         🏭 Vendor: "${device.vendor || 'N/A'}"`);
            console.log(`         📡 Status: "${device.status || 'N/A'}"`);
            console.log(`         ⏱️  Response Time: "${device.responseTime || 'N/A'}"`);
            console.log(`         👁️  Last Seen: "${device.lastSeen || 'N/A'}"`);
            
            // Show any additional fields
            const knownFields = ['ip', 'mac', 'hostname', 'vendor', 'status', 'responseTime', 'lastSeen'];
            const extraFields = Object.keys(device).filter(key => !knownFields.includes(key));
            if (extraFields.length > 0) {
              console.log(`         ➕ Extra fields: [${extraFields.join(', ')}]`);
              extraFields.forEach(field => {
                console.log(`            ${field}: "${device[field]}"`);
              });
            }
          });
        } else {
          console.log(`   ⚠️  WARNING: Devices is not an array, it's: ${typeof devices}`);
          console.log(`   📄 Content: ${JSON.stringify(devices, null, 2)}`);
        }
      }
      
      console.log(`\n📊 SUMMARY:`);
      console.log(`   🔢 Total devices found in data: ${totalDevicesFound}`);
      console.log(`   🔢 Stored device count: ${scan.deviceCount}`);
      console.log(`   ✅ Counts match: ${totalDevicesFound === scan.deviceCount ? 'YES' : 'NO'}`);
      
    } else {
      console.log('❌ No device data found in scanData');
    }
    
    // Also examine port scan results
    if (scan.scanData && scan.scanData.portScanResults) {
      console.log('\n🔌 PORT SCAN RESULTS:');
      console.log('====================');
      console.log(`📊 Type: ${typeof scan.scanData.portScanResults}`);
      console.log(`📦 Is Object: ${typeof scan.scanData.portScanResults === 'object'}`);
      console.log(`🔑 Keys: [${Object.keys(scan.scanData.portScanResults).join(', ')}]`);
      console.log(`📊 Entry Count: ${Object.keys(scan.scanData.portScanResults).length}`);
      
      if (Object.keys(scan.scanData.portScanResults).length > 0) {
        console.log('📋 Sample entries:');
        Object.entries(scan.scanData.portScanResults).slice(0, 2).forEach(([ip, portData]) => {
          console.log(`   🌐 ${ip}:`);
          console.log(`      📊 Type: ${typeof portData}`);
          console.log(`      📄 Data: ${JSON.stringify(portData, null, 6)}`);
        });
      }
    }
    
    console.log('\n🔄 CLIENT-SIDE DATA EXTRACTION TEST:');
    console.log('====================================');
    
    // Simulate how the client extracts devices
    const simulatedScanEntry = {
      id: scan.scanId,
      name: scan.scanName,
      data: scan.scanData.devices || {},
      isFromDatabase: true
    };
    
    console.log(`📊 Simulated scan entry data type: ${typeof simulatedScanEntry.data}`);
    console.log(`🔑 Simulated scan entry data keys: [${Object.keys(simulatedScanEntry.data).join(', ')}]`);
    
    // Extract devices like the client does
    const allDevices = [];
    if (simulatedScanEntry.data && typeof simulatedScanEntry.data === 'object') {
      for (const [vendor, devices] of Object.entries(simulatedScanEntry.data)) {
        if (Array.isArray(devices)) {
          allDevices.push(...devices);
        }
      }
    }
    
    console.log(`📱 Extracted device count: ${allDevices.length}`);
    console.log(`✅ Extraction successful: ${allDevices.length > 0 ? 'YES' : 'NO'}`);
    
    if (allDevices.length > 0) {
      console.log('📋 Sample extracted device:');
      const sample = allDevices[0];
      console.log(`   🌐 IP: ${sample.ip}`);
      console.log(`   🏷️  MAC: ${sample.mac || 'N/A'}`);
      console.log(`   🖥️  Hostname: ${sample.hostname || 'N/A'}`);
      console.log(`   📡 Status: ${sample.status}`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

examineDeviceData();
