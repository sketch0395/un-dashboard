/**
 * Comprehensive Device Data Debugging Test
 * This will help us identify exactly what's happening with device data
 */

import { MongoClient } from 'mongodb';
import { config } from 'dotenv';

config();

const MONGODB_URI = process.env.MONGODB_URL || 'mongodb://localhost:27017/un-dashboard';

async function testDeviceDataFlow() {
    console.log('🔍 COMPREHENSIVE DEVICE DATA DEBUGGING TEST');
    console.log('==========================================');
    
    const client = new MongoClient(MONGODB_URI);
    
    try {
        await client.connect();
        console.log('✅ Connected to MongoDB');
        
        const db = client.db();
        const collection = db.collection('scanhistories');
        
        // First, let's see what's actually in the database
        console.log('\n📊 DATABASE CONTENTS:');
        const scans = await collection.find({}).sort({ createdAt: -1 }).limit(5).toArray();
        
        if (scans.length === 0) {
            console.log('❌ No scans found in database');
            
            // Create a test scan to work with
            console.log('\n📝 Creating test scan...');
            const testScan = {
                userId: "675a0c98abcdef123456789a", // Use a test user ID
                scanId: `test-scan-${Date.now()}`,
                name: 'Debug Test Scan',
                ipRange: '192.168.1.0/24',
                deviceCount: 3,
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
                metadata: {
                    timestamp: new Date().toISOString(),
                    scanDuration: 30,
                    userAgent: 'Debug Test'
                },
                settings: {
                    isPrivate: true,
                    isFavorite: false,
                    tags: [],
                    notes: 'Debug test scan'
                },
                createdAt: new Date(),
                updatedAt: new Date()
            };
            
            const result = await collection.insertOne(testScan);
            console.log('✅ Created test scan with ID:', result.insertedId);
            scans.push(testScan);
        }
        
        for (const scan of scans) {
            console.log(`\n🔍 SCAN: ${scan.name || 'Unnamed'}`);
            console.log('  - ID:', scan.scanId);
            console.log('  - Device Count:', scan.deviceCount);
            console.log('  - Has scanData:', !!scan.scanData);
            
            if (scan.scanData) {
                console.log('  - ScanData type:', typeof scan.scanData);
                console.log('  - ScanData keys:', Object.keys(scan.scanData));
                
                if (scan.scanData.devices) {
                    console.log('  - Direct devices array:', Array.isArray(scan.scanData.devices));
                    console.log('  - Direct devices count:', Array.isArray(scan.scanData.devices) ? scan.scanData.devices.length : 'N/A');
                    
                    if (Array.isArray(scan.scanData.devices) && scan.scanData.devices.length > 0) {
                        console.log('  - First device:', {
                            ip: scan.scanData.devices[0].ip,
                            status: scan.scanData.devices[0].status,
                            vendor: scan.scanData.devices[0].vendor
                        });
                    }
                }
                
                // Test UI extraction logic: Object.values(scanData).flat()
                const uiExtracted = Object.values(scan.scanData).flat();
                console.log('  - UI extraction result:', uiExtracted.length, 'devices');
                
                if (uiExtracted.length > 0 && uiExtracted[0].ip) {
                    console.log('  - First UI extracted device:', {
                        ip: uiExtracted[0].ip,
                        status: uiExtracted[0].status,
                        vendor: uiExtracted[0].vendor
                    });
                }
            } else {
                console.log('  - ❌ No scanData found');
            }
        }
        
        // Test the API endpoint behavior
        console.log('\n🌐 TESTING API ENDPOINTS:');
        
        // Test main scan history endpoint (should exclude scanData)
        console.log('1. Testing main API endpoint (/api/scan-history):');
        const mainResult = await collection.find({}).select({ scanData: 0 }).toArray();
        console.log(`   - Returns ${mainResult.length} scans`);
        console.log(`   - First scan has scanData:`, !!mainResult[0]?.scanData);
        console.log(`   - First scan device count:`, mainResult[0]?.deviceCount);
        
        // Test detailed scan endpoint (should include scanData)
        if (scans.length > 0) {
            console.log('2. Testing detailed API endpoint (/api/scan-history/[scanId]):');
            const detailedResult = await collection.findOne({ scanId: scans[0].scanId });
            console.log(`   - Returns scan with scanData:`, !!detailedResult?.scanData);
            console.log(`   - ScanData keys:`, detailedResult?.scanData ? Object.keys(detailedResult.scanData) : 'none');
            
            if (detailedResult?.scanData) {
                const extractedFromApi = Object.values(detailedResult.scanData).flat();
                console.log(`   - Devices extractable:`, extractedFromApi.length);
            }
        }
        
        console.log('\n🎯 DIAGNOSIS:');
        console.log('If the UI is not showing devices, check:');
        console.log('1. Are scans marked as isFromDatabase: true?');
        console.log('2. Is the toggleAccordion function being called?');
        console.log('3. Is the API fetch in toggleAccordion working?');
        console.log('4. Are the console.log messages appearing in browser?');
        console.log('5. Is the MemoizedDeviceList receiving non-empty devices array?');
        
    } catch (error) {
        console.error('❌ Test failed:', error);
    } finally {
        await client.close();
        console.log('🔌 MongoDB connection closed');
    }
}

testDeviceDataFlow();
