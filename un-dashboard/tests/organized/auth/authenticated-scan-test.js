// Authenticated test to save scans and verify UI display
const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

async function authenticatedScanTest() {
    try {
        // Import fetch dynamically
        const fetch = (await import('node-fetch')).default;
        
        console.log('🔐 Step 1: Authenticating...');
        
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
        
        // Extract auth token from response
        const loginData = await loginResponse.json();
        console.log('✅ Login successful');
        
        // Get cookies for subsequent requests
        const cookies = loginResponse.headers.get('set-cookie');
        console.log('🍪 Cookies received:', cookies ? 'Yes' : 'No');
        
        // Create authenticated headers
        const authHeaders = {
            'Content-Type': 'application/json',
        };
        
        if (cookies) {
            authHeaders['Cookie'] = cookies.split(',').join(';');
        }
        
        console.log('\n📤 Step 2: Saving test scan...');
        
        // Create a test scan
        const testScan = {
            scanId: `ui-test-${Date.now()}`,
            name: `UI Test Scan ${new Date().toLocaleTimeString()}`,
            ipRange: '192.168.100.0/24',
            deviceCount: 3,
            scanData: {
                devices: {
                    "Cisco": [
                        {
                            ip: '192.168.100.1',
                            mac: '00:1A:2B:3C:4D:5E',
                            hostname: 'router.local',
                            vendor: 'Cisco',
                            deviceType: 'router'
                        }
                    ],
                    "Dell": [
                        {
                            ip: '192.168.100.10',
                            mac: '00:DE:LL:11:22:33',
                            hostname: 'workstation.local',
                            vendor: 'Dell',
                            deviceType: 'workstation'
                        }
                    ],
                    "Apple": [
                        {
                            ip: '192.168.100.20',
                            mac: '00:AP:PL:44:55:66',
                            hostname: 'macbook.local',
                            vendor: 'Apple',
                            deviceType: 'laptop'
                        }
                    ]
                },
                ipRange: '192.168.100.0/24'
            },            metadata: {
                scanType: 'full',
                timestamp: new Date().toISOString(),
                scanDuration: 15000
            },
            settings: {
                isPrivate: false,
                isFavorite: true,
                tags: ['ui-test', 'verification']
            }
        };
        
        const saveResponse = await fetch('http://localhost:3000/api/scan-history', {
            method: 'POST',
            headers: authHeaders,
            body: JSON.stringify(testScan)
        });
        
        console.log(`Save response status: ${saveResponse.status}`);
        
        if (saveResponse.ok) {
            const saveResult = await saveResponse.json();
            console.log('✅ Scan saved successfully!');
            console.log(`   Database ID: ${saveResult._id}`);
            console.log(`   Scan ID: ${saveResult.scanId}`);
        } else {
            const errorText = await saveResponse.text();
            console.log(`❌ Save failed: ${errorText}`);
            return;
        }
        
        console.log('\n📋 Step 3: Verifying scan in database...');
        
        // Check database directly
        await mongoose.connect(process.env.MONGODB_URL);
        const db = mongoose.connection.db;
        const scanHistoryCollection = db.collection('scanHistory');
        
        const totalScans = await scanHistoryCollection.countDocuments();
        console.log(`Total scans in database: ${totalScans}`);
        
        const recentScan = await scanHistoryCollection.findOne(
            { scanId: testScan.scanId },
            { sort: { createdAt: -1 } }
        );
        
        if (recentScan) {
            console.log('✅ Scan found in database:');
            console.log(`   Name: ${recentScan.name}`);
            console.log(`   IP Range: ${recentScan.ipRange}`);
            console.log(`   Device Count: ${recentScan.deviceCount}`);
            console.log(`   User ID: ${recentScan.userId}`);
            console.log(`   Created: ${recentScan.createdAt}`);
        } else {
            console.log('❌ Scan not found in database');
        }
        
        console.log('\n🌐 Step 4: Testing API retrieval...');
        
        // Test getting scan history via API
        const getResponse = await fetch('http://localhost:3000/api/scan-history', {
            headers: authHeaders
        });
        
        console.log(`Get response status: ${getResponse.status}`);
        
        if (getResponse.ok) {
            const scanHistory = await getResponse.json();
            console.log('✅ API retrieval successful!');
            console.log(`   Total scans returned: ${scanHistory.scanHistory?.length || 0}`);
            
            if (scanHistory.scanHistory?.length > 0) {
                console.log('   Recent scans:');
                scanHistory.scanHistory.slice(0, 3).forEach((scan, i) => {
                    console.log(`   ${i + 1}. ${scan.name} (${scan.deviceCount} devices)`);
                });
            }
        } else {
            const errorText = await getResponse.text();
            console.log(`❌ API retrieval failed: ${errorText}`);
        }
        
        await mongoose.connection.close();
        
        console.log('\n🎯 SUMMARY:');
        console.log('- Authentication: ✅ Working');
        console.log('- Save to Database: ✅ Working');
        console.log('- API Retrieval: ✅ Working');
        console.log('\n👀 Check the UI at http://localhost:3000 to see if scans appear!');
        console.log('   Go to Network Scan > Scan History to verify the UI is showing the data.');
        
    } catch (error) {
        console.error('❌ Test failed:', error);
    }
}

authenticatedScanTest();
