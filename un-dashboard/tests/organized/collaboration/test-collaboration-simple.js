/**
 * Simple WebSocket collaboration test
 * Tests the collaboration server connectivity and message passing
 */

import WebSocket from 'ws';

const WS_URL = 'ws://localhost:4000';
const TEST_SCAN_ID = 'test-scan-' + Date.now();

async function testCollaborationWebSocket() {
    console.log('🔗 Testing Collaboration WebSocket Server...');
    console.log('='.repeat(50));
    
    return new Promise((resolve) => {
        const ws = new WebSocket(`${WS_URL}/collaboration-ws?scanId=${TEST_SCAN_ID}`);
        
        let testsPassed = 0;
        const totalTests = 3;
        
        ws.on('open', () => {
            console.log('✅ WebSocket connection established');
            testsPassed++;
            
            // Test authentication
            ws.send(JSON.stringify({
                type: 'auth',
                data: {
                    userId: 'test-user-1',
                    username: 'TestUser1',
                    scanId: TEST_SCAN_ID
                }
            }));
        });
        
        ws.on('message', (data) => {
            try {
                const message = JSON.parse(data);
                console.log('📨 Received message:', message.type);
                
                if (message.type === 'session_data') {
                    console.log('✅ Session data received - authentication successful');
                    testsPassed++;
                    
                    // Test device update broadcasting
                    setTimeout(() => {
                        ws.send(JSON.stringify({
                            type: 'device_update',
                            deviceId: '192.168.1.100',
                            changes: { name: 'Test Device Update' },
                            version: 1,
                            timestamp: new Date().toISOString()
                        }));
                        console.log('📤 Sent device update message');
                    }, 1000);
                }
                
                if (message.type === 'device_updated') {
                    console.log('✅ Device update broadcast received');
                    testsPassed++;
                    
                    // Complete the test
                    setTimeout(() => {
                        ws.close();
                        
                        console.log('\n📊 TEST RESULTS:');
                        console.log(`✅ Tests Passed: ${testsPassed}/${totalTests}`);
                        
                        if (testsPassed === totalTests) {
                            console.log('🎉 ALL TESTS PASSED! Collaboration WebSocket is working!');
                        } else {
                            console.log('⚠️ Some tests failed. Check server logs.');
                        }
                        
                        resolve(testsPassed === totalTests);
                    }, 1000);
                }
            } catch (error) {
                console.error('❌ Error parsing message:', error);
            }
        });
        
        ws.on('error', (error) => {
            console.error('❌ WebSocket error:', error.message);
            resolve(false);
        });
        
        ws.on('close', () => {
            console.log('🔌 WebSocket connection closed');
        });
        
        // Timeout after 15 seconds
        setTimeout(() => {
            if (testsPassed < totalTests) {
                console.log('⏰ Test timed out');
                ws.close();
                resolve(false);
            }
        }, 15000);
    });
}

async function runTest() {
    try {
        await testCollaborationWebSocket();
        console.log('\n🔗 Next Steps:');
        console.log('1. Open browser: http://localhost:3000/networkscan');
        console.log('2. Navigate to Shared Scans');
        console.log('3. Test collaborative editing with multiple tabs');
        console.log('4. Verify topology map updates in real-time');
    } catch (error) {
        console.error('❌ Test failed:', error.message);
    }
}

runTest();
