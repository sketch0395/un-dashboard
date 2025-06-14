// Quick test to check why scans aren't being saved
const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

async function quickTest() {
    try {
        // 1. Test MongoDB connection
        await mongoose.connect(process.env.MONGODB_URL);
        console.log('✅ MongoDB connected');
        
        // 2. Test direct database insert
        const db = mongoose.connection.db;
        const scanHistoryCollection = db.collection('scanHistory');
        
        const testScan = {
            scanId: `quick-test-${Date.now()}`,
            name: 'Quick Database Test',
            ipRange: '192.168.1.0/24',
            deviceCount: 1,
            scanData: {
                devices: {
                    "TestVendor": [
                        { ip: '192.168.1.1', mac: '00:11:22:33:44:55', hostname: 'test-device' }
                    ]
                }
            },
            userId: new mongoose.Types.ObjectId(), // Test with dummy user ID
            createdAt: new Date(),
            updatedAt: new Date()
        };
        
        const insertResult = await scanHistoryCollection.insertOne(testScan);
        console.log('✅ Direct database insert successful:', insertResult.insertedId);
        
        // 3. Verify it was saved
        const count = await scanHistoryCollection.countDocuments();
        console.log(`📊 Total scans after insert: ${count}`);
        
        // 4. Test API endpoint
        console.log('\n🌐 Testing API endpoint...');
        
        // Import fetch dynamically
        const fetch = (await import('node-fetch')).default;
        
        // Test if API is responding
        try {
            const response = await fetch('http://localhost:3000/api/scan-history');
            console.log(`API Response Status: ${response.status}`);
            
            if (response.status === 401) {
                console.log('❌ API requires authentication');
            } else if (response.ok) {
                const data = await response.json();
                console.log('✅ API responding:', data);
            } else {
                console.log('❌ API error:', await response.text());
            }
        } catch (apiError) {
            console.log('❌ API connection failed:', apiError.message);
            
            // Try port 3001
            try {
                const response3001 = await fetch('http://localhost:3001/api/scan-history');
                console.log(`API Response Status (port 3001): ${response3001.status}`);
            } catch (e) {
                console.log('❌ Port 3001 also failed');
            }
        }
        
        await mongoose.connection.close();
        
    } catch (error) {
        console.error('❌ Test failed:', error);
    }
}

quickTest();
