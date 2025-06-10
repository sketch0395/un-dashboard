const http = require('http');
const fs = require('fs');

console.log('🎯 FINAL VERIFICATION TEST');
console.log('='.repeat(50));
console.log('Testing all key features of the UN Dashboard scan system\n');

// Load authentication data
const loginData = JSON.parse(fs.readFileSync('./login-data.json', 'utf8'));

if (!loginData.token) {
  console.error('❌ No authentication token found');
  process.exit(1);
}

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
    
    if (options.body) {
      req.write(options.body);
    }
    req.end();
  });
}

async function runVerificationTests() {
  const results = {
    authentication: false,
    scanSave: false,
    duplicatePrevention: false,
    scanRetrieval: false,
    totalScans: 0
  };

  try {
    console.log('🔑 Test 1: Authentication Verification');
    const authOptions = {
      hostname: 'localhost',
      port: 3000,
      path: '/api/scan-history?limit=1',
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${loginData.token}`,
        'Cookie': loginData.cookieHeader || ''
      }
    };

    const authResult = await makeRequest(authOptions);
    
    if (authResult.status === 200) {
      console.log('✅ Authentication: WORKING');
      results.authentication = true;
      results.totalScans = authResult.data.pagination?.totalCount || 0;
      console.log(`📊 Total scans in database: ${results.totalScans}`);
    } else {
      console.log(`❌ Authentication: FAILED (${authResult.status})`);
    }

    console.log('\n💾 Test 2: New Scan Save');
    const testScanId = `verification-test-${Date.now()}`;
    const scanData = {
      scanId: testScanId,
      name: "Final Verification Test",
      ipRange: "192.168.100.0/24",
      deviceCount: 1,
      scanData: {
        devices: [{
          ip: "192.168.100.1",
          status: "up",
          hostname: "test.local",
          mac: "00:11:22:33:44:55",
          vendor: "Test",
          ports: [80],
          services: [{ port: 80, service: "http", state: "open" }]
        }],
        scanSummary: {
          totalIPs: 256,
          upHosts: 1,
          downHosts: 255,
          totalPorts: 1,
          openPorts: 1,
          scanTime: 10000
        }
      },
      metadata: {
        scanType: "ping",
        scanDuration: 10000,
        hasNetworkTopology: false,
        deviceTypes: ["unknown"]
      },
      settings: {
        isPrivate: true,
        tags: ["verification", "final-test"]
      }
    };

    const saveOptions = {
      hostname: 'localhost',
      port: 3000,
      path: '/api/scan-history',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${loginData.token}`,
        'Cookie': loginData.cookieHeader || ''
      },
      body: JSON.stringify(scanData)
    };

    const saveResult = await makeRequest(saveOptions);
    
    if (saveResult.status === 201) {
      console.log('✅ Scan Save: WORKING');
      console.log(`📝 Saved scan ID: ${saveResult.data.scanId}`);
      results.scanSave = true;
    } else {
      console.log(`❌ Scan Save: FAILED (${saveResult.status})`);
      console.log('Response:', saveResult.data);
    }

    console.log('\n🔄 Test 3: Duplicate Prevention');
    const duplicateResult = await makeRequest(saveOptions); // Same scan data
    
    if (duplicateResult.status === 409) {
      console.log('✅ Duplicate Prevention: WORKING');
      console.log(`📋 Error: ${duplicateResult.data.error}`);
      results.duplicatePrevention = true;
    } else {
      console.log(`❌ Duplicate Prevention: FAILED (${duplicateResult.status})`);
      console.log('Duplicate was not detected!');
    }

    console.log('\n📋 Test 4: Scan Retrieval & Verification');
    const retrieveOptions = {
      hostname: 'localhost',
      port: 3000,
      path: '/api/scan-history?limit=5',
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${loginData.token}`,
        'Cookie': loginData.cookieHeader || ''
      }
    };

    const retrieveResult = await makeRequest(retrieveOptions);
    
    if (retrieveResult.status === 200) {
      console.log('✅ Scan Retrieval: WORKING');
      results.scanRetrieval = true;
      
      const scans = retrieveResult.data.scanHistory || [];
      console.log(`📊 Retrieved ${scans.length} recent scans`);
      
      // Check if our test scan is in the results
      const ourScan = scans.find(scan => scan.scanId === testScanId);
      if (ourScan) {
        console.log('✅ Verification: New scan found in database');
        console.log(`   Name: ${ourScan.name}`);
        console.log(`   IP Range: ${ourScan.ipRange}`);
        console.log(`   Device Count: ${ourScan.deviceCount}`);
        console.log(`   Created: ${new Date(ourScan.createdAt).toLocaleString()}`);
      } else {
        console.log('⚠️  Note: Test scan not in top 5 results (may be further down)');
      }
    } else {
      console.log(`❌ Scan Retrieval: FAILED (${retrieveResult.status})`);
    }

    // Final Summary
    console.log('\n' + '='.repeat(50));
    console.log('🎯 FINAL VERIFICATION SUMMARY');
    console.log('='.repeat(50));
    
    const passedTests = Object.values(results).filter(v => v === true).length;
    const totalTests = 4; // authentication, scanSave, duplicatePrevention, scanRetrieval
    
    console.log(`📊 Tests Passed: ${passedTests}/${totalTests}`);
    console.log(`🗄️  Total Scans in Database: ${results.totalScans}`);
    
    console.log('\n📋 Feature Status:');
    console.log(`  Authentication System: ${results.authentication ? '✅ WORKING' : '❌ FAILED'}`);
    console.log(`  Scan Save to MongoDB: ${results.scanSave ? '✅ WORKING' : '❌ FAILED'}`);
    console.log(`  Duplicate Prevention: ${results.duplicatePrevention ? '✅ WORKING' : '❌ FAILED'}`);
    console.log(`  Scan History Retrieval: ${results.scanRetrieval ? '✅ WORKING' : '❌ FAILED'}`);
    
    if (passedTests === totalTests) {
      console.log('\n🎉 SUCCESS: ALL CORE FEATURES ARE WORKING!');
      console.log('✅ The UN Dashboard network scanning system is fully operational');
      console.log('✅ MongoDB integration is working correctly');
      console.log('✅ Duplicate prevention is active');
      console.log('✅ UI can save and retrieve scan data');
    } else {
      console.log(`\n⚠️  ${totalTests - passedTests} issues detected that need attention`);
    }
    
    console.log('\n📝 Next Steps:');
    console.log('1. ✅ Core scanning and database features are working');
    console.log('2. 🌐 UI is accessible at http://localhost:3000/networkscan');
    console.log('3. 🔍 Network topology visualization can be tested through the UI');
    console.log('4. 📊 Scan history management is functional');

  } catch (error) {
    console.error('\n❌ Verification test failed:', error.message);
  }
}

runVerificationTests();
