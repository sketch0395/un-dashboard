// Quick authentication test with correct admin credentials
console.log('🔐 AUTHENTICATION TEST - CORRECT CREDENTIALS');

const fetch = require('node-fetch');

async function testAdminAuth() {
    try {
        console.log('🔑 Testing admin login with credentials: admin/admin123');
        
        const loginResponse = await fetch('http://localhost:3000/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                username: 'admin',
                password: 'admin123'
            })
        });

        console.log('📊 Login response status:', loginResponse.status);
          if (loginResponse.status === 200) {
            const result = await loginResponse.json();
            console.log('✅ Admin authentication successful!');
            console.log('📄 Full login response:', JSON.stringify(result, null, 2));
            console.log('🎟️  Auth token received:', result.token ? 'Yes' : 'No');
              // Test authenticated scan history access with cookies
            const authCookies = loginResponse.headers.get('set-cookie');
            console.log('🍪 Cookies received:', authCookies ? 'Yes' : 'No');
            
            if (authCookies) {
                console.log('\n📋 Testing scan history access with cookies...');
                const scanResponse = await fetch('http://localhost:3000/api/scan-history', {
                    headers: {
                        'Cookie': authCookies
                    }
                });
                
                console.log('📊 Scan history response status:', scanResponse.status);
                
                if (scanResponse.status === 200) {
                    const scans = await scanResponse.json();
                    console.log('✅ Scan history accessible!');
                    console.log('📈 Available scans:', Array.isArray(scans) ? scans.length : 'Not an array');
                    
                    if (Array.isArray(scans) && scans.length > 0) {
                        console.log('🎯 TOPOLOGY DATA AVAILABLE - This should fix the topology display!');
                        scans.slice(0, 2).forEach((scan, index) => {
                            console.log(`  📄 Scan ${index + 1}: ${scan.name || scan.scanId} (${scan.deviceCount || 0} devices)`);
                        });
                    } else {
                        console.log('⚠️  No scan data found - need to create or run a scan');
                    }
                } else {
                    console.log('❌ Scan history not accessible even with cookies');
                }
            } else {
                console.log('⚠️  No cookies received - testing without cookies...');
                const scanResponse = await fetch('http://localhost:3000/api/scan-history');
                console.log('📊 Scan history response status (no cookies):', scanResponse.status);
            }
        } else {
            const error = await loginResponse.text();
            console.log('❌ Admin authentication failed:', error);
        }
        
    } catch (error) {
        console.log('❌ Authentication test error:', error.message);
    }
}

testAdminAuth().catch(console.error);
