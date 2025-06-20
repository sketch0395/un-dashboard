console.log('🔍 COLLABORATION TOPOLOGY DISPLAY TEST');
console.log('='.repeat(50));

const fs = require('fs');

// Load authentication data
const loginData = JSON.parse(fs.readFileSync('./login-data.json', 'utf8'));

if (!loginData.token) {
    console.error('❌ No authentication token found');
    process.exit(1);
}

async function testCollaborationTopologyDisplay() {
    console.log('🧪 Testing topology display in collaboration mode...\n');

    try {
        // First, create test scan data specifically for topology testing
        const testScanData = {
            scanId: 'collaboration-topology-display-test-001',
            name: 'Collaboration Topology Display Test',
            ipRange: '192.168.50.0/24',
            deviceCount: 4,
            scanData: {
                devices: {
                    "Cisco": [
                        {
                            ip: "192.168.50.1",
                            hostname: "collab-gateway.local", 
                            status: "up",
                            vendor: "Cisco",
                            mac: "00:50:56:AA:BB:CC",
                            deviceType: "router",
                            networkRole: "gateway",
                            isMainGateway: true,
                            ports: [22, 80, 443]
                        },
                        {
                            ip: "192.168.50.10",
                            hostname: "collab-switch.local",
                            status: "up", 
                            vendor: "Cisco",
                            mac: "00:50:56:AA:BB:DD",
                            deviceType: "switch",
                            networkRole: "switch",
                            parentGateway: "192.168.50.1",
                            ports: [22, 80, 161]
                        }
                    ],
                    "Dell": [
                        {
                            ip: "192.168.50.100",
                            hostname: "collab-pc1.local",
                            status: "up",
                            vendor: "Dell",
                            mac: "00:50:56:AA:BB:EE", 
                            deviceType: "computer",
                            networkRole: "device",
                            parentSwitch: "192.168.50.10",
                            ports: [22, 3389]
                        },
                        {
                            ip: "192.168.50.101",
                            hostname: "collab-pc2.local",
                            status: "up",
                            vendor: "Dell",
                            mac: "00:50:56:AA:BB:FF",
                            deviceType: "computer", 
                            networkRole: "device",
                            parentSwitch: "192.168.50.10",
                            ports: [22, 80]
                        }
                    ]
                }
            },
            metadata: {
                scanType: 'collaboration-topology-test',
                scanDuration: 10000,
                hasNetworkTopology: true,
                deviceTypes: ['router', 'switch', 'computer'],
                timestamp: new Date().toISOString()
            },
            settings: {
                isPrivate: false,
                isFavorite: true,
                tags: ['collaboration', 'topology-test'],
                notes: 'Test scan for verifying topology display in collaboration mode'
            }
        };

        console.log('📊 Creating test scan for collaboration topology...');
        
        // Create the test scan
        const createResponse = await fetch('http://localhost:3000/api/scan-history', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${loginData.token}`
            },
            body: JSON.stringify(testScanData)
        });

        if (!createResponse.ok) {
            throw new Error(`Failed to create test scan: ${createResponse.status} ${createResponse.statusText}`);
        }

        const createResult = await createResponse.json();
        console.log('✅ Test scan created successfully:', createResult.scanId);

        // Wait a moment for the scan to be processed
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Verify the scan exists and has proper structure
        console.log('\n🔍 Verifying scan data structure...');
        
        const verifyResponse = await fetch(`http://localhost:3000/api/scan-history/${createResult.scanId}`, {
            headers: {
                'Authorization': `Bearer ${loginData.token}`
            }
        });

        if (!verifyResponse.ok) {
            throw new Error(`Failed to verify scan: ${verifyResponse.status}`);
        }

        const scanData = await verifyResponse.json();
        console.log('✅ Scan verification successful');
        console.log(`   - Scan ID: ${scanData.scanId}`);
        console.log(`   - Device Count: ${scanData.deviceCount}`);
        console.log(`   - Has Network Topology: ${scanData.metadata?.hasNetworkTopology}`);

        // Check device structure for topology
        if (scanData.scanData && scanData.scanData.devices) {
            const devices = scanData.scanData.devices;
            let totalDevices = 0;
            let gatewayCount = 0;
            let switchCount = 0;
            let deviceCount = 0;

            Object.values(devices).forEach(vendorDevices => {
                vendorDevices.forEach(device => {
                    totalDevices++;
                    if (device.networkRole === 'gateway') gatewayCount++;
                    else if (device.networkRole === 'switch') switchCount++;
                    else deviceCount++;
                });
            });

            console.log('\n📋 Device Structure Analysis:');
            console.log(`   - Total Devices: ${totalDevices}`);
            console.log(`   - Gateways: ${gatewayCount}`);
            console.log(`   - Switches: ${switchCount}`);  
            console.log(`   - End Devices: ${deviceCount}`);

            // Check for network relationships
            const hasRelationships = Object.values(devices).some(vendorDevices =>
                vendorDevices.some(device => 
                    device.parentGateway || device.parentSwitch || device.isMainGateway
                )
            );

            console.log(`   - Has Network Relationships: ${hasRelationships ? 'Yes' : 'No'}`);

            if (hasRelationships) {
                console.log('✅ Network topology structure is ready for visualization');
            } else {
                console.log('⚠️  Warning: No network relationships found');
            }
        }

        console.log('\n🌐 MANUAL TESTING INSTRUCTIONS:');
        console.log('='.repeat(50));
        console.log('1. Open two browser tabs/windows to http://localhost:3000/networkscan');
        console.log('2. In both tabs, look for the scan: "Collaboration Topology Display Test"');
        console.log('3. Load the scan in the first tab');
        console.log('4. Check if the topology map displays correctly with:');
        console.log('   - Gateway at the top/center (192.168.50.1)');
        console.log('   - Switch connected to gateway (192.168.50.10)');
        console.log('   - Two computers connected to switch (192.168.50.100, 192.168.50.101)');
        console.log('5. Switch between Circular and Hierarchical views');
        console.log('6. Start collaboration on this scan');
        console.log('7. Join collaboration from the second tab');
        console.log('8. Verify topology still displays correctly in collaboration mode');
        console.log('9. Test device editing in collaboration mode');
        console.log('10. Check if topology updates in real-time between tabs\n');

        console.log('🎯 Expected Topology Structure:');
        console.log('   Main Gateway (192.168.50.1)');
        console.log('   └── Switch (192.168.50.10)');
        console.log('       ├── Computer 1 (192.168.50.100)');
        console.log('       └── Computer 2 (192.168.50.101)\n');

        console.log('🔍 DEBUGGING CHECKLIST:');
        console.log('- If topology is blank: Check browser console for errors');
        console.log('- If collaboration breaks topology: Check WebSocket connection status');
        console.log('- If devices missing: Verify scan data structure in DevTools');
        console.log('- If layout issues: Try refreshing or switching visualization types');

        return true;

    } catch (error) {
        console.error('❌ Test failed:', error.message);
        console.error('Stack trace:', error.stack);
        return false;
    }
}

async function checkCollaborationServerStatus() {
    console.log('\n🔌 Checking collaboration server status...');
    
    try {
        const response = await fetch('http://localhost:4000/health');
        if (response.ok) {
            console.log('✅ Collaboration server is running');
            return true;
        } else {
            console.log('❌ Collaboration server responded with error:', response.status);
            return false;
        }
    } catch (error) {
        console.log('❌ Collaboration server is not accessible:', error.message);
        console.log('💡 Make sure to start: npm run dev (collaboration server on port 4000)');
        return false;
    }
}

async function runTest() {
    console.log('🚀 Starting collaboration topology display test...\n');
    
    // Check collaboration server
    const serverOk = await checkCollaborationServerStatus();
    if (!serverOk) {
        console.log('⚠️  Warning: Collaboration server not running, but topology should still work in non-collaborative mode');
    }

    // Run the topology test
    const success = await testCollaborationTopologyDisplay();
    
    if (success) {
        console.log('\n🎉 TEST PREPARATION COMPLETE!');
        console.log('Ready for manual topology display testing in collaboration mode.');
    } else {
        console.log('\n❌ Test preparation failed.');
        console.log('Check the errors above and resolve issues before testing.');
    }
}

runTest();
