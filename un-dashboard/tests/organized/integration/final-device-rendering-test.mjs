#!/usr/bin/env node

/**
 * Final Device Rendering Test
 * Tests the complete device data flow from database to UI rendering
 */

import { MongoClient } from 'mongodb';
import 'dotenv/config';

const MONGODB_URI = process.env.MONGODB_URL || process.env.MONGODB_URI || 'mongodb://localhost:27017/un-dashboard';

async function testDeviceRendering() {
    console.log('🧪 FINAL DEVICE RENDERING TEST');
    console.log('===============================');
    
    let client;
    try {
        // Connect to MongoDB
        console.log('🔌 Connecting to MongoDB...');
        client = new MongoClient(MONGODB_URI);
        await client.connect();
        console.log('✅ Connected to MongoDB');
        
        const db = client.db();
        const scansCollection = db.collection('scanhistories');
        
        // Get all scans
        const scans = await scansCollection.find({}).toArray();
        console.log(`📊 Found ${scans.length} scans in database`);
        
        if (scans.length === 0) {
            console.log('❌ No scans found - cannot test device rendering');
            return;
        }
        
        // Test each scan
        for (const scan of scans) {
            console.log(`\n🔍 Testing scan: ${scan.name || scan._id}`);
            console.log('📅 Date:', scan.date);
            console.log('🏷️ Type:', scan.type);
            console.log('🔢 Device count field:', scan.devices);
            
            // Test the device extraction logic used by the UI
            const scanData = scan.scanData || {};
            console.log('💾 ScanData structure:', {
                type: typeof scanData,
                isNull: scanData === null,
                isUndefined: scanData === undefined,
                keys: Object.keys(scanData),
                keyCount: Object.keys(scanData).length
            });
            
            if (scanData.devices) {
                console.log('📱 Direct devices array found:', {
                    type: typeof scanData.devices,
                    isArray: Array.isArray(scanData.devices),
                    length: Array.isArray(scanData.devices) ? scanData.devices.length : 'N/A'
                });
            }
            
            // Simulate the exact UI extraction logic: Object.values(entry.data || {}).flat()
            const extractedDevices = Object.values(scanData || {}).flat();
            console.log('🔧 UI Extraction Result:', {
                method: 'Object.values(scanData || {}).flat()',
                extractedCount: extractedDevices.length,
                type: typeof extractedDevices,
                isArray: Array.isArray(extractedDevices)
            });
            
            if (extractedDevices.length > 0) {
                console.log('✅ Devices successfully extracted!');
                console.log('📋 First device sample:', {
                    ip: extractedDevices[0].ip,
                    status: extractedDevices[0].status,
                    vendor: extractedDevices[0].vendor,
                    hasRequiredFields: !!(extractedDevices[0].ip && extractedDevices[0].status)
                });
                
                // Test device validation for MemoizedDeviceList
                const validDevices = extractedDevices.filter(device => 
                    device && 
                    typeof device === 'object' && 
                    device.ip && 
                    device.status
                );
                
                console.log('✔️ Valid devices for rendering:', validDevices.length);
                
                if (validDevices.length !== extractedDevices.length) {
                    console.log('⚠️ Some devices filtered out due to missing required fields');
                    console.log('❌ Invalid devices:', extractedDevices.length - validDevices.length);
                    
                    // Show invalid devices
                    const invalidDevices = extractedDevices.filter(device => 
                        !device || 
                        typeof device !== 'object' || 
                        !device.ip || 
                        !device.status
                    );
                    
                    invalidDevices.forEach((device, i) => {
                        console.log(`   Invalid device ${i}:`, {
                            type: typeof device,
                            hasIp: !!(device && device.ip),
                            hasStatus: !!(device && device.status),
                            device: device
                        });
                    });
                }
            } else {
                console.log('❌ No devices extracted');
                
                // Debug the scanData structure more deeply
                console.log('🔍 Deep scanData investigation:');
                for (const [key, value] of Object.entries(scanData)) {
                    console.log(`   ${key}:`, {
                        type: typeof value,
                        isArray: Array.isArray(value),
                        length: Array.isArray(value) ? value.length : 'N/A',
                        keys: typeof value === 'object' && value !== null ? Object.keys(value) : 'N/A'
                    });
                    
                    // If it's an object, check if it contains devices
                    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
                        const subValues = Object.values(value);
                        console.log(`   ${key} sub-values:`, {
                            count: subValues.length,
                            types: subValues.map(v => typeof v)
                        });
                    }
                }
            }
            
            console.log('─'.repeat(50));
        }
        
        console.log('\n🎯 TESTING COMPLETE');
        
    } catch (error) {
        console.error('❌ Test failed:', error);
    } finally {
        if (client) {
            await client.close();
            console.log('🔌 MongoDB connection closed');
        }
    }
}

// Run the test
testDeviceRendering().catch(console.error);
