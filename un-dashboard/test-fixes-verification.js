/**
 * Test script to verify the fixes for:
 * 1. MongoDB scan duplicates prevention
 * 2. Topology visualization for database scans
 */

const { MongoClient } = require('mongodb');

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const DB_NAME = 'nexus_control';

async function connectToMongoDB() {
    const client = new MongoClient(MONGODB_URI);
    await client.connect();
    console.log('✓ Connected to MongoDB');
    return client.db(DB_NAME);
}

async function testDuplicatePrevention() {
    console.log('\n=== Testing Duplicate Prevention ===');
    
    const db = await connectToMongoDB();
    const scanHistoryCollection = db.collection('scanHistory');
    
    // Check current scan count
    const initialCount = await scanHistoryCollection.countDocuments();
    console.log(`Initial scan count in database: ${initialCount}`);
    
    // Look for potential duplicates in database
    const pipeline = [
        {
            $group: {
                _id: {
                    ipRange: "$scanData.ipRange",
                    deviceCount: "$scanData.devices",
                    timestamp: {
                        $dateToString: {
                            format: "%Y-%m-%d %H:%M",
                            date: "$timestamp"
                        }
                    }
                },
                count: { $sum: 1 },
                docs: { $push: "$$ROOT" }
            }
        },
        {
            $match: {
                count: { $gt: 1 }
            }
        }
    ];
    
    const duplicates = await scanHistoryCollection.aggregate(pipeline).toArray();
    
    if (duplicates.length > 0) {
        console.log(`⚠️  Found ${duplicates.length} potential duplicate groups:`);
        duplicates.forEach((dup, index) => {
            console.log(`  Group ${index + 1}: ${dup.count} scans with same ipRange/deviceCount/time`);
            console.log(`    IP Range: ${dup._id.ipRange}`);
            console.log(`    Device Count: ${dup._id.deviceCount}`);
            console.log(`    Timestamp: ${dup._id.timestamp}`);
            dup.docs.forEach((doc, docIndex) => {
                console.log(`      Scan ${docIndex + 1}: ID ${doc._id}, scanId: ${doc.scanId}`);
            });
        });
    } else {
        console.log('✓ No duplicate groups found in database');
    }
    
    return duplicates.length;
}

async function testDatabaseScanFormat() {
    console.log('\n=== Testing Database Scan Format ===');
    
    const db = await connectToMongoDB();
    const scanHistoryCollection = db.collection('scanHistory');
    
    // Get the most recent scan
    const recentScans = await scanHistoryCollection.find()
        .sort({ timestamp: -1 })
        .limit(3)
        .toArray();
    
    if (recentScans.length === 0) {
        console.log('⚠️  No scans found in database');
        return false;
    }
    
    console.log(`Found ${recentScans.length} recent scans to test:`);
    
    let allScansPassed = true;
    
    recentScans.forEach((scan, index) => {
        console.log(`\nScan ${index + 1}:`);
        console.log(`  ID: ${scan._id}`);
        console.log(`  ScanId: ${scan.scanId}`);
        console.log(`  Timestamp: ${scan.timestamp}`);
        console.log(`  User ID: ${scan.userId}`);
        
        // Check scanData structure
        if (!scan.scanData) {
            console.log('  ❌ Missing scanData');
            allScansPassed = false;
            return;
        }
        
        console.log(`  IP Range: ${scan.scanData.ipRange}`);
        console.log(`  Device Count: ${scan.scanData.devices}`);
        
        // Check if data structure exists
        if (!scan.scanData.data) {
            console.log('  ❌ Missing scanData.data');
            allScansPassed = false;
            return;
        }
        
        // Analyze data structure for topology compatibility
        const data = scan.scanData.data;
        if (typeof data === 'object' && data !== null) {
            const dataKeys = Object.keys(data);
            console.log(`  Data structure: ${dataKeys.length} vendor keys: ${dataKeys.slice(0, 3).join(', ')}${dataKeys.length > 3 ? '...' : ''}`);
            
            // Check if it has the vendor -> devices structure needed for topology
            let hasVendorStructure = false;
            let totalDevices = 0;
            
            dataKeys.forEach(key => {
                if (Array.isArray(data[key])) {
                    hasVendorStructure = true;
                    totalDevices += data[key].length;
                }
            });
            
            if (hasVendorStructure) {
                console.log(`  ✓ Compatible vendor structure with ${totalDevices} total devices`);
                
                // Check if devices have required fields for topology
                const firstVendor = dataKeys[0];
                if (data[firstVendor] && data[firstVendor][0]) {
                    const sampleDevice = data[firstVendor][0];
                    const requiredFields = ['ip', 'hostname', 'vendor'];
                    const missingFields = requiredFields.filter(field => !sampleDevice[field]);
                    
                    if (missingFields.length === 0) {
                        console.log(`  ✓ Sample device has required fields for topology`);
                    } else {
                        console.log(`  ⚠️  Sample device missing fields: ${missingFields.join(', ')}`);
                    }
                }
            } else {
                console.log(`  ❌ Data structure not compatible with topology visualization`);
                allScansPassed = false;
            }
        } else {
            console.log(`  ❌ Invalid data structure: ${typeof data}`);
            allScansPassed = false;
        }
    });
    
    return allScansPassed;
}

async function testScanIdGeneration() {
    console.log('\n=== Testing ScanId Generation ===');
    
    const db = await connectToMongoDB();
    const scanHistoryCollection = db.collection('scanHistory');
    
    // Check recent scans for scanId presence
    const recentScans = await scanHistoryCollection.find()
        .sort({ timestamp: -1 })
        .limit(10)
        .toArray();
    
    let scansWithoutScanId = 0;
    let scansWithScanId = 0;
    
    recentScans.forEach(scan => {
        if (scan.scanId) {
            scansWithScanId++;
        } else {
            scansWithoutScanId++;
        }
    });
    
    console.log(`Recent scans analysis:`);
    console.log(`  ✓ Scans with scanId: ${scansWithScanId}`);
    console.log(`  ❌ Scans without scanId: ${scansWithoutScanId}`);
    
    if (scansWithoutScanId > 0) {
        console.log(`  ⚠️  ${scansWithoutScanId} scans found without scanId (likely older scans)`);
    }
    
    return scansWithoutScanId === 0;
}

async function main() {
    try {
        console.log('🧪 Starting fixes verification test...');
        
        const duplicateCount = await testDuplicatePrevention();
        const formatCompatible = await testDatabaseScanFormat();
        const scanIdPresent = await testScanIdGeneration();
        
        console.log('\n=== SUMMARY ===');
        console.log(`Duplicate groups found: ${duplicateCount}`);
        console.log(`Database scan format compatible: ${formatCompatible ? 'YES' : 'NO'}`);
        console.log(`Recent scans have scanId: ${scanIdPresent ? 'YES' : 'NO'}`);
        
        if (duplicateCount === 0 && formatCompatible && scanIdPresent) {
            console.log('\n✅ All tests passed! Fixes appear to be working correctly.');
        } else {
            console.log('\n⚠️  Some issues detected. May need additional testing with new scans.');
        }
        
        console.log('\n📋 Next steps:');
        console.log('1. Perform a new network scan to test duplicate prevention');
        console.log('2. Try visualizing a database scan on topology to test data format compatibility');
        console.log('3. Monitor console logs for any race condition issues');
        
    } catch (error) {
        console.error('❌ Test failed:', error);
    }
    
    process.exit(0);
}

main();
