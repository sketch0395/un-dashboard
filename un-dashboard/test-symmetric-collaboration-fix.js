#!/usr/bin/env node

/**
 * Test to verify the symmetric collaboration fix
 * This test checks that users can see their own changes reflected back
 */

const WebSocket = require('ws');
const fetch = require('node-fetch');

// Test configuration
const TEST_CONFIG = {
    host: 'localhost',
    collaborationPort: 4000,
    mainPort: 3000,
    scanId: 'test-symmetric-collaboration',
    deviceId: 'test-device-symmetric',
    testTimeout: 30000
};

let testResults = {
    connectionEstablished: false,
    sessionDataReceived: false,
    deviceLocked: false,
    deviceUpdateSent: false,
    deviceUpdateReceived: false, // This is what we're testing!
    scanUpdateSent: false,
    scanUpdateReceived: false  // This too!
};

console.log('🧪 Testing Symmetric Collaboration Fix');
console.log('=====================================');
console.log('This test verifies that users can see their own changes reflected back');
console.log('from the collaboration system (symmetric collaboration).\n');

async function getAuthToken() {
    try {
        // Try to get auth token (this assumes server is running and user is logged in)
        const response = await fetch(`http://${TEST_CONFIG.host}:${TEST_CONFIG.mainPort}/api/auth/verify`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            }
        });

        if (response.ok) {
            console.log('✅ Authentication verified with main server');
            return 'authenticated';
        } else {
            console.log('⚠️ No active authentication, using test token');
            return 'test-token';
        }
    } catch (error) {
        console.log('⚠️ Could not verify auth, using test token:', error.message);
        return 'test-token';
    }
}

async function testSymmetricCollaboration() {
    return new Promise(async (resolve, reject) => {
        const timeout = setTimeout(() => {
            console.log('\n⏰ Test timed out');
            printResults();
            reject(new Error('Test timeout'));
        }, TEST_CONFIG.testTimeout);

        try {
            const authToken = await getAuthToken();
            
            // Connect to collaboration server
            const wsUrl = `ws://${TEST_CONFIG.host}:${TEST_CONFIG.collaborationPort}/collaboration-ws?scanId=${TEST_CONFIG.scanId}&token=${authToken}`;
            console.log('🔗 Connecting to collaboration server...');
            
            const ws = new WebSocket(wsUrl);

            ws.on('open', () => {
                console.log('✅ WebSocket connection established');
                testResults.connectionEstablished = true;
            });

            ws.on('message', (data) => {
                try {
                    const message = JSON.parse(data.toString());
                    console.log(`📨 Received: ${message.type}`);

                    switch (message.type) {
                        case 'session_data':
                            testResults.sessionDataReceived = true;
                            console.log('✅ Session data received');
                            
                            // Step 1: Lock a device
                            console.log('🔒 Sending device lock request...');
                            ws.send(JSON.stringify({
                                type: 'device_lock',
                                deviceId: TEST_CONFIG.deviceId,
                                timestamp: new Date()
                            }));
                            break;

                        case 'device_locked':
                            testResults.deviceLocked = true;
                            console.log('✅ Device locked successfully');
                            
                            // Step 2: Send device update (this is what we're testing)
                            console.log('📱 Sending device update...');
                            ws.send(JSON.stringify({
                                type: 'device_update',
                                deviceId: TEST_CONFIG.deviceId,
                                changes: {
                                    name: 'Symmetric Test Device',
                                    description: 'Testing if user sees own changes',
                                    testProperty: 'symmetric-collaboration-test'
                                },
                                version: 1,
                                timestamp: new Date()
                            }));
                            testResults.deviceUpdateSent = true;
                            break;

                        case 'device_updated':
                            testResults.deviceUpdateReceived = true;
                            console.log('🎉 Device update received back! (Symmetric collaboration working!)');
                            console.log('   Changes:', message.changes);
                            console.log('   User ID:', message.userId);
                            console.log('   Username:', message.username);
                            
                            // Step 3: Test scan update
                            console.log('📊 Sending scan update...');
                            ws.send(JSON.stringify({
                                type: 'scan_update',
                                changes: {
                                    name: 'Symmetric Test Scan',
                                    metadata: { testProperty: 'symmetric-scan-test' }
                                },
                                timestamp: new Date()
                            }));
                            testResults.scanUpdateSent = true;
                            break;

                        case 'scan_updated':
                            testResults.scanUpdateReceived = true;
                            console.log('🎉 Scan update received back! (Symmetric collaboration working!)');
                            console.log('   Changes:', message.changes);
                            console.log('   User ID:', message.userId);
                            console.log('   Username:', message.username);
                            
                            // All tests complete!
                            console.log('\n🎊 All symmetric collaboration tests completed!');
                            clearTimeout(timeout);
                            ws.close();
                            printResults();
                            resolve(testResults);
                            break;

                        case 'device_lock_failed':
                            console.log(`❌ Device lock failed: ${message.reason}`);
                            break;

                        case 'error':
                            console.log(`❌ Server error: ${message.message}`);
                            break;
                    }
                } catch (error) {
                    console.error('❌ Error parsing message:', error.message);
                }
            });

            ws.on('close', (code, reason) => {
                console.log(`🔌 Connection closed: ${code} - ${reason}`);
            });

            ws.on('error', (error) => {
                console.error('❌ WebSocket error:', error.message);
                clearTimeout(timeout);
                reject(error);
            });

        } catch (error) {
            clearTimeout(timeout);
            reject(error);
        }
    });
}

function printResults() {
    console.log('\n📊 Test Results:');
    console.log('=================');
    
    const results = [
        { name: 'Connection Established', status: testResults.connectionEstablished },
        { name: 'Session Data Received', status: testResults.sessionDataReceived },
        { name: 'Device Locked', status: testResults.deviceLocked },
        { name: 'Device Update Sent', status: testResults.deviceUpdateSent },
        { name: 'Device Update Received Back ⭐', status: testResults.deviceUpdateReceived },
        { name: 'Scan Update Sent', status: testResults.scanUpdateSent },
        { name: 'Scan Update Received Back ⭐', status: testResults.scanUpdateReceived }
    ];

    results.forEach(result => {
        const icon = result.status ? '✅' : '❌';
        const emphasis = result.name.includes('⭐') ? ' (CRITICAL TEST)' : '';
        console.log(`${icon} ${result.name}${emphasis}`);
    });

    const criticalTests = testResults.deviceUpdateReceived && testResults.scanUpdateReceived;
    const allTests = results.every(r => r.status);

    console.log('\n📋 Summary:');
    if (criticalTests) {
        console.log('🎉 SYMMETRIC COLLABORATION FIX SUCCESSFUL!');
        console.log('   Users can now see their own changes reflected back.');
    } else {
        console.log('❌ SYMMETRIC COLLABORATION FIX FAILED!');
        console.log('   Users still cannot see their own changes reflected back.');
    }

    if (allTests) {
        console.log('✅ All collaboration features working correctly.');
    } else {
        console.log('⚠️ Some collaboration features may have issues.');
    }
}

// Run the test
if (require.main === module) {
    testSymmetricCollaboration()
        .then(() => {
            console.log('\n✅ Test completed successfully');
            process.exit(0);
        })
        .catch((error) => {
            console.error('\n❌ Test failed:', error.message);
            process.exit(1);
        });
}

module.exports = { testSymmetricCollaboration };
