const http = require('http');
const fs = require('fs');

console.log('🔄 Testing Duplicate Prevention Logic');
console.log('='.repeat(40));

// Load saved authentication data
const loginData = JSON.parse(fs.readFileSync('./login-data.json', 'utf8'));

if (!loginData.token) {
  console.error('❌ No authentication token found. Run complete-auth-scan-test.js first');
  process.exit(1);
}

console.log('✅ Using saved authentication data');

// Test data with intentionally duplicate scanId
const duplicateScanId = `duplicate-test-${Date.now()}`;

const testScanData = {
  scanId: duplicateScanId,
  name: "Duplicate Prevention Test",
  ipRange: "10.0.1.0/24",
  deviceCount: 1,
  scanData: {
    devices: [
      {
        ip: "10.0.1.1",
        status: "up",
        hostname: "test.local",
        mac: "00:11:22:33:44:55",
        vendor: "Test",
        os: "Linux 3.x",
        ports: [80],
        services: [
          { port: 80, service: "http", state: "open" }
        ]
      }
    ],
    scanSummary: {
      totalIPs: 256,
      upHosts: 1,
      downHosts: 255,
      totalPorts: 1,
      openPorts: 1,
      scanTime: 15000
    }
  },
  metadata: {
    scanType: "ping",
    scanDuration: 15000,
    osDetection: false,
    serviceDetection: false,
    ports: ["80"],
    hasNetworkTopology: false,
    deviceTypes: ["unknown"]
  },
  settings: {
    isPrivate: true,
    isFavorite: false,
    tags: ["duplicate-test"],
    notes: "Testing duplicate prevention"
  }
};

function saveScan(scanData, attempt) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: '/api/scan-history',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${loginData.token}`,
        'Cookie': loginData.cookieHeader || ''
      }
    };

    console.log(`\n📤 Attempt ${attempt}: Saving scan with ID: ${scanData.scanId}`);

    const postData = JSON.stringify(scanData);
    options.headers['Content-Length'] = Buffer.byteLength(postData);

    const req = http.request(options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });

      res.on('end', () => {
        console.log(`📡 Response Status: ${res.statusCode}`);
        
        try {
          const jsonResponse = JSON.parse(responseData);
          resolve({ status: res.statusCode, data: jsonResponse });
        } catch (e) {
          console.log('Raw response:', responseData);
          reject(new Error('Invalid JSON response'));
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.write(postData);
    req.end();
  });
}

async function testDuplicatePrevention() {
  try {
    console.log(`🎯 Testing with scan ID: ${duplicateScanId}`);
    
    // First attempt - should succeed
    console.log('\n🔵 First Save Attempt (should succeed):');
    const result1 = await saveScan(testScanData, 1);
    
    if (result1.status === 201) {
      console.log('✅ SUCCESS: First scan saved successfully');
      console.log(`📝 Saved scan ID: ${result1.data.scanId}`);
    } else {
      console.log('❌ UNEXPECTED: First save failed');
      console.log('Response:', result1.data);
    }
    
    // Second attempt - should fail with 409 (duplicate)
    console.log('\n🔴 Second Save Attempt (should fail - duplicate):');
    const result2 = await saveScan(testScanData, 2);
    
    if (result2.status === 409) {
      console.log('✅ SUCCESS: Duplicate correctly prevented!');
      console.log(`📋 Error message: ${result2.data.error}`);
    } else if (result2.status === 201) {
      console.log('❌ FAILURE: Duplicate was NOT prevented!');
      console.log('This indicates a problem with duplicate detection logic');
    } else {
      console.log('❌ UNEXPECTED RESPONSE:', result2.data);
    }
    
    // Third attempt with modified data - should still fail (same scanId)
    const modifiedData = {
      ...testScanData,
      name: "Modified Duplicate Test",
      deviceCount: 2
    };
    
    console.log('\n🟡 Third Save Attempt (modified data, same scanId - should fail):');
    const result3 = await saveScan(modifiedData, 3);
    
    if (result3.status === 409) {
      console.log('✅ SUCCESS: Duplicate correctly prevented even with modified data!');
    } else if (result3.status === 201) {
      console.log('❌ FAILURE: Duplicate was NOT prevented with modified data!');
    } else {
      console.log('❌ UNEXPECTED RESPONSE:', result3.data);
    }
    
    // Summary
    console.log('\n' + '='.repeat(50));
    console.log('🎯 DUPLICATE PREVENTION TEST SUMMARY:');
    
    const success1 = result1.status === 201;
    const success2 = result2.status === 409;
    const success3 = result3.status === 409;
    
    console.log(`📊 First save (new): ${success1 ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`📊 Second save (duplicate): ${success2 ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`📊 Third save (modified duplicate): ${success3 ? '✅ PASS' : '❌ FAIL'}`);
    
    if (success1 && success2 && success3) {
      console.log('\n🎉 ALL TESTS PASSED: Duplicate prevention is working correctly!');
    } else {
      console.log('\n❌ SOME TESTS FAILED: Duplicate prevention needs investigation');
    }
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
  }
}

testDuplicatePrevention();
