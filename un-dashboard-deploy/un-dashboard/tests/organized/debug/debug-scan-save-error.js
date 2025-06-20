// Debug test to capture the exact error causing scan save failures
const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

async function debugScanSaveError() {
    try {
        // Import fetch dynamically
        const fetch = (await import('node-fetch')).default;
        
        console.log('🔐 Authenticating...');
        
        // Login to get auth token
        const loginResponse = await fetch('http://localhost:3000/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                username: 'admin',
                password: 'admin123'
            })
        });
        
        if (!loginResponse.ok) {
            throw new Error(`Login failed: ${loginResponse.status} - ${await loginResponse.text()}`);
        }
        
        // Get cookies for subsequent requests
        const cookies = loginResponse.headers.get('set-cookie');
        console.log('✅ Authentication successful');
        
        // Create minimal test scan to isolate the issue
        const minimalTestScan = {
            scanId: `debug-test-${Date.now()}`,
            name: 'Debug Test Scan',
            ipRange: '192.168.1.0/24',
            deviceCount: 1,
            scanData: {
                devices: {
                    "TestVendor": [
                        { ip: '192.168.1.1', mac: '00:11:22:33:44:55', hostname: 'test' }
                    ]
                }
            }
        };
        
        console.log('\n📤 Testing minimal scan save...');
        console.log('Payload:', JSON.stringify(minimalTestScan, null, 2));
        
        const saveResponse = await fetch('http://localhost:3000/api/scan-history', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Cookie': cookies
            },
            body: JSON.stringify(minimalTestScan)
        });
        
        console.log(`\nResponse Status: ${saveResponse.status}`);
        console.log('Response Headers:', Object.fromEntries(saveResponse.headers.entries()));
        
        const responseText = await saveResponse.text();
        console.log('Response Body:', responseText);
        
        if (!saveResponse.ok) {
            console.log('\n❌ Save failed - testing direct database access...');
            
            // Test direct database access to see if the issue is with MongoDB
            await mongoose.connect(process.env.MONGODB_URL);
            console.log('✅ Direct MongoDB connection successful');
            
            // Test creating a ScanHistory document directly
            const ScanHistory = require('./models/ScanHistory');
            
            const testDoc = new ScanHistory({
                userId: new mongoose.Types.ObjectId(),
                scanId: `direct-test-${Date.now()}`,
                name: 'Direct DB Test',
                ipRange: '192.168.1.0/24',
                deviceCount: 1,
                scanData: { test: 'data' },
                metadata: {
                    scanType: 'ping',
                    scanDuration: 1000,
                    osDetection: false,
                    serviceDetection: false,
                    ports: [],
                    hasNetworkTopology: false,
                    deviceTypes: []
                },
                settings: {
                    isPrivate: true,
                    isFavorite: false,
                    tags: [],
                    notes: ''
                }
            });
            
            const savedDoc = await testDoc.save();
            console.log('✅ Direct database save successful:', savedDoc._id);
            
            await mongoose.connection.close();
        } else {
            console.log('✅ API save successful!');
        }
        
    } catch (error) {
        console.error('❌ Debug test failed:', error);
        
        // Additional error info
        if (error.response) {
            console.log('Error response status:', error.response.status);
            console.log('Error response headers:', error.response.headers);
        }
    }
}

debugScanSaveError();
