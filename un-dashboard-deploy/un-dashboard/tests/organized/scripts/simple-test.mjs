import { MongoClient } from 'mongodb';
import { config } from 'dotenv';

// Load environment variables
config();

const MONGODB_URI = process.env.MONGODB_URL || 'mongodb://localhost:27017/un-dashboard';

async function runTest() {
    console.log('🧪 DEVICE DATA VERIFICATION TEST');
    console.log('================================');
    
    const client = new MongoClient(MONGODB_URI);
    
    try {
        await client.connect();
        console.log('✅ Connected to MongoDB');
        
        const db = client.db();
        const collection = db.collection('scanhistories');
        
        // Create test scan
        const testScan = {
            name: 'Device Verification Test',
            date: new Date().toISOString(),
            type: 'network',
            devices: 2,
            scanData: {
                devices: [
                    { ip: '192.168.1.1', status: 'up', vendor: 'Test Vendor 1' },
                    { ip: '192.168.1.2', status: 'up', vendor: 'Test Vendor 2' }
                ]
            }
        };
        
        const result = await collection.insertOne(testScan);
        console.log('📝 Created test scan:', result.insertedId);
        
        // Test device extraction
        const saved = await collection.findOne({ _id: result.insertedId });
        const devices = Object.values(saved.scanData || {}).flat();
        console.log('📱 Extracted devices:', devices.length);
        console.log('🎯 Test successful - devices found:', devices.map(d => d.ip));
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await client.close();
        console.log('🔌 Disconnected');
    }
}

runTest();
