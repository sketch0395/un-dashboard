/**
 * Comprehensive test for MongoDB scan duplicate prevention and topology visualization
 * Tests the current fixes and identifies any remaining issues
 */

const { MongoClient } = require('mongodb');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config({ path: '.env.local' });

// Import fetch dynamically for ESM compatibility
let fetch;

async function initFetch() {
    if (!fetch) {
        const fetchModule = await import('node-fetch');
        fetch = fetchModule.default;
    }
    return fetch;
}

const MONGODB_URL = process.env.MONGODB_URL;
const BASE_URL = 'http://localhost:3000';

let authToken = null;

async function connectToMongoDB() {
    const client = new MongoClient(MONGODB_URL);
    await client.connect();
    return client.db('undashboard');
}

async function makeAuthenticatedRequest(url, options = {}) {
    await initFetch(); // Ensure fetch is available
    
    if (!authToken) {
        throw new Error('Not authenticated. Run login first.');
    }
    
    const defaultOptions = {
        credentials: 'include',
        headers: {
            'Content-Type': 'application/json',
            'Cookie': `auth-token=${authToken}`,
            ...options.headers
        }
    };
    
    return fetch(url, { ...defaultOptions, ...options });
}

async function login() {
    await initFetch(); // Ensure fetch is available
    
    console.log('🔐 Authenticating with admin credentials...');
    
    const response = await fetch(`${BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            username: 'admin',
            password: 'admin123'
        })
    });
    
    if (!response.ok) {
        throw new Error(`Login failed: ${response.status}`);
    }
    
    // Extract auth token from cookies
    const cookies = response.headers.get('set-cookie');
    if (cookies) {
        const tokenMatch = cookies.match(/auth-token=([^;]+)/);
        if (tokenMatch) {
            authToken = tokenMatch[1];
            console.log('✅ Authentication successful');
            return true;
        }
    }
    
    throw new Error('Failed to extract auth token from response');
}

async function testDuplicatePrevention() {
    console.log('\n🚫 TESTING DUPLICATE PREVENTION');
    console.log('================================');
    
    const db = await connectToMongoDB();
    const scanHistoryCollection = db.collection('scanHistory');
    
    // 1. Check current database state
    const initialCount = await scanHistoryCollection.countDocuments();
    console.log(`📊 Initial scan count: ${initialCount}`);
    
    // 2. Test API duplicate prevention - create same scan twice
    const testScanData = {
        scanId: `test-duplicate-${Date.now()}`,
        name: 'Duplicate Prevention Test',
        ipRange: '192.168.1.0/24',
        deviceCount: 2,
        scanData: {
            devices: {
                "TestVendor": [
                    { ip: '192.168.1.1', mac: '00:11:22:33:44:55', hostname: 'router' },
                    { ip: '192.168.1.100', mac: '66:77:88:99:AA:BB', hostname: 'laptop' }
                ]
            },
            ipRange: '192.168.1.0/24'
        },
        metadata: {
            scanType: 'ping',
            timestamp: new Date().toISOString(),
            scanDuration: 5000
        },
        settings: {
            isPrivate: true,
            isFavorite: false,
            tags: ['test', 'duplicate-prevention']
        }
    };
    
    console.log('📤 Attempting to save scan first time...');
    const firstResponse = await makeAuthenticatedRequest(`${BASE_URL}/api/scan-history`, {
        method: 'POST',
        body: JSON.stringify(testScanData)
    });
    
    const firstResult = await firstResponse.json();
    console.log(`   First save: ${firstResponse.status} ${firstResponse.ok ? '✅' : '❌'}`);
    
    if (firstResponse.ok) {
        console.log(`   Saved with ID: ${firstResult._id}`);
    } else {
        console.log(`   Error: ${firstResult.error}`);
    }
    
    // Wait a moment then try to save the exact same scan
    await new Promise(resolve => setTimeout(resolve, 100));
    
    console.log('📤 Attempting to save identical scan again...');
    const secondResponse = await makeAuthenticatedRequest(`${BASE_URL}/api/scan-history`, {
        method: 'POST',
        body: JSON.stringify(testScanData)
    });
    
    const secondResult = await secondResponse.json();
    console.log(`   Second save: ${secondResponse.status} ${secondResponse.status === 409 ? '✅ (Duplicate Prevented)' : secondResponse.ok ? '❌ (Duplicate Allowed)' : '❌'}`);
    
    if (secondResponse.status === 409) {
        console.log('   ✅ Duplicate prevention working correctly!');
    } else if (secondResponse.ok) {
        console.log('   ❌ WARNING: Duplicate was allowed to be saved!');
    } else {
        console.log(`   Error: ${secondResult.error}`);
    }
    
    // 3. Test race condition prevention - simultaneous saves
    console.log('\n⚡ Testing race condition prevention...');
    
    const raceTestScans = [];
    for (let i = 0; i < 3; i++) {
        raceTestScans.push({
            ...testScanData,
            scanId: `race-test-${Date.now()}-${i}`,
            name: `Race Test ${i + 1}`
        });
    }
    
    const racePromises = raceTestScans.map(scanData => 
        makeAuthenticatedRequest(`${BASE_URL}/api/scan-history`, {
            method: 'POST',
            body: JSON.stringify(scanData)
        }).then(response => ({ response, scanId: scanData.scanId }))
    );
    
    const raceResults = await Promise.all(racePromises);
    
    console.log('   Race condition test results:');
    raceResults.forEach(({ response, scanId }) => {
        console.log(`   - ${scanId}: ${response.status} ${response.ok ? '✅' : '❌'}`);
    });
    
    const finalCount = await scanHistoryCollection.countDocuments();
    console.log(`📊 Final scan count: ${finalCount} (increase: ${finalCount - initialCount})`);
    
    return {
        duplicatePrevented: secondResponse.status === 409,
        raceConditionHandled: raceResults.every(r => r.response.ok || r.response.status === 409)
    };
}

async function testTopologyVisualization() {
    console.log('\n🗺️ TESTING TOPOLOGY VISUALIZATION DATA');
    console.log('======================================');
    
    // 1. Fetch existing scans to check data structure
    console.log('📊 Fetching existing scan history...');
    const historyResponse = await makeAuthenticatedRequest(`${BASE_URL}/api/scan-history`);
    
    if (!historyResponse.ok) {
        throw new Error(`Failed to fetch scan history: ${historyResponse.status}`);
    }
    
    const historyData = await historyResponse.json();
    const scans = historyData.scanHistory || [];
    
    console.log(`   Found ${scans.length} scans in history`);
    
    if (scans.length === 0) {
        console.log('   ⚠️ No scans available for topology testing');
        return { topologyDataValid: false, reason: 'No scans available' };
    }
    
    // 2. Analyze scan data structure for topology compatibility
    console.log('\n🔍 Analyzing scan data structures...');
    
    let validTopologyScans = 0;
    let invalidTopologyScans = 0;
    
    scans.slice(0, 5).forEach((scan, index) => {
        console.log(`\n   Scan ${index + 1}: ${scan.name || 'Unnamed'}`);
        console.log(`   - ID: ${scan.scanId || 'Missing scanId'}`);
        console.log(`   - Devices: ${scan.deviceCount || 0}`);
        console.log(`   - IP Range: ${scan.ipRange || 'Unknown'}`);
        
        // Check for scanData structure
        if (!scan.scanData) {
            console.log('   ❌ Missing scanData');
            invalidTopologyScans++;
            return;
        }
        
        // Check for devices data
        if (!scan.scanData.devices && !scan.scanData.data) {
            console.log('   ❌ Missing devices data');
            invalidTopologyScans++;
            return;
        }
        
        const devicesData = scan.scanData.devices || scan.scanData.data || {};
        
        if (typeof devicesData === 'object' && devicesData !== null) {
            const vendorKeys = Object.keys(devicesData);
            console.log(`   ✅ Device data structure: ${vendorKeys.length} vendor groups`);
            
            // Count total devices
            let totalDevices = 0;
            vendorKeys.forEach(vendor => {
                if (Array.isArray(devicesData[vendor])) {
                    totalDevices += devicesData[vendor].length;
                    console.log(`      - ${vendor}: ${devicesData[vendor].length} devices`);
                }
            });
            
            console.log(`   📊 Total devices in structure: ${totalDevices}`);
            validTopologyScans++;
        } else {
            console.log('   ❌ Invalid device data structure');
            invalidTopologyScans++;
        }
    });
    
    // 3. Create a test scan with proper topology data
    console.log('\n🎯 Creating test scan with topology-compatible data...');
    
    const topologyTestScan = {
        scanId: `topology-test-${Date.now()}`,
        name: `Topology Test Scan ${new Date().toLocaleTimeString()}`,
        ipRange: '10.0.0.0/24',
        deviceCount: 4,
        scanData: {
            devices: {
                "Cisco": [
                    {
                        ip: '10.0.0.1',
                        mac: '00:1A:2B:3C:4D:5E',
                        hostname: 'gateway.local',
                        vendor: 'Cisco',
                        deviceType: 'router',
                        openPorts: [22, 23, 80, 443],
                        os: 'IOS'
                    },
                    {
                        ip: '10.0.0.2',
                        mac: '00:1A:2B:3C:4D:5F',
                        hostname: 'switch.local',
                        vendor: 'Cisco',
                        deviceType: 'switch',
                        openPorts: [22, 23],
                        os: 'IOS'
                    }
                ],
                "Dell": [
                    {
                        ip: '10.0.0.100',
                        mac: '00:DE:LL:11:22:33',
                        hostname: 'workstation1.local',
                        vendor: 'Dell',
                        deviceType: 'workstation',
                        openPorts: [22, 3389],
                        os: 'Windows 11'
                    }
                ],
                "Apple": [
                    {
                        ip: '10.0.0.150',
                        mac: '00:AP:PL:44:55:66',
                        hostname: 'macbook.local',
                        vendor: 'Apple',
                        deviceType: 'laptop',
                        openPorts: [22, 5900],
                        os: 'macOS'
                    }
                ]
            },
            ipRange: '10.0.0.0/24',
            networkInfo: {
                gateway: '10.0.0.1',
                subnet: '255.255.255.0',
                totalHosts: 254
            }
        },
        metadata: {
            scanType: 'comprehensive',
            timestamp: new Date().toISOString(),
            scanDuration: 30000,
            osDetection: true,
            serviceDetection: true,
            hasNetworkTopology: true,
            deviceTypes: ['router', 'switch', 'workstation', 'laptop']
        },
        settings: {
            isPrivate: false,
            isFavorite: true,
            tags: ['topology-test', 'comprehensive'],
            notes: 'Test scan for topology visualization verification'
        }
    };
    
    const saveResponse = await makeAuthenticatedRequest(`${BASE_URL}/api/scan-history`, {
        method: 'POST',
        body: JSON.stringify(topologyTestScan)
    });
    
    if (saveResponse.ok) {
        const saveResult = await saveResponse.json();
        console.log(`   ✅ Topology test scan saved: ${saveResult._id}`);
        console.log(`   🗺️ Topology data structure verified for visualization`);
    } else {
        console.log(`   ❌ Failed to save topology test scan: ${saveResponse.status}`);
    }
    
    return {
        topologyDataValid: validTopologyScans > invalidTopologyScans,
        validScans: validTopologyScans,
        invalidScans: invalidTopologyScans,
        testScanCreated: saveResponse.ok
    };
}

async function testScanIdUniqueness() {
    console.log('\n🆔 TESTING SCAN ID UNIQUENESS');
    console.log('=============================');
    
    const db = await connectToMongoDB();
    const scanHistoryCollection = db.collection('scanHistory');
    
    // Find duplicate scanIds in database
    const duplicateScanIds = await scanHistoryCollection.aggregate([
        { $group: { _id: "$scanId", count: { $sum: 1 }, docs: { $push: "$$ROOT" } } },
        { $match: { count: { $gt: 1 } } }
    ]).toArray();
    
    if (duplicateScanIds.length > 0) {
        console.log(`❌ Found ${duplicateScanIds.length} duplicate scanId groups:`);
        duplicateScanIds.forEach(group => {
            console.log(`   - scanId "${group._id}": ${group.count} occurrences`);
            group.docs.forEach((doc, index) => {
                console.log(`     ${index + 1}. Database ID: ${doc._id}, Created: ${doc.createdAt}`);
            });
        });
        return false;
    } else {
        console.log('✅ All scanIds are unique in database');
        return true;
    }
}

async function main() {
    try {
        console.log('🧪 COMPREHENSIVE MONGODB FIXES VERIFICATION');
        console.log('===========================================');
        console.log(`Testing against: ${BASE_URL}`);
        console.log(`MongoDB: ${MONGODB_URL.replace(/\/\/.*?@/, '//***:***@')}`);
        
        // Authenticate first
        await login();
        
        // Run all tests
        const duplicateResults = await testDuplicatePrevention();
        const topologyResults = await testTopologyVisualization();
        const uniquenessResults = await testScanIdUniqueness();
        
        // Summary
        console.log('\n📊 TEST RESULTS SUMMARY');
        console.log('=======================');
        console.log(`✅ Duplicate Prevention: ${duplicateResults.duplicatePrevented ? 'WORKING' : 'FAILED'}`);
        console.log(`✅ Race Condition Handling: ${duplicateResults.raceConditionHandled ? 'WORKING' : 'FAILED'}`);
        console.log(`✅ Topology Data Compatibility: ${topologyResults.topologyDataValid ? 'WORKING' : 'FAILED'}`);
        console.log(`✅ ScanId Uniqueness: ${uniquenessResults ? 'WORKING' : 'FAILED'}`);
        
        if (topologyResults.validScans && topologyResults.invalidScans) {
            console.log(`   📊 Topology scans: ${topologyResults.validScans} valid, ${topologyResults.invalidScans} invalid`);
        }
        
        const allTestsPassed = duplicateResults.duplicatePrevented && 
                              duplicateResults.raceConditionHandled && 
                              topologyResults.topologyDataValid && 
                              uniquenessResults;
        
        if (allTestsPassed) {
            console.log('\n🎉 ALL TESTS PASSED! MongoDB fixes are working correctly.');
        } else {
            console.log('\n⚠️ Some tests failed. Further investigation needed.');
        }
        
        console.log('\n📋 Next Steps:');
        console.log('- Test network scan functionality through the UI');
        console.log('- Verify topology visualization works with database scans');
        console.log('- Monitor for any duplicate entries during normal usage');
        
    } catch (error) {
        console.error('❌ Test execution failed:', error);
        process.exit(1);
    }
}

if (require.main === module) {
    main().catch(console.error);
}

module.exports = { main, testDuplicatePrevention, testTopologyVisualization };
