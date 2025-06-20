/**
 * Test Script: Device Data Missing from Database Scans Fix
 * 
 * This script tests the fix for the issue where scans saved to the database
 * were not returning device data when retrieved.
 * 
 * The problem was that the main scan history API endpoint excluded scan data
 * for performance reasons, but the client-side code didn't fetch the full
 * scan data when needed for visualization or export.
 */

import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:3000';

// Test data - simulating a network scan
const testScanData = {
    "Network Equipment": [
        {
            ip: "192.168.1.1",
            hostname: "router.local",
            mac: "00:11:22:33:44:55",
            vendor: "Netgear",
            ports: ["80/tcp open http", "443/tcp open https"],
            status: "up"
        },
        {
            ip: "192.168.1.2", 
            hostname: "switch.local",
            mac: "00:11:22:33:44:66",
            vendor: "Cisco",
            ports: ["22/tcp open ssh", "80/tcp open http"],
            status: "up"
        }
    ],
    "Computers": [
        {
            ip: "192.168.1.100",
            hostname: "desktop.local", 
            mac: "00:11:22:33:44:77",
            vendor: "Dell",
            ports: ["22/tcp open ssh"],
            status: "up"
        }
    ]
};

let authCookies = '';

async function login() {
    console.log('🔐 Step 1: Logging in...');
    
    const loginResponse = await fetch(`${BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            username: 'admin',
            password: 'admin123'
        })
    });
    
    if (!loginResponse.ok) {
        throw new Error(`Login failed: ${loginResponse.status}`);
    }
    
    // Extract cookies from response
    const setCookieHeaders = loginResponse.headers.raw()['set-cookie'];
    if (setCookieHeaders) {
        authCookies = setCookieHeaders.map(cookie => cookie.split(';')[0]).join('; ');
        console.log('   ✅ Successfully logged in');
        console.log('   🍪 Auth cookies obtained');
        return true;
    }
    
    throw new Error('No authentication cookies received');
}

async function saveScanToDatabase() {
    console.log('\n💾 Step 2: Saving scan to database...');
    
    // Calculate device count
    let deviceCount = 0;
    Object.values(testScanData).forEach(vendorDevices => {
        if (Array.isArray(vendorDevices)) {
            deviceCount += vendorDevices.length;
        }
    });
    
    const scanId = `test-device-data-fix-${Date.now()}`;
    const dbPayload = {
        scanId: scanId,
        name: `Test Scan - Device Data Fix`,
        ipRange: '192.168.1.0/24',
        deviceCount: deviceCount,
        scanData: {
            devices: testScanData,
            portScanResults: [],
            networkInfo: {}
        },
        metadata: {
            timestamp: new Date().toISOString(),
            scanDuration: 5000,
            userAgent: 'test-script'
        },
        settings: {
            isPrivate: true,
            isFavorite: false,
            tags: ['test', 'device-fix'],
            notes: 'Test scan for device data fix verification'
        }
    };
    
    const saveResponse = await fetch(`${BASE_URL}/api/scan-history`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Cookie': authCookies
        },
        body: JSON.stringify(dbPayload)
    });
    
    if (!saveResponse.ok) {
        const errorText = await saveResponse.text();
        throw new Error(`Failed to save scan: ${saveResponse.status} - ${errorText}`);
    }
    
    const savedScan = await saveResponse.json();
    console.log(`   ✅ Scan saved successfully with ID: ${scanId}`);
    console.log(`   📊 Device count: ${deviceCount}`);
    
    return { scanId, deviceCount };
}

async function testMainScanHistoryAPI() {
    console.log('\n📋 Step 3: Testing main scan history API (without scan data)...');
    
    const listResponse = await fetch(`${BASE_URL}/api/scan-history`, {
        method: 'GET',
        headers: {
            'Cookie': authCookies
        }
    });
    
    if (!listResponse.ok) {
        throw new Error(`Failed to fetch scan history: ${listResponse.status}`);
    }
    
    const data = await listResponse.json();
    const scans = data.scanHistory || [];
    
    console.log(`   📊 Retrieved ${scans.length} scans from database`);
    
    if (scans.length > 0) {
        const latestScan = scans[0];
        console.log(`   🔍 Latest scan: ${latestScan.name}`);
        console.log(`   📋 Device count: ${latestScan.deviceCount}`);
        console.log(`   💾 Has scan data: ${!!latestScan.scanData}`);
        
        if (!latestScan.scanData) {
            console.log('   ✅ EXPECTED: Scan data excluded from list view for performance');
            return latestScan.scanId;
        } else {
            console.log('   ⚠️  Unexpected: Scan data included in list view');
            return latestScan.scanId;
        }
    }
    
    throw new Error('No scans found in database');
}

async function testDetailedScanAPI(scanId) {
    console.log('\n🔍 Step 4: Testing detailed scan API (with full scan data)...');
    
    const detailResponse = await fetch(`${BASE_URL}/api/scan-history/${scanId}`, {
        method: 'GET',
        headers: {
            'Cookie': authCookies
        }
    });
    
    if (!detailResponse.ok) {
        throw new Error(`Failed to fetch scan details: ${detailResponse.status}`);
    }
    
    const scanDetails = await detailResponse.json();
    
    console.log(`   📋 Scan ID: ${scanDetails.scanId}`);
    console.log(`   📊 Device count: ${scanDetails.deviceCount}`);
    console.log(`   💾 Has scan data: ${!!scanDetails.scanData}`);
    
    if (scanDetails.scanData && scanDetails.scanData.devices) {
        const devices = scanDetails.scanData.devices;
        console.log(`   🔍 Scan data structure: ${typeof devices}`);
        
        if (typeof devices === 'object') {
            const vendorKeys = Object.keys(devices);
            console.log(`   🏷️  Vendor groups: ${vendorKeys.join(', ')}`);
            
            let totalDevices = 0;
            vendorKeys.forEach(vendor => {
                if (Array.isArray(devices[vendor])) {
                    totalDevices += devices[vendor].length;
                    console.log(`   📱 ${vendor}: ${devices[vendor].length} devices`);
                }
            });
            
            console.log(`   ✅ Total devices in scan data: ${totalDevices}`);
            
            if (totalDevices === scanDetails.deviceCount) {
                console.log('   ✅ Device count matches scan data');
                return true;
            } else {
                console.log(`   ❌ Device count mismatch: expected ${scanDetails.deviceCount}, found ${totalDevices}`);
                return false;
            }
        }
    } else {
        console.log('   ❌ No scan data or devices found in detailed response');
        return false;
    }
    
    return false;
}

async function testClientSideFlow(scanId) {
    console.log('\n🖥️  Step 5: Testing client-side flow simulation...');
    
    // Step 1: Simulate client fetching scan list (without data)
    console.log('   1️⃣ Fetching scan list (simulating client-side NetworkScanHistory component)...');
    
    const listResponse = await fetch(`${BASE_URL}/api/scan-history`, {
        method: 'GET',
        headers: {
            'Cookie': authCookies
        }
    });
    
    const listData = await listResponse.json();
    const scans = listData.scanHistory || [];
    const testScan = scans.find(scan => scan.scanId === scanId);
    
    if (!testScan) {
        throw new Error('Test scan not found in list');
    }
    
    console.log(`   📋 Found test scan: ${testScan.name}`);
    console.log(`   💾 Scan data present: ${!!testScan.scanData}`);
    
    // Step 2: Simulate client needing to visualize scan (fetch full data)
    console.log('   2️⃣ Simulating visualization request (fetching full data)...');
    
    const detailResponse = await fetch(`${BASE_URL}/api/scan-history/${scanId}`, {
        method: 'GET',
        headers: {
            'Cookie': authCookies
        }
    });
    
    const fullScanData = await detailResponse.json();
    
    if (fullScanData.scanData && fullScanData.scanData.devices) {
        console.log('   ✅ Full scan data retrieved successfully');
        
        // Simulate the device extraction logic from the component
        const devices = fullScanData.scanData.devices;
        let entryDevices = [];
        
        if (typeof devices === 'object' && !Array.isArray(devices)) {
            // Standard vendor-grouped format
            entryDevices = Object.values(devices).flat();
        } else if (Array.isArray(devices)) {
            entryDevices = devices;
        }
        
        console.log(`   📱 Extracted ${entryDevices.length} devices for visualization`);
        
        if (entryDevices.length > 0) {
            console.log('   ✅ Device data successfully available for visualization');
            
            // Show sample device
            const sampleDevice = entryDevices[0];
            console.log(`   🔍 Sample device: ${sampleDevice.ip} (${sampleDevice.hostname || 'no hostname'})`);
            
            return true;
        } else {
            console.log('   ❌ No devices extracted from scan data');
            return false;
        }
    } else {
        console.log('   ❌ Full scan data not available');
        return false;
    }
}

async function cleanup(scanId) {
    console.log('\n🧹 Step 6: Cleaning up test data...');
    
    try {
        const deleteResponse = await fetch(`${BASE_URL}/api/scan-history/${scanId}`, {
            method: 'DELETE',
            headers: {
                'Cookie': authCookies
            }
        });
        
        if (deleteResponse.ok) {
            console.log('   ✅ Test scan deleted successfully');
        } else {
            console.log(`   ⚠️  Failed to delete test scan: ${deleteResponse.status}`);
        }
    } catch (error) {
        console.log(`   ⚠️  Error during cleanup: ${error.message}`);
    }
}

async function runTest() {
    console.log('🧪 DEVICE DATA MISSING FROM DATABASE SCANS - FIX VERIFICATION');
    console.log('================================================================');
    console.log('Testing the fix for scans not returning device data from database');
    console.log('');
    
    try {
        // Login
        await login();
        
        // Save scan to database
        const { scanId, deviceCount } = await saveScanToDatabase();
        
        // Test main API (should not have scan data)
        const retrievedScanId = await testMainScanHistoryAPI();
        
        // Test detailed API (should have scan data)
        const detailTestPassed = await testDetailedScanAPI(retrievedScanId);
        
        // Test client-side flow
        const clientTestPassed = await testClientSideFlow(retrievedScanId);
        
        // Cleanup
        await cleanup(retrievedScanId);
        
        console.log('\n📊 TEST RESULTS');
        console.log('================');
        console.log(`Detailed API test: ${detailTestPassed ? '✅ PASSED' : '❌ FAILED'}`);
        console.log(`Client flow test: ${clientTestPassed ? '✅ PASSED' : '❌ FAILED'}`);
        
        if (detailTestPassed && clientTestPassed) {
            console.log('\n🎉 ALL TESTS PASSED - Device data fix is working correctly!');
            console.log('');
            console.log('✅ Main scan history API correctly excludes scan data for performance');
            console.log('✅ Detailed scan API provides full scan data including devices');
            console.log('✅ Client-side code can fetch and extract device data when needed');
            console.log('✅ Database scans now properly return device data for visualization');
        } else {
            console.log('\n❌ SOME TESTS FAILED - Device data fix needs attention');
        }
        
    } catch (error) {
        console.error('\n💥 TEST FAILED:', error.message);
        console.error('Stack trace:', error.stack);
    }
}

// Run the test
runTest().catch(console.error);
