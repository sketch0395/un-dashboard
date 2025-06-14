/**
 * Test script to verify MongoDB scan duplicate prevention and topology visualization fixes
 * on remote MongoDB server (10.5.1.212)
 */

const { MongoClient } = require('mongodb');

// Remote MongoDB connection string
const MONGODB_URL = 'mongodb://admin:un-dashboard-2024@10.5.1.212:27017/un_dashboard?authSource=admin';
const DATABASE_NAME = 'un_dashboard';
const COLLECTION_NAME = 'scanhistory';

async function testRemoteMongoDBConnection() {
    let client;
    
    try {
        console.log('🔄 Connecting to remote MongoDB at 10.5.1.212...');
        client = new MongoClient(MONGODB_URL);
        await client.connect();
        
        const db = client.db(DATABASE_NAME);
        const collection = db.collection(COLLECTION_NAME);
        
        console.log('✅ Successfully connected to remote MongoDB');
        
        // Test 1: Check existing scan data structure
        console.log('\n📊 Test 1: Analyzing existing scan data structure...');
        const existingScans = await collection.find({}).limit(5).toArray();
        
        if (existingScans.length > 0) {
            console.log(`Found ${existingScans.length} existing scans`);
            existingScans.forEach((scan, index) => {
                console.log(`\nScan ${index + 1}:`);
                console.log(`  - ID: ${scan._id}`);
                console.log(`  - scanId: ${scan.scanId || 'MISSING'}`);
                console.log(`  - timestamp: ${scan.timestamp}`);
                console.log(`  - ipRange: ${scan.ipRange}`);
                console.log(`  - devices: ${scan.devices}`);
                console.log(`  - Has scanData: ${!!scan.scanData}`);
                console.log(`  - Has scanSource: ${!!scan.scanSource}`);
                
                // Check data structure for topology visualization
                if (scan.scanData) {
                    const dataKeys = Object.keys(scan.scanData);
                    console.log(`  - scanData keys: ${dataKeys.join(', ')}`);
                    
                    // Check if it's the old format (devices property) or new format (vendor keys)
                    if (scan.scanData.devices) {
                        console.log(`  - Data format: OLD (devices array with ${scan.scanData.devices.length} items)`);
                    } else {
                        console.log(`  - Data format: NEW (vendor-based structure)`);
                        dataKeys.forEach(key => {
                            if (Array.isArray(scan.scanData[key])) {
                                console.log(`    - ${key}: ${scan.scanData[key].length} devices`);
                            }
                        });
                    }
                }
            });
        } else {
            console.log('No existing scans found in database');
        }
        
        // Test 2: Check for potential duplicates
        console.log('\n🔍 Test 2: Checking for potential duplicates...');
        const duplicateCheck = await collection.aggregate([
            {
                $group: {
                    _id: {
                        ipRange: '$ipRange',
                        devices: '$devices',
                        timestamp: '$timestamp'
                    },
                    count: { $sum: 1 },
                    scans: { $push: { _id: '$_id', scanId: '$scanId' } }
                }
            },
            {
                $match: {
                    count: { $gt: 1 }
                }
            }
        ]).toArray();
        
        if (duplicateCheck.length > 0) {
            console.log(`⚠️  Found ${duplicateCheck.length} potential duplicate groups:`);
            duplicateCheck.forEach((group, index) => {
                console.log(`\nDuplicate Group ${index + 1}:`);
                console.log(`  - IP Range: ${group._id.ipRange}`);
                console.log(`  - Devices: ${group._id.devices}`);
                console.log(`  - Timestamp: ${group._id.timestamp}`);
                console.log(`  - Count: ${group.count}`);
                console.log(`  - Scan IDs: ${group.scans.map(s => s.scanId || s._id).join(', ')}`);
            });
        } else {
            console.log('✅ No duplicates found in current database');
        }
        
        // Test 3: Verify scanId uniqueness
        console.log('\n🆔 Test 3: Verifying scanId uniqueness...');
        const scanIds = await collection.find({ scanId: { $exists: true } }).toArray();
        const uniqueScanIds = new Set(scanIds.map(scan => scan.scanId));
        
        console.log(`Total scans with scanId: ${scanIds.length}`);
        console.log(`Unique scanIds: ${uniqueScanIds.size}`);
        
        if (scanIds.length !== uniqueScanIds.size) {
            console.log('⚠️  Duplicate scanIds detected!');
            
            // Find duplicates
            const scanIdCounts = {};
            scanIds.forEach(scan => {
                scanIdCounts[scan.scanId] = (scanIdCounts[scan.scanId] || 0) + 1;
            });
            
            Object.entries(scanIdCounts).forEach(([scanId, count]) => {
                if (count > 1) {
                    console.log(`  - scanId ${scanId} appears ${count} times`);
                }
            });
        } else {
            console.log('✅ All scanIds are unique');
        }
        
        // Test 4: Check data format compatibility for topology visualization
        console.log('\n📈 Test 4: Checking topology visualization data compatibility...');
        const scansForTopology = await collection.find({}).limit(3).toArray();
        
        scansForTopology.forEach((scan, index) => {
            console.log(`\nScan ${index + 1} Topology Compatibility:`);
            console.log(`  - Has scanSource: ${!!scan.scanSource}`);
            
            if (scan.scanData) {
                let deviceCount = 0;
                let hasProperStructure = false;
                
                // Check if it matches the expected format for topology
                if (scan.scanData.devices && Array.isArray(scan.scanData.devices)) {
                    // Old format
                    deviceCount = scan.scanData.devices.length;
                    hasProperStructure = scan.scanData.devices.every(device => 
                        device.ip && device.mac && device.vendor
                    );
                    console.log(`  - Format: OLD (devices array)`);
                } else {
                    // New format (vendor-based)
                    Object.entries(scan.scanData).forEach(([vendor, devices]) => {
                        if (Array.isArray(devices)) {
                            deviceCount += devices.length;
                            hasProperStructure = devices.every(device => 
                                device.ip && device.mac
                            );
                        }
                    });
                    console.log(`  - Format: NEW (vendor-based)`);
                }
                
                console.log(`  - Device count: ${deviceCount}`);
                console.log(`  - Proper structure: ${hasProperStructure}`);
                console.log(`  - Topology ready: ${hasProperStructure && !!scan.scanSource}`);
            } else {
                console.log(`  - No scanData found`);
            }
        });
        
        console.log('\n✅ Remote MongoDB analysis complete');
        
    } catch (error) {
        console.error('❌ Error testing remote MongoDB:', error.message);
        console.error('Full error:', error);
    } finally {
        if (client) {
            await client.close();
            console.log('🔐 MongoDB connection closed');
        }
    }
}

// Run the test
if (require.main === module) {
    testRemoteMongoDBConnection();
}

module.exports = { testRemoteMongoDBConnection };
