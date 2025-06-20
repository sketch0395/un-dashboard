/**
 * Test script to verify the duplicate key error handling fix
 * This will test both application-level and database-level duplicate detection
 */

import fetch from 'node-fetch';
import fs from 'fs';

const API_BASE = 'http://localhost:3000/api';

// Load authentication token
let authToken = null;
try {
  const authData = JSON.parse(fs.readFileSync('./login-data.json', 'utf8'));
  authToken = authData.token;
  console.log('✓ Loaded authentication token');
} catch (error) {
  console.error('❌ Failed to load authentication token:', error.message);
  console.log('Please run the browser authentication test first');
  process.exit(1);
}

// Test scan data with the same scanId for duplicate testing
const testScanData = {
  scanId: "duplicate-test-scan-" + Date.now(),
  name: "Duplicate Test Scan",
  ipRange: "192.168.1.0/24",
  deviceCount: 3,
  scanData: {
    devices: [
      {
        ip: "192.168.1.1",
        hostname: "router.local",
        status: "up",
        responseTime: 1.2,
        mac: "aa:bb:cc:dd:ee:01",
        vendor: "Cisco",
        openPorts: [80, 443, 22],
        services: [
          { port: 80, service: "http", version: "Apache 2.4" },
          { port: 443, service: "https", version: "Apache 2.4" },
          { port: 22, service: "ssh", version: "OpenSSH 8.0" }
        ]
      },
      {
        ip: "192.168.1.100",
        hostname: "desktop.local",
        status: "up",
        responseTime: 0.8,
        mac: "aa:bb:cc:dd:ee:02",
        vendor: "Dell",
        openPorts: [3389],
        services: [
          { port: 3389, service: "rdp", version: "Microsoft Terminal Services" }
        ]
      },
      {
        ip: "192.168.1.50",
        hostname: "printer.local",
        status: "up",
        responseTime: 2.1,
        mac: "aa:bb:cc:dd:ee:03",
        vendor: "HP",
        openPorts: [80, 9100],
        services: [
          { port: 80, service: "http", version: "HP Web Management" },
          { port: 9100, service: "jetdirect", version: "HP JetDirect" }
        ]
      }
    ],
    summary: {
      totalHosts: 256,
      activeHosts: 3,
      scanDuration: 45.2,
      timestamp: new Date().toISOString()
    }
  },  metadata: {
    scanType: "full", // Changed from "comprehensive" to valid enum value
    scanDuration: 45.2,
    osDetection: true,
    serviceDetection: true,
    ports: [22, 80, 443, 3389, 9100],
    hasNetworkTopology: false,
    deviceTypes: ["router", "desktop", "printer"]
  },
  settings: {
    isPrivate: true,
    isFavorite: false,
    tags: ["test", "duplicate-test"],
    notes: "Test scan for duplicate error handling"
  }
};

async function makeScanHistoryRequest(scanData) {
  try {
    const response = await fetch(`${API_BASE}/scan-history`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify(scanData)
    });

    const responseText = await response.text();
    let responseData;
    
    try {
      responseData = JSON.parse(responseText);
    } catch (parseError) {
      responseData = { rawResponse: responseText };
    }

    return {
      status: response.status,
      ok: response.ok,
      data: responseData,
      headers: Object.fromEntries(response.headers.entries())
    };
  } catch (error) {
    console.error('Request failed:', error);
    return {
      status: 0,
      ok: false,
      data: { error: error.message },
      headers: {}
    };
  }
}

async function testDuplicateHandling() {
  console.log('\n🧪 Testing Duplicate Key Error Handling');
  console.log('==========================================');

  // Test 1: Save initial scan (should succeed)
  console.log('\n📋 Test 1: Saving initial scan...');
  const firstResult = await makeScanHistoryRequest(testScanData);
  
  console.log(`Status: ${firstResult.status}`);
  console.log(`Response:`, JSON.stringify(firstResult.data, null, 2));
  
  if (firstResult.status === 201) {
    console.log('✅ First scan saved successfully');
  } else {
    console.log('❌ First scan failed to save');
    console.log('Response:', firstResult.data);
    return;
  }

  // Test 2: Save duplicate scan (should return 409)
  console.log('\n📋 Test 2: Saving duplicate scan (same scanId)...');
  const duplicateResult = await makeScanHistoryRequest(testScanData);
  
  console.log(`Status: ${duplicateResult.status}`);
  console.log(`Response:`, JSON.stringify(duplicateResult.data, null, 2));
  
  if (duplicateResult.status === 409) {
    console.log('✅ Duplicate correctly detected and returned 409 status');
  } else if (duplicateResult.status === 500 && 
             (duplicateResult.data.error?.includes('duplicate key error') || 
              duplicateResult.data.details?.includes('E11000 duplicate key error'))) {
    console.log('⚠️  Duplicate detected but returned 500 status instead of 409');
    console.log('This suggests the database-level error handling needs improvement');
  } else {
    console.log('❌ Unexpected response for duplicate scan');
    console.log('Expected: 409 status with duplicate error message');
    console.log('Got:', duplicateResult);
  }

  // Test 3: Save scan with different scanId (should succeed)
  console.log('\n📋 Test 3: Saving scan with different scanId...');
  const differentScanData = {
    ...testScanData,
    scanId: "different-test-scan-" + Date.now(),
    name: "Different Test Scan"
  };
  
  const differentResult = await makeScanHistoryRequest(differentScanData);
  
  console.log(`Status: ${differentResult.status}`);
  console.log(`Response:`, JSON.stringify(differentResult.data, null, 2));
  
  if (differentResult.status === 201) {
    console.log('✅ Different scan saved successfully');
  } else {
    console.log('❌ Different scan failed to save');
    console.log('Response:', differentResult.data);
  }

  // Cleanup: Delete test scans
  console.log('\n🧹 Cleaning up test scans...');
  try {
    const cleanupResponse = await fetch(`${API_BASE}/scan-history`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({
        scanIds: [testScanData.scanId, differentScanData.scanId]
      })
    });

    const cleanupData = await cleanupResponse.json();
    console.log('Cleanup result:', cleanupData);
  } catch (error) {
    console.log('Cleanup failed (this is OK):', error.message);
  }
}

// Run the test
console.log('🚀 Starting Duplicate Key Error Handling Test');
console.log('==============================================');

testDuplicateHandling()
  .then(() => {
    console.log('\n✅ Test completed');
  })
  .catch((error) => {
    console.error('\n❌ Test failed:', error);
  });
