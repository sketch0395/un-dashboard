/**
 * Insert test scan using mongoose (used by the app)
 */

import mongoose from 'mongoose';
import { config } from 'dotenv';

config();

// Define the scan schema to match the app
const scanHistorySchema = new mongoose.Schema({
    name: String,
    date: String,
    type: String,
    devices: Number,
    scanData: mongoose.Schema.Types.Mixed,
    user: String,
    isFromDatabase: { type: Boolean, default: true }
}, { 
    timestamps: true,
    collection: 'scanhistories'  // Ensure we use the correct collection name
});

const ScanHistory = mongoose.model('ScanHistory', scanHistorySchema);

async function insertTestData() {
    try {
        console.log('🔌 Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URL);
        console.log('✅ Connected via Mongoose');
        
        // Clear existing test data
        await ScanHistory.deleteMany({ name: /Test.*Scan/i });
        console.log('🧹 Cleared existing test scans');
        
        // Create test scan with device data
        const testScan = new ScanHistory({
            name: 'Test Network Scan - Fix Verification',
            date: new Date().toISOString(),
            type: 'network',
            devices: 3,
            scanData: {
                devices: [
                    {
                        ip: '192.168.1.1',
                        status: 'up',
                        vendor: 'Cisco Systems',
                        responseTime: 12,
                        lastSeen: new Date().toISOString(),
                        name: 'Gateway Router'
                    },
                    {
                        ip: '192.168.1.100',
                        status: 'up',
                        vendor: 'Apple Inc',
                        responseTime: 8,
                        lastSeen: new Date().toISOString(),
                        name: 'MacBook Pro'
                    },
                    {
                        ip: '192.168.1.150',
                        status: 'up',
                        vendor: 'Unknown',
                        responseTime: 25,
                        lastSeen: new Date().toISOString(),
                        name: 'Unknown Device'
                    }
                ]
            },
            user: 'admin',
            isFromDatabase: true
        });
        
        const saved = await testScan.save();
        console.log('✅ Test scan saved with ID:', saved._id.toString());
        
        // Verify the save
        const found = await ScanHistory.findById(saved._id);
        console.log('📊 Verification:');
        console.log('  - Name:', found.name);
        console.log('  - Device count:', found.devices);
        console.log('  - Has scanData:', !!found.scanData);
        console.log('  - Devices in scanData:', found.scanData?.devices?.length || 0);
        
        if (found.scanData?.devices) {
            console.log('  - First device:', {
                ip: found.scanData.devices[0].ip,
                status: found.scanData.devices[0].status,
                vendor: found.scanData.devices[0].vendor
            });
        }
        
        // Test UI extraction logic
        const extracted = Object.values(found.scanData || {}).flat();
        console.log('  - UI extraction result:', extracted.length, 'devices');
        
        console.log('\\n🎯 SUCCESS! Test data inserted.');
        console.log('🌐 Now open http://localhost:3000/networkscan to test the fix!');
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await mongoose.disconnect();
        console.log('🔌 Disconnected');
    }
}

insertTestData();
