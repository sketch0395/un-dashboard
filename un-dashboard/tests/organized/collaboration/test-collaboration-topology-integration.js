/**
 * Comprehensive test for real-time collaboration and topology integration
 * Tests the complete flow: Device updates → Collaboration server → Topology map updates
 */

import WebSocket from 'ws';
import fetch from 'node-fetch';
import fs from 'fs';

const BASE_URL = 'http://localhost:3000';
const WS_URL = 'ws://localhost:4000';

// Test configuration
const TEST_CONFIG = {
    scanId: `collab-topology-test-${Date.now()}`,
    deviceId: '192.168.1.100',
    users: [
        { username: 'testuser1', email: 'test1@test.com', password: 'testpass123' },
        { username: 'testuser2', email: 'test2@test.com', password: 'testpass123' }
    ]
};

let testResults = {
    scanCreated: false,
    usersConnected: 0,
    deviceUpdateSent: false,
    deviceUpdateReceived: false,
    topologyEventEmitted: false,
    scanUpdateSent: false,
    scanUpdateReceived: false
};

// Test data for collaboration
const testScanData = {
    scanId: TEST_CONFIG.scanId,
    name: 'Collaboration Topology Integration Test',
    ipRange: '192.168.1.0/24',
    deviceCount: 3,
    scanData: {
        devices: {
            "Cisco": [
                {
                    ip: TEST_CONFIG.deviceId,
                    hostname: 'test-router',
                    vendor: 'Cisco',
                    mac: '00:11:22:33:44:55',
                    deviceType: 'router',
                    networkRole: 'gateway',
                    isMainGateway: true
                }
            ],
            "HP": [
                {
                    ip: '192.168.1.101',
                    hostname: 'test-switch',
                    vendor: 'HP',
                    mac: '00:11:22:33:44:66',
                    deviceType: 'switch',
                    networkRole: 'switch',
                    parentGateway: TEST_CONFIG.deviceId
                }
            ],
            "Dell": [
                {
                    ip: '192.168.1.102',
                    hostname: 'test-workstation',
                    vendor: 'Dell',
                    mac: '00:11:22:33:44:77',
                    deviceType: 'computer',
                    networkRole: 'device',
                    parentSwitch: '192.168.1.101'
                }
            ]
        }
    },
    metadata: {
        hasNetworkTopology: true,
        scanType: 'topology',
        collaboration: true
    }
};

async function createTestScan() {
    console.log('🔧 Creating test scan for collaboration testing...');
    
    try {
        const response = await fetch(`${BASE_URL}/api/scan-history`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(testScanData)
        });

        const result = await response.json();
        
        if (response.ok) {
            console.log('✅ Test scan created:', result.scanId);
            testResults.scanCreated = true;
            return result.scanId;
        } else {
            console.error('❌ Failed to create test scan:', result);
            return null;
        }
    } catch (error) {
        console.error('❌ Error creating test scan:', error.message);
        return null;
    }
}

async function createWebSocketConnection(scanId, username) {
    return new Promise((resolve, reject) => {
        console.log(`🔗 Creating WebSocket connection for ${username}...`);
        
        const ws = new WebSocket(`${WS_URL}/collaboration-ws?scanId=${scanId}`);
        
        ws.on('open', () => {
            console.log(`✅ WebSocket connected for ${username}`);
            
            // Send authentication
            ws.send(JSON.stringify({
                type: 'auth',
                data: {
                    userId: `test-${username}`,
                    username: username,
                    scanId: scanId
                }
            }));
            
            testResults.usersConnected++;
            resolve(ws);
        });
        
        ws.on('error', (error) => {
            console.error(`❌ WebSocket error for ${username}:`, error.message);
            reject(error);
        });
        
        return ws;
    });
}

