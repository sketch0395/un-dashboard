#!/usr/bin/env node

const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));
const fs = require('fs');

async function loginAndTestTopology() {
    console.log('🚀 BROWSER LOGIN AND TOPOLOGY TEST');
    
    try {
        // Read auth data
        console.log('Reading auth data...');
        const loginData = JSON.parse(fs.readFileSync('login-data.json', 'utf8'));
        const { username, password } = loginData;
        
        console.log(`Auth data loaded: ${username}`);
        
        // Step 1: Login to get session cookies
        console.log('🔐 Step 1: Authenticating...');
        const loginResponse = await fetch('http://localhost:3001/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ username, password })
        });

        if (!loginResponse.ok) {
            throw new Error(`Login failed: ${loginResponse.status} ${loginResponse.statusText}`);
        }

        const loginResult = await loginResponse.json();
        console.log('✅ Login successful:', loginResult.message);
        
        // Extract cookies from response
        const setCookieHeader = loginResponse.headers.get('set-cookie');
        console.log('🍪 Session cookies received');
        
        // Step 2: Test /networkscan page access with session cookies
        console.log('🌐 Step 2: Testing networkscan page access...');
        const networkScanResponse = await fetch('http://localhost:3001/networkscan', {
            headers: {
                'Cookie': setCookieHeader || '',
                'Authorization': `Bearer ${loginData.authToken}`
            }
        });

        console.log(`Network scan page status: ${networkScanResponse.status}`);
        
        if (networkScanResponse.ok) {
            console.log('✅ Successfully accessed /networkscan page');
            
            // Step 3: Test API endpoints
            console.log('🔍 Step 3: Testing scan history API...');
            const scanHistoryResponse = await fetch('http://localhost:3001/api/scan-history', {
                headers: {
                    'Cookie': setCookieHeader || '',
                    'Authorization': `Bearer ${loginData.authToken}`
                }
            });
            
            if (scanHistoryResponse.ok) {
                const scanHistory = await scanHistoryResponse.json();
                console.log(`✅ Scan history retrieved: ${scanHistory.scans.length} scans found`);
                
                // Display topology scan data for UI testing
                const topologyScans = scanHistory.scans.filter(scan => 
                    scan.devices && scan.devices.length > 1
                );
                
                if (topologyScans.length > 0) {
                    console.log(`📊 Found ${topologyScans.length} scans with topology data:`);
                    topologyScans.slice(0, 3).forEach((scan, index) => {
                        console.log(`  ${index + 1}. ${scan.timestamp} - ${scan.devices.length} devices`);
                        console.log(`     Network: ${scan.network || 'Unknown'}`);
                        console.log(`     Devices: ${scan.devices.map(d => d.hostname || d.ip).join(', ')}`);
                    });
                } else {
                    console.log('⚠️ No topology data found in scan history');
                }
            } else {
                console.log(`❌ Scan history API failed: ${scanHistoryResponse.status}`);
            }
            
        } else {
            console.log(`❌ Network scan page access failed: ${networkScanResponse.status}`);
            const errorText = await networkScanResponse.text();
            console.log('Error details:', errorText.substring(0, 200) + '...');
        }
        
        console.log('');
        console.log('🎯 MANUAL TESTING STEPS:');
        console.log('1. Open browser to: http://localhost:3001/auth/login');
        console.log(`2. Login with username: ${username} and password: ${password}`);
        console.log('3. Navigate to: http://localhost:3001/networkscan');
        console.log('4. Test topology visualization features:');
        console.log('   - View scan history list');
        console.log('   - Select a scan with multiple devices');
        console.log('   - Switch between Circular and Hierarchical views');
        console.log('   - Test device interactions and tooltips');
        console.log('   - Verify connection lines between devices');
        console.log('');
        
    } catch (error) {
        console.error('❌ Error during testing:', error.message);
    }
}

loginAndTestTopology();
