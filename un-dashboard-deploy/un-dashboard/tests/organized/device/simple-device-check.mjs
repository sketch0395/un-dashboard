import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

console.log('🔍 SIMPLE DEVICE CHECK');
console.log('======================');

const scanHistorySchema = new mongoose.Schema({
  scanId: String,
  userId: mongoose.Schema.Types.ObjectId,
  scanData: Object,
  deviceCount: Number,
  scanName: String,
  ipRange: String,
  createdAt: Date
});

const ScanHistory = mongoose.model('ScanHistory', scanHistorySchema);

async function checkDevices() {
  let connection;
  try {
    console.log('Connecting to MongoDB...');
    connection = await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 5000,
    });
    console.log('✅ Connected successfully');
    
    const scan = await ScanHistory.findOne().sort({ deviceCount: -1 });
    
    if (!scan) {
      console.log('❌ No scans found');
      return;
    }
    
    console.log(`\n📊 SCAN: ${scan.scanName}`);
    console.log(`📱 Device Count: ${scan.deviceCount}`);
    console.log(`🌐 IP Range: ${scan.ipRange}`);
    
    if (scan.scanData && scan.scanData.devices) {
      console.log(`\n📱 DEVICE DETAILS:`);
      const devices = Object.values(scan.scanData.devices).flat();
      
      devices.forEach((device, i) => {
        console.log(`\n   Device ${i + 1}:`);
        console.log(`     IP: ${device.ip}`);
        console.log(`     Status: ${device.status}`);
        console.log(`     Vendor: ${device.vendor}`);
        console.log(`     MAC: ${device.mac || 'None'}`);
        console.log(`     Hostname: ${device.hostname || 'None'}`);
        console.log(`     Response Time: ${device.responseTime || 'None'}`);
        console.log(`     Last Seen: ${device.lastSeen || 'None'}`);
      });
      
      console.log(`\n✅ Found ${devices.length} devices total`);
    } else {
      console.log('❌ No device data found');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    if (connection) {
      await mongoose.disconnect();
      console.log('\n🔌 Disconnected');
    }
  }
}

// Set a timeout to prevent hanging
const timeoutId = setTimeout(() => {
  console.log('⏰ Script timeout - exiting');
  process.exit(1);
}, 10000);

checkDevices().then(() => {
  clearTimeout(timeoutId);
  process.exit(0);
}).catch(error => {
  clearTimeout(timeoutId);
  console.error('💥 Script failed:', error);
  process.exit(1);
});
