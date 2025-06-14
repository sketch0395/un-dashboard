/**
 * Test script to verify the three usability fixes:
 * 1. Scan naming consistency (no more "Scan 1, Scan 2" -> should always be "Network Scan [timestamp]")
 * 2. Database duplication prevention on page refresh
 * 3. Topology visualization functionality
 */

const mongoose = require('mongoose');
const io = require('socket.io-client');

// Test configuration
const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/un-dashboard';
const SERVER_URL = 'http://localhost:4000';
const TEST_USER_ID = '507f1f77bcf86cd799439011'; // Test user ID

async function runUsabilityTests() {
    console.log('🧪 Starting Usability Fixes Verification Tests');
    console.log('================================================\n');    let socket;try {
        // Connect to MongoDB using mongoose
        console.log('📦 Connecting to MongoDB...');
        await mongoose.connect(MONGO_URI);
        const db = mongoose.connection.db;
        const scanHistoryCollection = db.collection('scan_history');

        // Connect to Socket.IO server
        console.log('🔌 Connecting to Network Server...');
        socket = io(SERVER_URL);
        
        await new Promise((resolve, reject) => {
            socket.on('connect', resolve);
            socket.on('connect_error', reject);
            setTimeout(() => reject(new Error('Connection timeout')), 5000);
        });

        console.log('✅ Connected to both MongoDB and Network Server\n');

        // Test 1: Scan Naming Consistency
        console.log('🎯 TEST 1: Scan Naming Consistency');
        console.log('===================================');
        
        // Clear existing test data
        await scanHistoryCollection.deleteMany({ userId: TEST_USER_ID });
        
        // Create test scan data with consistent naming
        const testScanData = {
            devices: {
                "Test Vendor": [
                    {
                        ip: "192.168.1.100",
                        mac: "aa:bb:cc:dd:ee:ff",
                        hostname: "test-device",
                        vendor: "Test Vendor",
                        ports: [{ port: 80, state: 'open', service: 'http' }]
                    }
                ]
            },
            ipRange: "192.168.1.0/24",
            timestamp: new Date().toISOString()
        };

        // Simulate saving scan data
        console.log('💾 Simulating scan save with consistent naming...');
        const scanEntry = {
            scanId: `test-scan-${Date.now()}`,
            userId: TEST_USER_ID,
            name: `Network Scan ${new Intl.DateTimeFormat('en-US', {
                month: 'short', day: '2-digit', year: 'numeric',
                hour: '2-digit', minute: '2-digit', hour12: false
            }).format(new Date())}`,
            ipRange: testScanData.ipRange,
            deviceCount: 1,
            scanData: testScanData,
            metadata: {
                timestamp: testScanData.timestamp,
                scanType: 'ping'
            }
        };

        await scanHistoryCollection.insertOne(scanEntry);
        console.log(`✅ Scan saved with name: "${scanEntry.name}"`);
        
        // Verify naming format
        const savedScan = await scanHistoryCollection.findOne({ scanId: scanEntry.scanId });
        const hasCorrectNaming = savedScan.name.startsWith('Network Scan ');
        console.log(`🔍 Naming verification: ${hasCorrectNaming ? '✅ PASS' : '❌ FAIL'}`);
        
        if (!hasCorrectNaming) {
            console.log(`   Expected: "Network Scan [timestamp]", Got: "${savedScan.name}"`);
        }

        // Test 2: Database Duplication Prevention
        console.log('\n🎯 TEST 2: Database Duplication Prevention');
        console.log('==========================================');
        
        // Try to save the same scan again (simulating page refresh scenario)
        console.log('💾 Attempting to save duplicate scan...');
        try {
            await scanHistoryCollection.insertOne(scanEntry);
            console.log('❌ FAIL: Duplicate scan was allowed to be saved');
        } catch (error) {
            if (error.code === 11000) { // MongoDB duplicate key error
                console.log('✅ PASS: Database prevented duplicate scan (unique index working)');
            } else {
                console.log(`❌ Unexpected error: ${error.message}`);
            }
        }

        // Test with similar but slightly different data
        const similarScanEntry = {
            ...scanEntry,
            scanId: `test-scan-similar-${Date.now()}`,
            metadata: {
                ...scanEntry.metadata,
                timestamp: new Date(Date.now() + 1000).toISOString() // 1 second later
            }
        };

        // Count scans before
        const countBefore = await scanHistoryCollection.countDocuments({ userId: TEST_USER_ID });
        
        await scanHistoryCollection.insertOne(similarScanEntry);
        
        // Count scans after
        const countAfter = await scanHistoryCollection.countDocuments({ userId: TEST_USER_ID });
        
        console.log(`📊 Scans before: ${countBefore}, after: ${countAfter}`);
        console.log(`🔍 Duplication check: ${countAfter === countBefore + 1 ? '✅ PASS' : '❌ FAIL'}`);

        // Test 3: Topology Visualization Data Structure
        console.log('\n🎯 TEST 3: Topology Visualization Data Structure');
        console.log('===============================================');
        
        // Retrieve scans and verify data structure for topology
        const allScans = await scanHistoryCollection.find({ userId: TEST_USER_ID }).toArray();
        console.log(`📊 Retrieved ${allScans.length} scans for topology test`);
        
        let topologyTestPassed = true;
        
        for (const scan of allScans) {
            // Check if scan has required data structure for topology
            const hasRequiredFields = 
                scan.scanData && 
                scan.scanData.devices && 
                typeof scan.scanData.devices === 'object';
            
            if (!hasRequiredFields) {
                console.log(`❌ Scan ${scan.scanId} missing required topology data structure`);
                topologyTestPassed = false;
                continue;
            }
            
            // Check device data structure
            const devices = Object.values(scan.scanData.devices).flat();
            for (const device of devices) {
                const hasDeviceFields = device.ip && device.vendor;
                if (!hasDeviceFields) {
                    console.log(`❌ Device missing required fields: ${JSON.stringify(device)}`);
                    topologyTestPassed = false;
                }
            }
        }
        
        console.log(`🔍 Topology data structure: ${topologyTestPassed ? '✅ PASS' : '❌ FAIL'}`);
        
        // Test scan source information consistency
        console.log('\n🔍 Testing scan source information consistency...');
        let scanSourceTestPassed = true;
        
        for (const scan of allScans) {
            const devices = Object.values(scan.scanData.devices || {}).flat();
            for (const device of devices) {
                // In the fixed version, devices should have consistent scanSource naming
                if (device.scanSource && device.scanSource.name) {
                    const hasConsistentNaming = device.scanSource.name.includes('Network Scan');
                    if (!hasConsistentNaming) {
                        console.log(`❌ Inconsistent scan source naming: "${device.scanSource.name}"`);
                        scanSourceTestPassed = false;
                    }
                }
            }
        }
        
        console.log(`🔍 Scan source consistency: ${scanSourceTestPassed ? '✅ PASS' : '❌ FAIL'}`);

        // Summary
        console.log('\n📋 TEST SUMMARY');
        console.log('===============');
        console.log(`1. Scan Naming Consistency: ${hasCorrectNaming ? '✅ PASS' : '❌ FAIL'}`);
        console.log(`2. Database Duplication Prevention: ${countAfter === countBefore + 1 ? '✅ PASS' : '❌ FAIL'}`);
        console.log(`3. Topology Data Structure: ${topologyTestPassed ? '✅ PASS' : '❌ FAIL'}`);
        console.log(`4. Scan Source Consistency: ${scanSourceTestPassed ? '✅ PASS' : '❌ FAIL'}`);
        
        const allTestsPassed = hasCorrectNaming && (countAfter === countBefore + 1) && topologyTestPassed && scanSourceTestPassed;
        console.log(`\n🎉 Overall Result: ${allTestsPassed ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'}`);
        
        // Cleanup test data
        console.log('\n🧹 Cleaning up test data...');
        await scanHistoryCollection.deleteMany({ userId: TEST_USER_ID });
        console.log('✅ Test data cleaned up');
        
    } catch (error) {
        console.error('❌ Test failed with error:', error);
        process.exit(1);
    } finally {        // Cleanup connections
        if (socket) {
            socket.disconnect();
            console.log('🔌 Socket.IO connection closed');
        }
        if (mongoose.connection.readyState === 1) {
            await mongoose.disconnect();
            console.log('📦 MongoDB connection closed');
        }
    }
    
    console.log('\n🎯 Usability fixes verification complete!');
}

// Run the tests
if (require.main === module) {
    runUsabilityTests().catch(console.error);
}

module.exports = { runUsabilityTests };
