// Quick check of current device state in database
const dbConnection = require('./lib/db');
const SharedScan = require('./models/SharedScan');

async function checkDeviceState() {
  try {
    await dbConnection.connectMongoDB();
    console.log('🔗 Connected to database');
    
    const scanId = '6848c12b80389e07c63b0863';
    const scan = await SharedScan.findById(scanId);
    
    if (!scan) {
      throw new Error('Scan not found');
    }
    
    console.log('\n📋 Current device states:');
    for (const vendor of Object.keys(scan.scanData?.devices || {})) {
      const devices = scan.scanData.devices[vendor];
      if (Array.isArray(devices)) {
        devices.forEach(device => {
          if (device.ip === '10.5.1.1') {
            console.log(`\n🎯 Device ${device.ip}:`);
            console.log(`   Hostname: ${device.hostname || 'None'}`);
            console.log(`   Test Property: ${device.testProperty || 'None'}`);
            console.log(`   Last Modified: ${device.lastModified || 'None'}`);
            console.log(`   Updated At: ${scan.updatedAt}`);
          }
        });
      }
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkDeviceState();
