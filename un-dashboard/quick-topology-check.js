const fs = require('fs');

console.log('🔍 TOPOLOGY SCAN DATA VERIFICATION');
console.log('='.repeat(40));

async function getTopologyData() {
  const loginData = JSON.parse(fs.readFileSync('./login-data.json', 'utf8'));
  
  try {
    // Get the specific topology scan
    const response = await fetch('http://localhost:3000/api/scan-history/topology-test-1749489466582', {
      headers: {
        'Cookie': loginData.cookieHeader
      }
    });
    
    const data = await response.json();
    
    if (data.scan && data.scan.scanData) {
      console.log('✅ TOPOLOGY SCAN FOUND WITH FULL DATA');
      console.log(`📝 Scan ID: ${data.scan.scanId}`);
      console.log(`🏷️  Name: ${data.scan.scanName}`);
      console.log(`📱 Device Count: ${data.scan.scanData.length}`);
      
      console.log('\n🌐 NETWORK TOPOLOGY:');
      const devices = data.scan.scanData;
      
      devices.forEach((device, i) => {
        console.log(`\n${i+1}. ${device.ip} (${device.hostname})`);
        console.log(`   Type: ${device.deviceType}`);
        console.log(`   Role: ${device.networkRole}`);
        if (device.isMainGateway) console.log('   🏠 Main Gateway: YES');
        if (device.parentGateway) console.log(`   🔗 Parent Gateway: ${device.parentGateway}`);
        if (device.parentSwitch) console.log(`   🔗 Parent Switch: ${device.parentSwitch}`);
        if (device.connectedGateways && device.connectedGateways.length > 0) {
          console.log(`   🔗 Connected Gateways: ${device.connectedGateways.join(', ')}`);
        }
      });
      
      console.log('\n✅ TOPOLOGY DATA IS COMPLETE AND READY FOR UI TESTING!');
      return true;
    } else {
      console.log('❌ No scan data found');
      console.log('Response:', JSON.stringify(data, null, 2));
      return false;
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    return false;
  }
}

getTopologyData().then(success => {
  if (success) {
    console.log('\n🎯 NEXT STEPS:');
    console.log('1. Open http://localhost:3000/networkscan in browser');
    console.log('2. Load the topology scan from scan history');
    console.log('3. Test circular vs hierarchical visualization');
    console.log('4. Verify device connections are displayed correctly');
  }
});
