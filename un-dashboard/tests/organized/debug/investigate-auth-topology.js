// Authentication and Topology Display Investigation
// Test if collaboration mode affects authentication state and scan data loading

console.log('🔐 AUTHENTICATION & TOPOLOGY DISPLAY INVESTIGATION');
console.log('='.repeat(60));

async function investigateAuthAndTopology() {
    try {
        console.log('📋 1. Testing authentication state...');
        
        // Test authentication verification
        const authResponse = await fetch('http://localhost:3000/api/auth/verify', {
            method: 'GET',
            credentials: 'include'
        });
        
        console.log('🔑 Auth verification status:', authResponse.status);
        
        if (authResponse.ok) {
            const authData = await authResponse.json();
            console.log('✅ Authentication successful:');
            console.log('   - Authenticated:', authData.authenticated);
            console.log('   - User ID:', authData.user?._id);
            console.log('   - Username:', authData.user?.username);
            console.log('   - Role:', authData.user?.role);
        } else {
            console.log('❌ Authentication failed');
            console.log('💡 DIAGNOSIS: User not authenticated - this explains missing topology!');
            console.log('🔧 SOLUTION: Login to the application first');
            return;
        }
        
        console.log('\n📊 2. Testing scan history access...');
        
        // Test scan history with authentication
        const scanResponse = await fetch('http://localhost:3000/api/scan-history', {
            method: 'GET',
            credentials: 'include'
        });
        
        console.log('📋 Scan history status:', scanResponse.status);
        
        if (scanResponse.ok) {
            const scans = await scanResponse.json();
            console.log('✅ Scan history accessible:');
            console.log('   - Total scans:', scans.scanHistory?.length || 0);
            
            if (scans.scanHistory && scans.scanHistory.length > 0) {
                console.log('   - Recent scans:');
                scans.scanHistory.slice(0, 3).forEach((scan, i) => {
                    console.log(`     ${i + 1}. ${scan.name} (${scan.deviceCount} devices)`);
                    
                    // Check for topology data
                    const hasTopologyData = !!(scan.scanData && 
                        (scan.scanData.devices || 
                         Object.keys(scan.scanData).some(key => 
                            Array.isArray(scan.scanData[key]) && scan.scanData[key].length > 0
                        )));
                    
                    console.log(`        Has topology data: ${hasTopologyData ? '✅' : '❌'}`);
                });
                
                console.log('\n🎯 TOPOLOGY DIAGNOSIS:');
                const topologyScans = scans.scanHistory.filter(scan => {
                    if (!scan.scanData) return false;
                    
                    if (scan.scanData.devices && Array.isArray(scan.scanData.devices)) {
                        return scan.scanData.devices.length > 0;
                    }
                    
                    return Object.keys(scan.scanData).some(key => 
                        Array.isArray(scan.scanData[key]) && scan.scanData[key].length > 0
                    );
                });
                
                console.log(`   - Scans with topology data: ${topologyScans.length}/${scans.scanHistory.length}`);
                
                if (topologyScans.length > 0) {
                    console.log('   ✅ Topology data is available in scan history');
                    console.log('   💡 Issue likely in UI rendering, not data access');
                } else {
                    console.log('   ❌ No scans contain topology data');
                    console.log('   💡 Need to create scans with device data first');
                }
                
            } else {
                console.log('   ❌ No scans found in history');
                console.log('   💡 Need to run network scans first or create test data');
            }
        } else {
            const errorText = await scanResponse.text();
            console.log('❌ Scan history access failed:', errorText);
        }
        
        console.log('\n🤝 3. Testing collaboration impact...');
        
        // This simulates what happens when collaboration mode is enabled
        console.log('📝 Instructions for manual collaboration test:');
        console.log('1. Open http://localhost:3000/networkscan');
        console.log('2. Check if TopologyDebugger appears (should show device count)');
        console.log('3. Look for collaboration toggle/enable button');
        console.log('4. Enable collaboration mode');
        console.log('5. Check if TopologyDebugger changes (device count should remain)');
        console.log('6. Look for any error messages in browser console');
        
        console.log('\n🔍 4. Creating test data for topology...');
        await createTopologyTestData();
        
    } catch (error) {
        console.error('❌ Investigation failed:', error.message);
        console.log('\n💡 ERROR DIAGNOSIS:');
        console.log('- Network connection issue');
        console.log('- Server not running on localhost:3000');
        console.log('- CORS or authentication cookie issue');
    }
}

