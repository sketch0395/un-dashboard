/**
 * Test to verify database-level duplicate key error handling
 * This test will bypass application-level duplicate checking and force a database-level duplicate
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
  process.exit(1);
}

// First, create a scan directly in the database
const createScanDirectly = async () => {
  const testScanData = {
    scanId: "force-duplicate-test-" + Date.now(),
    name: "Force Duplicate Test Scan",
    ipRange: "192.168.1.0/24",
    deviceCount: 2,
    scanData: {
      devices: [
        {
          ip: "192.168.1.1",
          hostname: "router.local",
          status: "up",
          responseTime: 1.2,
          mac: "aa:bb:cc:dd:ee:01",
          vendor: "Cisco"
        },
        {
          ip: "192.168.1.100",
          hostname: "desktop.local",
          status: "up",
          responseTime: 0.8,
          mac: "aa:bb:cc:dd:ee:02",
          vendor: "Dell"
        }
      ]
    },
    metadata: {
      scanType: "full",
      scanDuration: 30.5,
      osDetection: false,
      serviceDetection: false,
      ports: [80, 443],
      hasNetworkTopology: false,
      deviceTypes: ["router", "desktop"]
    },
    settings: {
      isPrivate: true,
      isFavorite: false,
      tags: ["force-duplicate"],
      notes: "Test scan for forcing database duplicate error"
    }
  };

  const response = await fetch(`${API_BASE}/scan-history`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`
    },
    body: JSON.stringify(testScanData)
  });

  const responseData = await response.json();
  return { 
    success: response.ok, 
    data: responseData, 
    status: response.status,
    scanId: testScanData.scanId 
  };
};

// Then try to create another scan with the same scanId to force a database duplicate
const testDatabaseDuplicate = async () => {
  console.log('\n🧪 Testing Database-Level Duplicate Key Error Handling');
  console.log('======================================================');

  // Step 1: Create the first scan
  console.log('\n📋 Step 1: Creating initial scan...');
  const firstResult = await createScanDirectly();
  
  if (!firstResult.success) {
    console.log('❌ Failed to create initial scan:', firstResult.data);
    return;
  }
  
  console.log('✅ Initial scan created successfully');
  console.log('ScanId:', firstResult.scanId);

  // Step 2: Try to create a scan with the same scanId (this should trigger database duplicate)
  console.log('\n📋 Step 2: Attempting to create duplicate scan with same scanId...');
  
  const duplicateScanData = {
    scanId: firstResult.scanId, // Use the same scanId to force database duplicate
    name: "DUPLICATE - Force Duplicate Test Scan",
    ipRange: "192.168.2.0/24", // Different IP range but same scanId
    deviceCount: 1,
    scanData: {
      devices: [
        {
          ip: "192.168.2.1",
          hostname: "different-router.local",
          status: "up",
          responseTime: 2.1,
          mac: "bb:cc:dd:ee:ff:aa",
          vendor: "Netgear"
        }
      ]
    },
    metadata: {
      scanType: "ping",
      scanDuration: 15.2,
      osDetection: false,
      serviceDetection: false,
      ports: [80],
      hasNetworkTopology: false,
      deviceTypes: ["router"]
    },
    settings: {
      isPrivate: true,
      isFavorite: false,
      tags: ["duplicate-attempt"],
      notes: "This should trigger a database duplicate error"
    }
  };

  const duplicateResponse = await fetch(`${API_BASE}/scan-history`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`
    },
    body: JSON.stringify(duplicateScanData)
  });

  const duplicateData = await duplicateResponse.json();
  
  console.log(`Status: ${duplicateResponse.status}`);
  console.log(`Response:`, JSON.stringify(duplicateData, null, 2));

  // Analyze the result
  if (duplicateResponse.status === 409) {
    console.log('✅ Database duplicate correctly handled - returned 409 status');
    if (duplicateData.error && duplicateData.error.includes('already exists')) {
      console.log('✅ Error message is appropriate for duplicate');
    }
  } else if (duplicateResponse.status === 500) {
    if (duplicateData.error?.includes('duplicate key error') || 
        duplicateData.details?.includes('E11000 duplicate key error')) {
      console.log('⚠️  Database duplicate detected but returned 500 instead of 409');
      console.log('This means our error handling might need additional improvement');
    } else {
      console.log('❌ Unexpected 500 error:', duplicateData);
    }
  } else {
    console.log('❌ Unexpected response for database duplicate attempt');
  }

  // Cleanup
  console.log('\n🧹 Cleaning up test scan...');
  try {
    const cleanupResponse = await fetch(`${API_BASE}/scan-history`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({
        scanIds: [firstResult.scanId]
      })
    });

    const cleanupData = await cleanupResponse.json();
    console.log('Cleanup result:', cleanupData);
  } catch (error) {
    console.log('Cleanup failed (this is OK):', error.message);
  }
};

// Run the test
console.log('🚀 Starting Database-Level Duplicate Key Error Test');
console.log('====================================================');

testDatabaseDuplicate()
  .then(() => {
    console.log('\n✅ Test completed');
  })
  .catch((error) => {
    console.error('\n❌ Test failed:', error);
  });
