const fs = require('fs');

// Load authentication data
const loginData = JSON.parse(fs.readFileSync('./login-data.json', 'utf8'));

console.log('🔍 TESTING TOPOLOGY DATA ACCESS');
console.log('='.repeat(40));

async function testTopologyDataAccess() {
  try {
    // 1. Get list of scans
    console.log('📊 Step 1: Getting scan list...');
    const listResponse = await fetch('http://localhost:3000/api/scan-history', {
      headers: {
        'Cookie': loginData.cookieHeader
      }
    });
    
    const listData = await listResponse.json();
    console.log(`✅ Found ${listData.scans ? listData.scans.length : 0} scans`);
    
    // 2. Find topology scan
    const topologyScans = listData.scans.filter(scan => 
      scan.scanName === 'Topology Visualization Test' || 
      scan.metadata?.hasNetworkTopology
    );
    
    if (topologyScans.length === 0) {
      console.log('❌ No topology scans found');
      return;
    }
    
    const topologyScan = topologyScans[0];
    console.log(`✅ Found topology scan: ${topologyScan._id}`);
    console.log(`📋 Name: ${topologyScan.scanName}`);
    console.log(`📅 Date: ${new Date(topologyScan.scanDate).toLocaleString()}`);
    
    // 3. Get full scan data
    console.log('\n📊 Step 2: Getting full scan data...');
    const fullResponse = await fetch(`http://localhost:3000/api/scan-history/${topologyScan._id}`, {
      headers: {
        'Cookie': loginData.cookieHeader
      }
    });
    
    const fullData = await fullResponse.json();
    
    if (fullData.scan && fullData.scan.scanData) {
      console.log(`✅ Retrieved full scan data with ${fullData.scan.scanData.length} devices`);
      
      console.log('\n🌐 TOPOLOGY STRUCTURE:');
      const devices = fullData.scan.scanData;
      
      // Find and display gateways
      const gateways = devices.filter(d => d.isMainGateway);
      gateways.forEach(gateway => {
        console.log(`🏠 Gateway: ${gateway.ip} (${gateway.hostname})`);
        
        // Find switches connected to this gateway
        const switches = devices.filter(d => d.parentGateway === gateway.ip);
        switches.forEach(sw => {
          console.log(`  🔌 Switch: ${sw.ip} (${sw.hostname})`);
          
          // Find devices connected to this switch
          const connectedDevices = devices.filter(d => d.parentSwitch === sw.ip);
          connectedDevices.forEach(device => {
            console.log(`    💻 Device: ${device.ip} (${device.hostname})`);
          });
        });
      });
      
      console.log('\n✅ TOPOLOGY DATA IS READY FOR VISUALIZATION!');
      console.log('🌐 Next: Open http://localhost:3000/networkscan to test UI');
      
      return {
        success: true,
        scanId: topologyScan._id,
        deviceCount: devices.length,
        devices: devices
      };
    } else {
      console.log('❌ No scan data found in the topology scan');
      console.log('Response:', JSON.stringify(fullData, null, 2));
    }
  } catch (error) {
    console.error('❌ Error testing topology data:', error.message);
  }
}

testTopologyDataAccess();
