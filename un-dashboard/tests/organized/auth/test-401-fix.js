import fetch from 'node-fetch';

async function testScanSave() {
    try {
        console.log('Testing 401 fix for scan history save...\n');

        // First, login to get the auth token
        console.log('1. Logging in as admin...');
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
            throw new Error(`Login failed: ${loginResponse.status} ${loginResponse.statusText}`);
        }

        const loginData = await loginResponse.json();
        console.log('✅ Login successful');

        // Extract auth token from set-cookie header
        const setCookieHeader = loginResponse.headers.get('set-cookie');
        let authToken = null;
        
        if (setCookieHeader) {
            const cookies = setCookieHeader.split(';');
            for (const cookie of cookies) {
                if (cookie.trim().startsWith('auth-token=')) {
                    authToken = cookie.trim().split('=')[1];
                    break;
                }
            }
        }

        if (!authToken) {
            throw new Error('No auth token found in login response');
        }

        console.log('✅ Auth token extracted');

        // Test saving a scan to history
        console.log('\n2. Testing scan save to database...');
        
        const testScanData = {
            scanId: 'test-scan-' + Date.now(),
            name: 'Test Scan Authentication Fix',
            ipRange: '192.168.1.0/24',
            deviceCount: 5,
            scanData: {
                devices: [
                    { ip: '192.168.1.1', hostname: 'router.local', status: 'up' },
                    { ip: '192.168.1.100', hostname: 'desktop.local', status: 'up' },
                    { ip: '192.168.1.101', hostname: 'laptop.local', status: 'up' },
                    { ip: '192.168.1.102', hostname: 'phone.local', status: 'up' },
                    { ip: '192.168.1.103', hostname: 'tablet.local', status: 'up' }
                ]
            },
            metadata: {
                scanType: 'ping',
                scanDuration: 30000,
                osDetection: false,
                serviceDetection: false,
                ports: []
            },
            settings: {
                isPrivate: true,
                isFavorite: false,
                tags: ['test', 'authentication-fix'],
                notes: 'Test scan to verify 401 error fix'
            }
        };

        const saveResponse = await fetch('http://localhost:3000/api/scan-history', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Cookie': `auth-token=${authToken}`
            },
            body: JSON.stringify(testScanData)
        });

        console.log(`Response status: ${saveResponse.status}`);

        if (!saveResponse.ok) {
            const errorText = await saveResponse.text();
            console.error('❌ Save failed:', errorText);
            throw new Error(`Save failed: ${saveResponse.status} ${saveResponse.statusText}`);
        }

        const saveResult = await saveResponse.json();
        console.log('✅ Scan saved successfully!');
        console.log('Saved scan ID:', saveResult._id);
        console.log('Scan name:', saveResult.name);

        // Test fetching scan history to confirm it was saved
        console.log('\n3. Testing scan history fetch...');
        
        const fetchResponse = await fetch('http://localhost:3000/api/scan-history', {
            method: 'GET',
            headers: {
                'Cookie': `auth-token=${authToken}`
            }
        });

        if (!fetchResponse.ok) {
            throw new Error(`Fetch failed: ${fetchResponse.status} ${fetchResponse.statusText}`);
        }

        const fetchResult = await fetchResponse.json();
        console.log('✅ Scan history fetched successfully!');
        console.log(`Found ${fetchResult.scanHistory.length} scans in history`);

        // Find our test scan
        const testScan = fetchResult.scanHistory.find(scan => scan.scanId === testScanData.scanId);
        if (testScan) {
            console.log('✅ Test scan found in history!');
            console.log('Test scan details:', {
                id: testScan._id,
                name: testScan.name,
                ipRange: testScan.ipRange,
                deviceCount: testScan.deviceCount,
                tags: testScan.settings?.tags
            });
        } else {
            console.log('⚠️ Test scan not found in history');
        }

        console.log('\n🎉 All tests passed! The 401 error has been fixed!');

    } catch (error) {
        console.error('\n❌ Test failed:', error.message);
        process.exit(1);
    }
}

testScanSave();
