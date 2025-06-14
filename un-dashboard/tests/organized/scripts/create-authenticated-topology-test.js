// Create test topology data with proper authentication
console.log('🚀 CREATING TEST TOPOLOGY DATA');

const fetch = require('node-fetch');

async function createTestTopologyData() {
    try {
        // Step 1: Login to get authentication cookies
        console.log('🔑 Logging in as admin...');
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

        if (loginResponse.status !== 200) {
            throw new Error('Login failed');
        }

        const authCookies = loginResponse.headers.get('set-cookie');
        console.log('✅ Admin logged in successfully');

        // Step 2: Create test topology data
        console.log('📊 Creating test scan with topology data...');
        
        const testTopologyData = {
            scanId: 'topology-test-' + Date.now(),
            name: 'Test Network Topology - Gateway/Switch/Devices',
            ipRange: '192.168.1.0/24',
            deviceCount: 4,
            scanData: {
                'Cisco': [
                    {
                        ip: '192.168.1.1',
                        hostname: 'main-gateway.local',
                        mac: '00:11:22:33:44:01',
                        ports: [22, 80, 443],
                        vendor: 'Cisco',
                        deviceType: 'router',
                        status: 'up',
                        responseTime: 1,
                        lastSeen: new Date().toISOString(),
                        isOnline: true
                    },
                    {
                        ip: '192.168.1.10',
                        hostname: 'core-switch.local',
                        mac: '00:11:22:33:44:02',
                        ports: [22, 80, 161],
                        vendor: 'Cisco',
                        deviceType: 'switch',
                        status: 'up',
                        responseTime: 2,
                        lastSeen: new Date().toISOString(),
                        isOnline: true
                    }
                ],
                'Dell': [
                    {
                        ip: '192.168.1.100',
                        hostname: 'workstation-01.local',
                        mac: '00:11:22:33:44:03',
                        ports: [22, 3389],
                        vendor: 'Dell',
                        deviceType: 'workstation',
                        status: 'up',
                        responseTime: 5,
                        lastSeen: new Date().toISOString(),
                        isOnline: true
                    }
                ],
                'HP': [
                    {
                        ip: '192.168.1.101',
                        hostname: 'server-01.local',
                        mac: '00:11:22:33:44:04',
                        ports: [22, 80, 443, 3306],
                        vendor: 'HP',
                        deviceType: 'server',
                        status: 'up',
                        responseTime: 3,
                        lastSeen: new Date().toISOString(),
                        isOnline: true
                    }
                ]
            },
            metadata: {
                scanType: 'full',
                scanDuration: 45.7,
                osDetection: true,
                serviceDetection: true,
                hasNetworkTopology: true,
                deviceTypes: ['router', 'switch', 'workstation', 'server'],
                timestamp: new Date().toISOString()
            },
            settings: {
                isPrivate: false,
                isFavorite: true,
                tags: ['topology-test', 'debug', 'collaboration-test'],
                notes: 'Test topology data for debugging collaboration mode display'
            }
        };

        // Step 3: Submit the test data
        console.log('📤 Submitting test topology data...');
        const createResponse = await fetch('http://localhost:3000/api/scan-history', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Cookie': authCookies
            },
            body: JSON.stringify(testTopologyData)
        });

        console.log('📊 Create response status:', createResponse.status);

        if (createResponse.status === 200 || createResponse.status === 201) {
            const result = await createResponse.json();
            console.log('✅ Test topology data created successfully!');
            console.log('📄 Scan ID:', result.scanId || result._id);
            
            // Step 4: Verify the data was created
            console.log('\n🔍 Verifying scan data...');
            const verifyResponse = await fetch('http://localhost:3000/api/scan-history', {
                headers: {
                    'Cookie': authCookies
                }
            });            if (verifyResponse.status === 200) {
                const response = await verifyResponse.json();
                const scans = response.scanHistory || response;
                console.log('📈 Total scans available:', Array.isArray(scans) ? scans.length : 'Not an array');
                
                if (Array.isArray(scans) && scans.length > 0) {
                    // Filter for topology scans
                    const topologyScans = scans.filter(scan => 
                        scan.metadata && scan.metadata.hasNetworkTopology
                    );
                    
                    console.log('\n🎯 SUCCESS! Topology data is now available:');
                    console.log(`📊 Total scans: ${scans.length}`);
                    console.log(`🌐 Topology scans: ${topologyScans.length}`);
                    
                    topologyScans.slice(-3).forEach((scan, index) => {
                        console.log(`  📊 ${scan.name || scan.scanId}: ${scan.deviceCount || 0} devices`);
                    });
                    
                    console.log('\n🌐 READY FOR TOPOLOGY TESTING!');
                    console.log('🔄 Next steps:');
                    console.log('1. Navigate to http://localhost:3000/networkscan in the browser');
                    console.log('2. Login with admin/admin123 if not already logged in');
                    console.log('3. Look for TopologyDebugger in top-right corner');
                    console.log('4. Check if network topology visualization appears');
                    console.log('5. Test collaboration mode to see if topology persists');
                } else {
                    console.log('⚠️  Verification failed - no scans found');
                }
            } else {
                console.log('❌ Verification failed - could not retrieve scans');
            }
            
        } else {
            const errorText = await createResponse.text();
            console.log('❌ Failed to create test data:', errorText);
        }

    } catch (error) {
        console.log('❌ Error creating test topology data:', error.message);
    }
}

createTestTopologyData();
