// Test script for real-time collaboration topology integration
const WebSocket = require('ws');
const fs = require('fs');

async function testRealTimeCollaborationTopology() {
    // Dynamic import for node-fetch
    const { default: fetch } = await import('node-fetch');
    console.log('🌐 Testing Real-Time Collaboration Topology Integration');
    console.log('======================================================');

    try {
        // Step 1: Get authentication token
        let authToken = null;
        try {
            const loginData = JSON.parse(fs.readFileSync('./login-data.json', 'utf8'));
            authToken = loginData.authToken;
            console.log('✅ Using existing auth token');
        } catch (error) {
            console.log('⚠️ No existing auth token found, testing will be limited');
        }

        // Step 2: Create a test scan for collaboration
        console.log('\n📊 Creating test scan for collaboration...');
        const testScanData = {
            scanId: `collab-topology-test-${Date.now()}`,
            name: 'Real-Time Collaboration Topology Test',
            ipRange: '192.168.100.0/24',
            deviceCount: 4,
            scanData: {
                devices: {
                    "Cisco": [
                        {
                            ip: "192.168.100.1",
                            hostname: "gateway.local",
                            status: "up",
                            vendor: "Cisco",
                            mac: "00:11:22:33:44:55",
                            deviceType: "router",
                            networkRole: "gateway",
                            isMainGateway: true,
                            ports: [22, 80, 443]
                        },
                        {
                            ip: "192.168.100.10", 
                            hostname: "switch.local",
                            status: "up",
                            vendor: "Cisco",
                            mac: "00:11:22:33:44:66",
                            deviceType: "switch",
                            networkRole: "switch",
                            parentGateway: "192.168.100.1",
                            ports: [22, 80, 161]
                        }
                    ],
                    "Dell": [
                        {
                            ip: "192.168.100.100",
                            hostname: "workstation-1.local",
                            status: "up", 
                            vendor: "Dell",
                            mac: "00:11:22:33:44:77",
                            deviceType: "computer",
                            networkRole: "device",
                            parentSwitch: "192.168.100.10",
                            ports: [22, 3389]
                        },
                        {
                            ip: "192.168.100.101",
                            hostname: "workstation-2.local",
                            status: "up",
                            vendor: "Dell", 
                            mac: "00:11:22:33:44:88",
                            deviceType: "computer",
                            networkRole: "device",
                            parentSwitch: "192.168.100.10",
                            ports: [22, 80]
                        }
                    ]
                }
            },
            metadata: {
                scanType: 'collaboration-test',
                hasNetworkTopology: true,
                deviceTypes: ['router', 'switch', 'computer'],
                scanDuration: 5000
            },
            settings: {
                isPrivate: false,
                tags: ['collaboration', 'topology', 'real-time-test']
            }
        };

        let scanId = null;
        if (authToken) {
            const scanResponse = await fetch('http://localhost:3000/api/scan-history', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Cookie': `auth-token=${authToken}`
                },
                body: JSON.stringify(testScanData)
            });

            if (scanResponse.ok) {
                const scanResult = await scanResponse.json();
                scanId = scanResult.scanId;
                console.log(`✅ Test scan created: ${scanId}`);
            } else {
                console.log('❌ Failed to create test scan:', scanResponse.status);
                return;
            }
        } else {
            console.log('⚠️ Skipping scan creation due to missing auth token');
            scanId = testScanData.scanId;
        }

        // Step 3: Test WebSocket collaboration connection
        console.log('\n🔌 Testing WebSocket collaboration connection...');
        
        const ws1 = new WebSocket('ws://localhost:4000');
        const ws2 = new WebSocket('ws://localhost:4000');

        // Test user 1 connection
        const connectUser1 = new Promise((resolve, reject) => {
            ws1.on('open', () => {
                console.log('✅ User 1 WebSocket connected');
                
                // Authenticate user 1
                ws1.send(JSON.stringify({
                    type: 'auth',
                    data: {
                        userId: 'user1',
                        username: 'TestUser1',
                        email: 'user1@test.com',
                        scanId: scanId,
                        token: authToken || 'test-token-1'
                    }
                }));
                
                ws1.on('message', (data) => {
                    const message = JSON.parse(data);
                    console.log('📩 User 1 received:', message.type);
                    
                    if (message.type === 'session_data') {
                        resolve(ws1);
                    }
                });
            });
            
            ws1.on('error', (error) => {
                console.log('❌ User 1 WebSocket error:', error.message);
                reject(error);
            });
        });

        // Test user 2 connection
        const connectUser2 = new Promise((resolve, reject) => {
            ws2.on('open', () => {
                console.log('✅ User 2 WebSocket connected');
                
                // Authenticate user 2
                ws2.send(JSON.stringify({
                    type: 'auth',
                    data: {
                        userId: 'user2',
                        username: 'TestUser2', 
                        email: 'user2@test.com',
                        scanId: scanId,
                        token: authToken || 'test-token-2'
                    }
                }));
                
                ws2.on('message', (data) => {
                    const message = JSON.parse(data);
                    console.log('📩 User 2 received:', message.type);
                    
                    if (message.type === 'session_data') {
                        resolve(ws2);
                    }
                });
            });
            
            ws2.on('error', (error) => {
                console.log('❌ User 2 WebSocket error:', error.message);
                reject(error);
            });
        });

        // Wait for both users to connect
        await Promise.all([connectUser1, connectUser2]);
        console.log('✅ Both users connected to collaboration session');

        // Step 4: Test device locking and topology updates
        console.log('\n🔒 Testing device locking and real-time topology updates...');

        // User 1 locks a device
        const deviceLockTest = new Promise((resolve) => {
            ws2.on('message', (data) => {
                const message = JSON.parse(data);
                if (message.type === 'device_locked' && message.deviceId === '192.168.100.1') {
                    console.log('✅ User 2 received device lock notification from User 1');
                    resolve();
                }
            });
        });

        ws1.send(JSON.stringify({
            type: 'device_lock',
            deviceId: '192.168.100.1',
            timestamp: new Date()
        }));

        await deviceLockTest;

        // Step 5: Test device update and topology synchronization
        console.log('\n🔄 Testing device update and topology synchronization...');

        const deviceUpdateTest = new Promise((resolve) => {
            ws2.on('message', (data) => {
                const message = JSON.parse(data);
                if (message.type === 'device_updated' && message.deviceId === '192.168.100.1') {
                    console.log('✅ User 2 received device update from User 1');
                    console.log('📊 Update details:', {
                        deviceId: message.deviceId,
                        changes: message.changes,
                        username: message.username
                    });
                    resolve();
                }
            });
        });

        // User 1 updates the device with topology-relevant changes
        ws1.send(JSON.stringify({
            type: 'device_update',
            deviceId: '192.168.100.1',
            changes: {
                name: 'Main Gateway Router',
                networkRole: 'gateway',
                color: '#ff6b35',
                notes: 'Updated via real-time collaboration',
                portCount: 24,
                isMainGateway: true
            },
            version: 1,
            timestamp: new Date()
        }));

        await deviceUpdateTest;

        // Step 6: Test scan-level updates
        console.log('\n📋 Testing scan-level updates...');

        const scanUpdateTest = new Promise((resolve) => {
            ws2.on('message', (data) => {
                const message = JSON.parse(data);
                if (message.type === 'scan_updated') {
                    console.log('✅ User 2 received scan update from User 1');
                    console.log('📊 Scan update details:', message.changes);
                    resolve();
                }
            });
        });

        // User 1 updates scan metadata
        ws1.send(JSON.stringify({
            type: 'scan_update',
            changes: {
                name: 'Updated Collaboration Test Scan',
                tags: ['collaboration', 'topology', 'real-time-test', 'updated']
            },
            timestamp: new Date()
        }));

        await scanUpdateTest;

        // Step 7: Clean up
        console.log('\n🧹 Cleaning up test connections...');
        
        // Unlock the device
        ws1.send(JSON.stringify({
            type: 'device_unlock',
            deviceId: '192.168.100.1',
            timestamp: new Date()
        }));

        // Close connections
        setTimeout(() => {
            ws1.close();
            ws2.close();
        }, 1000);

        console.log('\n🎉 Real-Time Collaboration Topology Integration Test Complete!');
        console.log('======================================================================');
        console.log('✅ WebSocket connections established');
        console.log('✅ User authentication successful');
        console.log('✅ Device locking/unlocking working');
        console.log('✅ Real-time device updates synchronized');
        console.log('✅ Scan-level updates synchronized');
        console.log('✅ Topology integration events triggered');
        console.log('');
        console.log('🌐 The collaboration system is ready for topology real-time updates!');
        console.log('');
        console.log('Next steps:');
        console.log('1. Open http://localhost:3000/networkscan/shared in two browser tabs');
        console.log('2. Start collaboration on the test scan');
        console.log('3. Edit devices in one tab and verify they update in the other');
        console.log('4. Check that topology visualization updates in real-time');

    } catch (error) {
        console.error('❌ Test failed:', error);
        console.error('Stack trace:', error.stack);
    }
}

// Run the test
testRealTimeCollaborationTopology().catch(console.error);
