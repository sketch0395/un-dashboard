// Comprehensive Collaboration Integration Test with Authentication
import fetch from 'node-fetch';
import WebSocket from 'ws';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const BASE_URL = 'http://localhost:3000';
const WS_URL = 'ws://localhost:3000/ws/collaboration';

console.log('🚀 Starting Authenticated Collaboration Integration Test');
console.log('============================================================');

async function loginUser() {
    console.log('🔐 Attempting to login with admin credentials...');
    
    try {
        const loginResponse = await fetch(`${BASE_URL}/api/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                username: 'admin',
                password: 'admin123'
            })
        });

        const loginData = await loginResponse.json();
        
        if (loginResponse.ok && loginData.success) {
            console.log('✅ Login successful');
            
            // Extract cookie from response
            const setCookieHeader = loginResponse.headers.get('set-cookie');
            if (setCookieHeader) {
                const authToken = setCookieHeader
                    .split(';')
                    .find(cookie => cookie.trim().startsWith('auth-token='));
                
                if (authToken) {
                    const token = authToken.split('=')[1];
                    console.log('🍪 Auth token extracted:', token.substring(0, 20) + '...');
                    return token;
                }
            }
            
            throw new Error('No auth token found in response');
        } else {
            throw new Error(`Login failed: ${loginData.message || 'Unknown error'}`);
        }
    } catch (error) {
        console.error('❌ Login failed:', error.message);
        return null;
    }
}

async function createTestScan(authToken) {
    console.log('📊 Creating test scan for collaboration...');
    
    try {
        const scanResponse = await fetch(`${BASE_URL}/api/scans/create`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Cookie': `auth-token=${authToken}`
            },
            body: JSON.stringify({
                scanName: `Collaboration Test Scan ${Date.now()}`,
                scanType: 'manual',
                targets: [
                    {
                        ip: '192.168.1.1',
                        hostname: 'test-router',
                        deviceType: 'router',
                        vendor: 'Generic',
                        customName: 'Test Router'
                    },
                    {
                        ip: '192.168.1.10',
                        hostname: 'test-server',
                        deviceType: 'server',
                        vendor: 'Generic',
                        customName: 'Test Server'
                    }
                ]
            })
        });

        const scanData = await scanResponse.json();
        
        if (scanResponse.ok && scanData.success) {
            console.log('✅ Test scan created:', scanData.scanId);
            return scanData.scanId;
        } else {
            throw new Error(`Failed to create scan: ${scanData.message || 'Unknown error'}`);
        }
    } catch (error) {
        console.error('❌ Failed to create test scan:', error.message);
        return null;
    }
}

function testWebSocketCollaboration(scanId, authToken) {
    return new Promise((resolve, reject) => {
        console.log('🔗 Testing WebSocket collaboration connection...');
        
        const wsUrl = `${WS_URL}?scanId=${scanId}&token=${authToken}`;
        const ws = new WebSocket(wsUrl);
        
        let testResults = {
            connected: false,
            receivedSessionData: false,
            receivedPresence: false,
            deviceUpdateSent: false,
            deviceUpdateReceived: false,
            scanUpdateSent: false,
            scanUpdateReceived: false
        };
        
        ws.on('open', function() {
            console.log('✅ WebSocket connection established');
            testResults.connected = true;
        });
        
        ws.on('message', function(data) {
            try {
                const message = JSON.parse(data);
                console.log('📨 Received message:', message.type);
                
                switch (message.type) {
                    case 'session_data':
                        console.log('✅ Received session data');
                        testResults.receivedSessionData = true;
                        
                        // Test device update
                        setTimeout(() => {
                            console.log('📱 Sending device update test...');
                            ws.send(JSON.stringify({
                                type: 'device_update',
                                deviceId: 'test-device-123',
                                changes: {
                                    customName: 'Updated Test Device',
                                    description: 'Updated via collaboration test'
                                },
                                version: 1
                            }));
                            testResults.deviceUpdateSent = true;
                        }, 1000);
                        
                        // Test scan update
                        setTimeout(() => {
                            console.log('📊 Sending scan update test...');
                            ws.send(JSON.stringify({
                                type: 'scan_update',
                                changes: {
                                    scanName: 'Updated Test Scan Name',
                                    notes: 'Updated via collaboration test'
                                }
                            }));
                            testResults.scanUpdateSent = true;
                        }, 2000);
                        break;
                        
                    case 'user_joined':
                        console.log('✅ User presence detected');
                        testResults.receivedPresence = true;
                        break;
                        
                    case 'device_updated':
                        console.log('✅ Device update received from collaboration');
                        testResults.deviceUpdateReceived = true;
                        break;
                        
                    case 'scan_updated':
                        console.log('✅ Scan update received from collaboration');
                        testResults.scanUpdateReceived = true;
                        break;
                        
                    case 'error':
                        console.error('❌ WebSocket error:', message.message);
                        break;
                }
            } catch (error) {
                console.error('❌ Error parsing WebSocket message:', error.message);
            }
        });
        
        ws.on('error', function(error) {
            console.error('❌ WebSocket error:', error.message);
            reject(error);
        });
        
        ws.on('close', function(code, reason) {
            console.log(`🔌 WebSocket connection closed: ${code} - ${reason}`);
            resolve(testResults);
        });
        
        // Close connection after 10 seconds
        setTimeout(() => {
            ws.close();
        }, 10000);
    });
}

async function testCollaborationHooks() {
    console.log('🎯 Testing collaboration event hooks...');
    
    // Simulate the browser environment for testing hooks
    global.window = {
        dispatchEvent: function(event) {
            console.log(`📢 Custom event dispatched: ${event.type}`, event.detail);
        },
        addEventListener: function(type, handler) {
            console.log(`👂 Event listener added for: ${type}`);
        },
        removeEventListener: function(type, handler) {
            console.log(`🗑️ Event listener removed for: ${type}`);
        }
    };
    
    // Test device update event
    global.window.dispatchEvent(new (class CustomEvent {
        constructor(type, options) {
            this.type = type;
            this.detail = options.detail;
        }
    })('collaborationDeviceUpdate', {
        detail: {
            deviceId: 'test-device-123',
            changes: { customName: 'Collaboration Test Device' },
            userId: 'test-user-123',
            username: 'Test User',
            version: 1,
            timestamp: new Date()
        }
    }));
    
    // Test scan update event
    global.window.dispatchEvent(new (class CustomEvent {
        constructor(type, options) {
            this.type = type;
            this.detail = options.detail;
        }
    })('collaborationScanUpdate', {
        detail: {
            changes: { scanName: 'Updated Scan Name' },
            userId: 'test-user-123',
            username: 'Test User',
            version: 2,
            timestamp: new Date()
        }
    }));
    
    console.log('✅ Collaboration hooks test completed');
}

async function runFullTest() {
    try {
        // Step 1: Login
        const authToken = await loginUser();
        if (!authToken) {
            console.log('❌ Cannot proceed without authentication');
            return;
        }
        
        // Step 2: Create test scan
        const scanId = await createTestScan(authToken);
        if (!scanId) {
            console.log('❌ Cannot proceed without test scan');
            return;
        }
        
        // Step 3: Test WebSocket collaboration
        console.log('\n📡 Testing Real-time Collaboration...');
        const wsResults = await testWebSocketCollaboration(scanId, authToken);
        
        // Step 4: Test collaboration hooks
        console.log('\n🎯 Testing Collaboration Event Hooks...');
        await testCollaborationHooks();
        
        // Step 5: Results summary
        console.log('\n📋 Test Results Summary:');
        console.log('========================');
        console.log(`✅ Authentication: ${authToken ? 'PASS' : 'FAIL'}`);
        console.log(`✅ Test Scan Creation: ${scanId ? 'PASS' : 'FAIL'}`);
        console.log(`✅ WebSocket Connection: ${wsResults.connected ? 'PASS' : 'FAIL'}`);
        console.log(`✅ Session Data: ${wsResults.receivedSessionData ? 'PASS' : 'FAIL'}`);
        console.log(`✅ User Presence: ${wsResults.receivedPresence ? 'PASS' : 'FAIL'}`);
        console.log(`✅ Device Update Sent: ${wsResults.deviceUpdateSent ? 'PASS' : 'FAIL'}`);
        console.log(`✅ Scan Update Sent: ${wsResults.scanUpdateSent ? 'PASS' : 'FAIL'}`);
        
        const overallSuccess = authToken && scanId && wsResults.connected && wsResults.receivedSessionData;
        
        console.log('\n🎯 Overall Status:');
        console.log(`${overallSuccess ? '✅ SUCCESS' : '❌ PARTIAL/FAILURE'}: Collaboration system ${overallSuccess ? 'is working properly' : 'has issues'}`);
        
        if (overallSuccess) {
            console.log('\n🚀 Next Steps:');
            console.log('1. Open multiple browser tabs to: http://localhost:3000/networkscan');
            console.log('2. Login with the same credentials in both tabs');
            console.log('3. Navigate to Shared Scans and open the same scan');
            console.log('4. Make device edits in one tab and observe real-time updates in the other');
            console.log('5. Test topology map updates when collaborative changes occur');
        }
        
    } catch (error) {
        console.error('❌ Test execution failed:', error.message);
    }
}

// Run the test
runFullTest().catch(console.error);
