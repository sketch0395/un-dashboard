// Browser console test for complete authentication and topology fix
// Run this in the browser console at http://localhost:3000

console.log('🚀 Testing complete authentication and topology flow...');

async function testCompleteFlow() {
    try {
        // Step 1: Login
        console.log('Step 1: Logging in...');
        const loginResponse = await fetch('/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({
                username: 'admin',
                password: 'admin123!'
            })
        });
        
        const loginData = await loginResponse.json();
        console.log('Login response:', loginData);
        
        if (!loginResponse.ok) {
            throw new Error('Login failed: ' + loginData.message);
        }
        
        console.log('✅ Login successful!');
        
        // Step 2: Check profile
        console.log('Step 2: Checking profile...');
        const profileResponse = await fetch('/api/user/profile', {
            credentials: 'include'
        });
        
        const profileData = await profileResponse.json();
        console.log('Profile response:', profileData);
        
        if (!profileResponse.ok) {
            throw new Error('Profile check failed: ' + profileData.message);
        }
        
        console.log('✅ Profile check successful!');
        
        // Step 3: Submit a test scan
        console.log('Step 3: Submitting test scan...');
        const scanData = {
            ipRange: '192.168.1.0/24',
            settings: {
                ports: [22, 80, 443],
                tags: ['test-scan'],
                timeout: 5000
            },
            results: {
                devices: [
                    {
                        ip: '192.168.1.1',
                        hostname: 'router.local',
                        ports: [80, 443],
                        services: ['http', 'https']
                    },
                    {
                        ip: '192.168.1.10',
                        hostname: 'workstation.local',
                        ports: [22],
                        services: ['ssh']
                    }
                ],
                summary: {
                    totalDevices: 2,
                    activeDevices: 2,
                    totalPorts: 3
                }
            }
        };
        
        const scanResponse = await fetch('/api/scan-history', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify(scanData)
        });
        
        const scanResult = await scanResponse.json();
        console.log('Scan submission response:', scanResult);
        
        if (!scanResponse.ok) {
            throw new Error('Scan submission failed: ' + scanResult.message);
        }
        
        console.log('✅ Scan submission successful!');
        
        // Step 4: Check scan history
        console.log('Step 4: Checking scan history...');
        const historyResponse = await fetch('/api/scan-history', {
            credentials: 'include'
        });
        
        const historyData = await historyResponse.json();
        console.log('Scan history response:', historyData);
        
        if (!historyResponse.ok) {
            throw new Error('Scan history check failed');
        }
        
        console.log('✅ Scan history check successful!');
        console.log('Total scans:', historyData.scans?.length || 0);
        
        // Step 5: Reload to test frontend authentication
        console.log('Step 5: Reloading page to test frontend authentication...');
        console.log('Current cookies:', document.cookie);
        
        setTimeout(() => {
            console.log('🔄 Reloading page...');
            window.location.reload();
        }, 2000);
        
        console.log('🎉 All tests passed! Authentication and topology system is working.');
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        console.error('Full error:', error);
    }
}

// Run the test
testCompleteFlow();
