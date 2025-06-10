/**
 * Manual scan data insertion for testing the device data fix
 */

import { MongoClient } from 'mongodb';
import { config } from 'dotenv';

config();

async function insertTestScan() {
    const client = new MongoClient(process.env.MONGODB_URL);
    
    try {
        await client.connect();
        console.log('Connected to MongoDB');
        
        const db = client.db();
        const collection = db.collection('scanhistories');
        
        // Delete any existing test scans first
        await collection.deleteMany({ name: { $regex: /test/i } });
        console.log('Cleared existing test scans');
        
        // Insert a realistic test scan
        const testScan = {
            name: 'Test Network Scan - Device Fix Verification',
            date: new Date().toISOString(),
            type: 'network',
            devices: 3,
            isFromDatabase: true,
            scanData: {
                devices: [
                    {
                        ip: '192.168.1.1',
                        status: 'up',
                        vendor: 'Cisco Systems, Inc.',
                        responseTime: 12,
                        lastSeen: new Date().toISOString(),
                        name: 'Router'
                    },
                    {
                        ip: '192.168.1.100',
                        status: 'up', 
                        vendor: 'Apple, Inc.',
                        responseTime: 8,
                        lastSeen: new Date().toISOString(),
                        name: 'MacBook Pro'
                    },
                    {
                        ip: '192.168.1.150',
                        status: 'up',
                        vendor: 'Unknown',
                        responseTime: 25,
                        lastSeen: new Date().toISOString()
                    }
                ]
            },
            user: 'admin',
            createdAt: new Date(),
            updatedAt: new Date()
        };
        
        const result = await collection.insertOne(testScan);
        console.log('✅ Inserted test scan with ID:', result.insertedId.toString());
        
        // Verify the insertion
        const saved = await collection.findOne({ _id: result.insertedId });
        console.log('📊 Verification:');
        console.log('- Name:', saved.name);
        console.log('- Device count:', saved.devices);
        console.log('- Has scanData:', !!saved.scanData);
        console.log('- Devices in scanData:', saved.scanData.devices.length);
        
        // Test the extraction logic
        const extracted = Object.values(saved.scanData || {}).flat();
        console.log('- Extracted devices:', extracted.length);
        console.log('- First device IP:', extracted[0]?.ip);
        
        console.log('\\n🎯 Test scan ready! Now check the browser at http://localhost:3000/networkscan');
        
    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await client.close();
    }
}

insertTestScan();