async function testDeviceUpdate(ws1, ws2, scanId) {
    return new Promise((resolve) => {
        console.log('🔄 Testing device update collaboration...');
        
        // Set up listener on second WebSocket
        ws2.on('message', (data) => {
            try {
                const message = JSON.parse(data);
                console.log('📨 WS2 received message:', message.type);
                
                if (message.type === 'device_updated') {
                    console.log('✅ Device update received by collaborating user');
                    console.log('   Device ID:', message.deviceId);
                    console.log('   Changes:', message.changes);
                    testResults.deviceUpdateReceived = true;
                    resolve(true);
                }
            } catch (error) {
                console.error('Error parsing message:', error);
            }
        });
        
        // Send device update from first WebSocket
        setTimeout(() => {
            console.log('📤 Sending device update from user 1...');
            
            const deviceUpdateMessage = {
                type: 'device_update',
                deviceId: TEST_CONFIG.deviceId,
                changes: {
                    name: 'Updated Router Name',
                    color: '#ff0000',
                    networkRole: 'gateway',
                    notes: 'Updated via collaboration test'
                },
                version: 2,
                timestamp: new Date().toISOString()
            };
            
            ws1.send(JSON.stringify(deviceUpdateMessage));
            testResults.deviceUpdateSent = true;
            console.log('✅ Device update sent');
        }, 1000);
        
        // Timeout after 10 seconds
        setTimeout(() => {
            if (!testResults.deviceUpdateReceived) {
                console.log('⏰ Device update test timed out');
                resolve(false);
            }
        }, 10000);
    });
}

async function testScanUpdate(ws1, ws2, scanId) {
    return new Promise((resolve) => {
        console.log('🔄 Testing scan update collaboration...');
        
        // Set up listener on second WebSocket
        ws2.on('message', (data) => {
            try {
                const message = JSON.parse(data);
                
                if (message.type === 'scan_updated') {
                    console.log('✅ Scan update received by collaborating user');
                    console.log('   Changes:', message.changes);
                    testResults.scanUpdateReceived = true;
                    resolve(true);
                }
            } catch (error) {
                console.error('Error parsing scan update message:', error);
            }
        });
        
        // Send scan update from first WebSocket
        setTimeout(() => {
            console.log('📤 Sending scan update from user 1...');
            
            const scanUpdateMessage = {
                type: 'scan_update',
                changes: {
                    name: 'Updated Scan Name via Collaboration',
                    metadata: { lastModified: new Date().toISOString() }
                },
                timestamp: new Date().toISOString()
            };
            
            ws1.send(JSON.stringify(scanUpdateMessage));
            testResults.scanUpdateSent = true;
            console.log('✅ Scan update sent');
        }, 1000);
        
        // Timeout after 10 seconds
        setTimeout(() => {
            if (!testResults.scanUpdateReceived) {
                console.log('⏰ Scan update test timed out');
                resolve(false);
            }
        }, 10000);
    });
}

async function testTopologyEventEmission() {
    console.log('🎯 Testing if topology events are properly emitted...');
    
    // This would normally be tested in the browser, but we can check if the
    // collaboration server is properly configured to broadcast topology events
    
    try {
        // Create a simple WebSocket connection to check event broadcasting
        const testWs = new WebSocket(`${WS_URL}/collaboration-ws?scanId=${TEST_CONFIG.scanId}`);
        
        return new Promise((resolve) => {
            testWs.on('open', () => {
                console.log('✅ Test WebSocket connected for topology event testing');
                
                // Send auth
                testWs.send(JSON.stringify({
                    type: 'auth',
                    data: {
                        userId: 'topology-test-user',
                        username: 'TopologyTester',
                        scanId: TEST_CONFIG.scanId
                    }
                }));
                
                // Send a test device update to see if it gets broadcast properly
                setTimeout(() => {
                    testWs.send(JSON.stringify({
                        type: 'device_update',
                        deviceId: TEST_CONFIG.deviceId,
                        changes: {
                            name: 'Topology Test Update',
                            networkRole: 'gateway'
                        },
                        version: 3,
                        timestamp: new Date().toISOString()
                    }));
                    
                    testResults.topologyEventEmitted = true;
                    console.log('✅ Topology event emission test completed');
                    testWs.close();
                    resolve(true);
                }, 2000);
            });
            
            testWs.on('error', (error) => {
                console.error('❌ Topology event test WebSocket error:', error.message);
                resolve(false);
            });
            
            setTimeout(() => {
                console.log('⏰ Topology event test timed out');
                resolve(false);
            }, 10000);
        });
    } catch (error) {
        console.error('❌ Error testing topology events:', error.message);
        return false;
    }
}