async function createTopologyTestData() {
    const testData = {
        scanId: 'auth-topology-test-' + Date.now(),
        name: 'Authentication Topology Test',
        ipRange: '192.168.1.0/24', 
        deviceCount: 4,
        scanData: {
            'Cisco': [
                {
                    ip: '192.168.1.1',
                    hostname: 'gateway',
                    mac: '00:11:22:33:44:01',
                    ports: [22, 80, 443],
                    vendor: 'Cisco',
                    deviceType: 'router'
                }
            ],
            'HP': [
                {
                    ip: '192.168.1.10',
                    hostname: 'switch',
                    mac: '00:11:22:33:44:02',
                    ports: [22, 80, 161],
                    vendor: 'HP',
                    deviceType: 'switch'
                }
            ],
            'Dell': [
                {
                    ip: '192.168.1.100',
                    hostname: 'workstation1',
                    mac: '00:11:22:33:44:03',
                    ports: [22, 3389],
                    vendor: 'Dell',
                    deviceType: 'workstation'
                },
                {
                    ip: '192.168.1.101',
                    hostname: 'workstation2',
                    mac: '00:11:22:33:44:04',
                    ports: [22, 80],
                    vendor: 'Dell',
                    deviceType: 'workstation'
                }
            ]
        },
        metadata: {
            scanType: 'full',
            hasNetworkTopology: true,
            deviceTypes: ['router', 'switch', 'workstation']
        }
    };
    
    try {
        const response = await fetch('http://localhost:3000/api/scan-history', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            credentials: 'include'
        });
        
        if (response.status === 401) {
            console.log('❌ Cannot create test data: Authentication required');
            console.log('💡 SOLUTION: Login to the application first');
            console.log('   1. Go to http://localhost:3000');
            console.log('   2. Login with your credentials');
            console.log('   3. Re-run this test');
            return;
        }
        
        const responseText = await response.text();
        
        try {
            const result = JSON.parse(responseText);
            
            if (response.ok) {
                console.log('✅ Test topology data created successfully');
                console.log('🌐 Now check http://localhost:3000/networkscan for topology display');
                
                console.log('\n🔧 NEXT STEPS FOR TOPOLOGY DEBUGGING:');
                console.log('1. Navigate to http://localhost:3000/networkscan');
                console.log('2. Look for TopologyDebugger in top-right corner');
                console.log('3. Check browser console for "🔍 TOPOLOGY DEBUGGER:" messages');
                console.log('4. Enable collaboration mode and compare before/after');
                console.log('5. Check SVG count: document.querySelectorAll("svg").length');
            } else {
                console.log('❌ Failed to create test data:', result.error || 'Unknown error');
            }
        } catch (parseError) {
            console.log('❌ Response parsing failed:', responseText.substring(0, 200));
        }
        
    } catch (error) {
        console.log('❌ Test data creation failed:', error.message);
    }
}

console.log('🎯 EXPECTED RESULTS:');
console.log('- If authenticated: Scan history accessible, can create test data');
console.log('- If NOT authenticated: 401 errors, need to login first');
console.log('- Topology should display when scan data exists');
console.log('- Collaboration mode should NOT break topology display');

// Use native fetch polyfill
if (typeof fetch === 'undefined') {
    console.log('❌ This script requires a modern Node.js version with fetch support');
    console.log('💡 Use Node.js 18+ or install node-fetch');
} else {
    investigateAuthAndTopology();
}
