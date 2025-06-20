const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

async function checkScanHistory() {
    try {
        await mongoose.connect(process.env.MONGODB_URL);
        console.log('✅ Connected to MongoDB');

        // Check scanHistory collection
        const db = mongoose.connection.db;
        const scanHistoryCollection = db.collection('scanHistory');
        
        const totalScans = await scanHistoryCollection.countDocuments();
        console.log(`📊 Total scans in database: ${totalScans}`);
        
        if (totalScans > 0) {
            console.log('\n📋 Recent scans:');
            const recentScans = await scanHistoryCollection
                .find({})
                .sort({ createdAt: -1 })
                .limit(5)
                .toArray();
                
            recentScans.forEach((scan, index) => {
                console.log(`\n${index + 1}. ${scan.name || 'Unnamed'}`);
                console.log(`   ID: ${scan._id}`);
                console.log(`   ScanId: ${scan.scanId}`);
                console.log(`   IP Range: ${scan.ipRange}`);
                console.log(`   Device Count: ${scan.deviceCount}`);
                console.log(`   Created: ${scan.createdAt}`);
                console.log(`   User: ${scan.userId || 'Unknown'}`);
                console.log(`   Has ScanData: ${!!scan.scanData}`);
                if (scan.scanData) {
                    console.log(`   Devices Structure: ${JSON.stringify(Object.keys(scan.scanData.devices || {}))}`);
                }
            });
            
            // Check for any scans without userId (potential issue)
            const scansWithoutUser = await scanHistoryCollection.countDocuments({ userId: { $exists: false } });
            if (scansWithoutUser > 0) {
                console.log(`\n⚠️  Found ${scansWithoutUser} scans without userId`);
            }
            
            // Check for recent test scans
            const testScans = await scanHistoryCollection.countDocuments({
                name: { $regex: /test|duplicate|topology/i }
            });
            console.log(`\n🧪 Test scans found: ${testScans}`);
        }
        
        await mongoose.connection.close();
        
    } catch (error) {
        console.error('❌ Error checking scan history:', error);
    }
}

checkScanHistory();