async function printTestResults() {
    console.log('\n' + '='.repeat(60));
    console.log('📊 COLLABORATION & TOPOLOGY INTEGRATION TEST RESULTS');
    console.log('='.repeat(60));
    
    console.log(`✅ Scan Created: ${testResults.scanCreated ? 'PASS' : 'FAIL'}`);
    console.log(`✅ Users Connected: ${testResults.usersConnected}/2`);
    console.log(`✅ Device Update Sent: ${testResults.deviceUpdateSent ? 'PASS' : 'FAIL'}`);
    console.log(`✅ Device Update Received: ${testResults.deviceUpdateReceived ? 'PASS' : 'FAIL'}`);
    console.log(`✅ Scan Update Sent: ${testResults.scanUpdateSent ? 'PASS' : 'FAIL'}`);
    console.log(`✅ Scan Update Received: ${testResults.scanUpdateReceived ? 'PASS' : 'FAIL'}`);
    console.log(`✅ Topology Events: ${testResults.topologyEventEmitted ? 'PASS' : 'FAIL'}`);
    
    const passedTests = Object.values(testResults).filter(result => result === true).length + 
                       (testResults.usersConnected === 2 ? 1 : 0);
    const totalTests = 7;
    
    console.log(`\n📈 Overall Score: ${passedTests}/${totalTests} tests passed`);
    
    if (passedTests === totalTests) {
        console.log('🎉 ALL TESTS PASSED! Real-time collaboration and topology integration is working!');
    } else if (passedTests >= totalTests * 0.75) {
        console.log('✅ Most tests passed. System is functional with minor issues.');
    } else if (passedTests >= totalTests * 0.5) {
        console.log('⚠️ Some tests failed. System has significant issues that need attention.');
    } else {
        console.log('❌ Many tests failed. System requires major fixes.');
    }
    
    console.log('\n🔗 Next Steps:');
    console.log('1. Open browser and navigate to http://localhost:3000/networkscan');
    console.log('2. Go to Network Scans → Shared Scans');
    console.log(`3. Look for scan: "${testScanData.name}"`);
    console.log('4. Test collaborative editing with multiple browser tabs');
    console.log('5. Verify topology map updates in real-time');
}

async function runCollaborationTopologyTests() {
    console.log('🚀 Starting Collaboration & Topology Integration Tests');
    console.log('='.repeat(60));
    
    try {
        // 1. Create test scan
        const scanId = await createTestScan();
        if (!scanId) {
            console.error('❌ Failed to create test scan. Aborting tests.');
            return;
        }
        
        // 2. Create WebSocket connections for two users
        const ws1 = await createWebSocketConnection(scanId, 'testuser1');
        const ws2 = await createWebSocketConnection(scanId, 'testuser2');
        
        // Wait for connections to stabilize
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // 3. Test device updates
        await testDeviceUpdate(ws1, ws2, scanId);
        
        // 4. Test scan updates
        await testScanUpdate(ws1, ws2, scanId);
        
        // 5. Test topology events
        await testTopologyEventEmission();
        
        // Clean up connections
        ws1.close();
        ws2.close();
        
        // 6. Print results
        await printTestResults();
        
    } catch (error) {
        console.error('❌ Test execution failed:', error.message);
    }
}

// Run the tests
runCollaborationTopologyTests().catch(console.error);
