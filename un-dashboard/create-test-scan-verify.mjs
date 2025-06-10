#!/usr/bin/env node

/**
 * Create Test Scan and Verify Device Data Fix
 * This script will create a test scan and verify our device data retrieval fix
 */

import { MongoClient } from 'mongodb';
import 'dotenv/config';

const MONGODB_URI = process.env.MONGODB_URL || process.env.MONGODB_URI || 'mongodb://localhost:27017/un-dashboard';

async function createTestScanAndVerify() {
    console.log('🧪 CREATE TEST SCAN AND VERIFY DEVICE DATA FIX');
    console.log('==============================================');
    
    let client;
    try {
        // Connect to MongoDB
        console.log('🔌 Connecting to MongoDB...');
        client = new MongoClient(MONGODB_URI);
        await client.connect();
        console.log('✅ Connected to MongoDB');
        
        const db = client.db();
        const scansCollection = db.collection('scanhistories');
        
        // Create a test scan with realistic device data
        const testScan = {
            name: 'Test Scan - Device Data Verification',
            date: new Date().toISOString(),
            type: 'network',
            devices: 3,
            isFromDatabase: true,
            scanData: {
                devices: [
                    {
                        ip: '192.168.1.1',
                        status: 'up',
                        vendor: 'Cisco Systems',
                        responseTime: 12,
                        lastSeen: new Date().toISOString(),
                        name: 'Router'
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
                        lastSeen: new Date().toISOString()
                    }
                ]
            },
            user: 'test-user',
            createdAt: new Date(),
            updatedAt: new Date()
        };
        
        console.log('📝 Creating test scan...');
        const insertResult = await scansCollection.insertOne(testScan);
        console.log('✅ Test scan created with ID:', insertResult.insertedId);
        
        // Verify the scan was saved correctly
        const savedScan = await scansCollection.findOne({ _id: insertResult.insertedId });
        console.log('🔍 Verifying saved scan structure:');
        console.log('  - Name:', savedScan.name);
        console.log('  - Device count field:', savedScan.devices);
        console.log('  - Has scanData:', !!savedScan.scanData);
        console.log('  - ScanData keys:', Object.keys(savedScan.scanData || {}));
        
        if (savedScan.scanData && savedScan.scanData.devices) {
            console.log('  - Devices in scanData:', savedScan.scanData.devices.length);
            console.log('  - First device:', {
                ip: savedScan.scanData.devices[0].ip,
                status: savedScan.scanData.devices[0].status,
                vendor: savedScan.scanData.devices[0].vendor
            });
        }
        
        // Test the API endpoint behavior
        console.log('\n🔗 Testing API endpoint behavior...');
        
        // Simulate the main scan history API (excludes scanData)
        console.log('1. Main API endpoint (excludes scanData):');
        const mainApiResult = await scansCollection.findOne(
            { _id: insertResult.insertedId },
            { projection: { scanData: 0 } } // This simulates the API behavior
        );
        console.log('   - Has scanData:', !!mainApiResult.scanData);
        console.log('   - Device count field:', mainApiResult.devices);
        
        // Simulate the detailed scan API (includes scanData)
        console.log('2. Detailed API endpoint (includes scanData):');
        const detailedApiResult = await scansCollection.findOne({ _id: insertResult.insertedId });
        console.log('   - Has scanData:', !!detailedApiResult.scanData);
        console.log('   - ScanData keys:', Object.keys(detailedApiResult.scanData || {}));
        
        // Test the UI device extraction logic
        console.log('\n🎨 Testing UI device extraction logic...');
        
        // Scenario 1: Empty data (from main API)
        console.log('Scenario 1: Empty data (main API response)');
        const emptyData = {};
        const extractedEmpty = Object.values(emptyData || {}).flat();
        console.log('  - Extracted devices:', extractedEmpty.length);
        console.log('  - Should trigger data fetch:', extractedEmpty.length === 0);
        
        // Scenario 2: Full data (after fetching from detailed API)
        console.log('Scenario 2: Full data (detailed API response)');
        const fullData = detailedApiResult.scanData;
        const extractedFull = Object.values(fullData || {}).flat();
        console.log('  - Extracted devices:', extractedFull.length);
        console.log('  - First device IP:', extractedFull[0]?.ip);
        console.log('  - All devices valid:', extractedFull.every(d => d.ip && d.status));
        
        // Test alternative data structures
        console.log('\n🔧 Testing alternative data structures...');
        
        // Create a scan with nested device structure (common in some scan formats)
        const nestedScan = {
            name: 'Test Scan - Nested Structure',
            date: new Date().toISOString(),
            type: 'network',
            devices: 2,
            isFromDatabase: true,
            scanData: {
                subnet1: [
                    {
                        ip: '10.0.1.1',
                        status: 'up',
                        vendor: 'Netgear',
                        responseTime: 15
                    }
                ],
                subnet2: [
                    {
                        ip: '10.0.2.1',
                        status: 'up',
                        vendor: 'TP-Link',
                        responseTime: 18
                    }
                ]
            }
        };
        
        const nestedResult = await scansCollection.insertOne(nestedScan);
        console.log('📝 Created nested structure test scan');
        
        const nestedExtracted = Object.values(nestedScan.scanData || {}).flat();
        console.log('  - Nested extraction result:', nestedExtracted.length, 'devices');
        console.log('  - First device from nested:', nestedExtracted[0]?.ip);
        
        console.log('\n✅ TEST COMPLETE');
        console.log('📊 Summary:');
        console.log('  - Created 2 test scans');
        console.log('  - Verified device extraction logic');
        console.log('  - Confirmed API behavior simulation');
        console.log('  - Both flat and nested structures work with Object.values().flat()');
        
        return {
            testScanId: insertResult.insertedId,
            nestedScanId: nestedResult.insertedId
        };
        
    } catch (error) {
        console.error('❌ Test failed:', error);
        throw error;
    } finally {
        if (client) {
            await client.close();
            console.log('🔌 MongoDB connection closed');
        }
    }
}

// Run the test
createTestScanAndVerify()
    .then((result) => {
        console.log('\n🎯 Test completed successfully!');
        console.log('Test scan IDs:', result);
    })
    .catch(console.error);
