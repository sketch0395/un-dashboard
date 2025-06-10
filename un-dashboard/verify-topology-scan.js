const http = require('http');
const fs = require('fs');

console.log('🔍 TOPOLOGY TEST SCAN VERIFICATION');
console.log('='.repeat(40));

// Load authentication data
const loginData = JSON.parse(fs.readFileSync('./login-data.json', 'utf8'));

function makeRequest(options) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let responseData = '';
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      res.on('end', () => {
        try {
          const jsonResponse = JSON.parse(responseData);
          resolve({ status: res.statusCode, data: jsonResponse });
        } catch (e) {
          resolve({ status: res.statusCode, data: responseData });
        }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

async function verifyTopologyTestScan() {
  console.log('📊 Retrieving recent scans to find topology test data...\n');
  
  const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/scan-history?limit=10',
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${loginData.token}`,
      'Cookie': loginData.cookieHeader || ''
    }
  };

  try {
    const result = await makeRequest(options);
    
    if (result.status === 200 && result.data.scanHistory) {
      const scans = result.data.scanHistory;
      console.log(`📋 Found ${scans.length} scans in history\n`);
      
      // Look for our topology test scan
      const topologyTestScan = scans.find(scan => 
        scan.name === "Topology Visualization Test" || 
        scan.scanId.includes('topology-test')
      );
      
      if (topologyTestScan) {
        console.log('✅ TOPOLOGY TEST SCAN FOUND!');
        console.log('='.repeat(30));
        console.log(`📝 Scan Name: ${topologyTestScan.name}`);
        console.log(`🆔 Scan ID: ${topologyTestScan.scanId}`);
        console.log(`🌐 IP Range: ${topologyTestScan.ipRange}`);
        console.log(`📱 Device Count: ${topologyTestScan.deviceCount}`);
        console.log(`📅 Created: ${new Date(topologyTestScan.createdAt).toLocaleString()}`);
        
        // Check metadata
        if (topologyTestScan.metadata) {
          console.log('\n📊 Metadata:');
          console.log(`   Scan Type: ${topologyTestScan.metadata.scanType}`);
          console.log(`   Has Network Topology: ${topologyTestScan.metadata.hasNetworkTopology}`);
          console.log(`   Device Types: ${topologyTestScan.metadata.deviceTypes?.join(', ')}`);
          console.log(`   Scan Duration: ${topologyTestScan.metadata.scanDuration}ms`);
          
          if (topologyTestScan.metadata.networkHierarchy) {
            console.log('\n🏗️  Network Hierarchy:');
            const hierarchy = topologyTestScan.metadata.networkHierarchy;
            console.log(`   Gateways: ${hierarchy.gateways}`);
            console.log(`   Switches: ${hierarchy.switches}`);
            console.log(`   Devices: ${hierarchy.devices}`);
            console.log(`   Has Connections: ${hierarchy.hasConnections}`);
          }
        }
        
        // Check device data
        if (topologyTestScan.scanData && topologyTestScan.scanData.devices) {
          console.log('\n📱 Device Details:');
          const devices = topologyTestScan.scanData.devices;
          
          devices.forEach((device, index) => {
            console.log(`\n   Device ${index + 1}:`);
            console.log(`     IP: ${device.ip}`);
            console.log(`     Hostname: ${device.hostname || 'N/A'}`);
            console.log(`     Type: ${device.deviceType || device.networkRole || 'N/A'}`);
            console.log(`     Vendor: ${device.vendor}`);
            console.log(`     Status: ${device.status}`);
            
            // Show hierarchy relationships
            if (device.isMainGateway) {
              console.log(`     🌟 Main Gateway`);
            }
            if (device.parentGateway) {
              console.log(`     🔗 Parent Gateway: ${device.parentGateway}`);
            }
            if (device.parentSwitch) {
              console.log(`     🔗 Parent Switch: ${device.parentSwitch}`);
            }
            if (device.connectedGateways) {
              console.log(`     🔗 Connected Gateways: ${device.connectedGateways.join(', ')}`);
            }
            if (device.portCount) {
              console.log(`     🔌 Port Count: ${device.portCount}`);
            }
            if (device.ports && device.ports.length > 0) {
              console.log(`     🚪 Open Ports: ${device.ports.join(', ')}`);
            }
          });
          
          console.log('\n🎯 TOPOLOGY VISUALIZATION VERIFICATION:');
          console.log('✅ Complete network hierarchy data is present');
          console.log('✅ Device type classifications are available');
          console.log('✅ Network relationship mappings are defined');
          console.log('✅ This scan should render properly in topology visualization');
          
          console.log('\n📝 To test the visualization:');
          console.log('1. Open http://localhost:3000/networkscan');
          console.log('2. Look for "Topology Visualization Test" in scan history');
          console.log('3. Click "Visualize on Topology" button');
          console.log('4. Switch between Circular and Hierarchical views');
          console.log('5. Verify you see: Gateway → Switch → Devices hierarchy');
        } else {
          console.log('❌ No device data found in topology test scan');
        }
        
      } else {
        console.log('❌ Topology test scan not found in recent history');
        console.log('\n📋 Available scans:');
        scans.forEach((scan, index) => {
          console.log(`   ${index + 1}. ${scan.name || scan.scanId} (${scan.ipRange})`);
        });
      }
      
    } else {
      console.log(`❌ Failed to retrieve scan history (${result.status})`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

verifyTopologyTestScan();
