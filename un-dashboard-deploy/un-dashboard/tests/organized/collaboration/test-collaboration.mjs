// Test collaboration system with PowerShell compatibility
import fetch from 'node-fetch';
import WebSocket from 'ws';

async function testCollaboration() {
    console.log('🧪 Testing Collaboration System');
    console.log('================================');

    try {
        // Step 1: Login
        console.log('\n1. 🔐 Authenticating...');
        
        const loginResponse = await fetch('http://localhost:3000/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                username: 'admin',
                password: 'admin123'
            })
        });

        if (!loginResponse.ok) {
            throw new Error(`Login failed: ${loginResponse.status}`);
        }

        const loginData = await loginResponse.json();
        console.log('   ✅ Login successful');
        console.log(`   👤 User: ${loginData.user.username}`);

        // Extract cookies
        const setCookieHeaders = loginResponse.headers.raw()['set-cookie'];
        if (!setCookieHeaders) {
            throw new Error('No authentication cookies received');
        }

        const cookies = setCookieHeaders.map(cookie => cookie.split(';')[0]).join('; ');
        console.log('   🍪 Auth cookies obtained');

        // Step 2: Test WebSocket connection
        console.log('\n2. 🤝 Testing WebSocket collaboration...');
        
        const testScanId = 'test-scan-' + Date.now();
        const wsUrl = `ws://localhost:4000/collaboration-ws?scanId=${testScanId}`;
        
        return new Promise((resolve, reject) => {
            const ws = new WebSocket(wsUrl, {
                headers: {
                    'Cookie': cookies
                }
            });

            const timeout = setTimeout(() => {
                ws.close();
                reject(new Error('WebSocket connection timeout'));
            }, 10000);

            let testStep = 0;

            ws.on('open', () => {
                clearTimeout(timeout);
                console.log('   ✅ WebSocket connection established');
                testStep = 1;
                
                // Send ping
                console.log('\n3. 📨 Testing ping/pong...');
                ws.send(JSON.stringify({ type: 'ping' }));
            });

            ws.on('message', (data) => {
                try {
                    const message = JSON.parse(data.toString());
                    console.log(`   📩 Received: ${message.type}`);
                    
                    if (message.type === 'session_data' && testStep === 1) {
                        console.log('   ✅ Session data received');
                        console.log(`   👥 Users in session: ${message.users?.length || 0}`);
                        console.log(`   🔒 Active locks: ${message.locks?.length || 0}`);
                    }
                    
                    if (message.type === 'pong' && testStep === 1) {
                        console.log('   ✅ Ping/pong successful');
                        testStep = 2;
                        
                        // Test device locking
                        console.log('\n4. 🔒 Testing device locking...');
                        ws.send(JSON.stringify({
                            type: 'device_lock',
                            deviceId: 'test-device-123'
                        }));
                    }
                    
                    if (message.type === 'device_locked' && testStep === 2) {
                        console.log('   ✅ Device lock successful');
                        console.log(`   🔐 Device locked by: ${message.username}`);
                        testStep = 3;
                        
                        // Test device update
                        console.log('\n5. 📝 Testing device update...');
                        ws.send(JSON.stringify({
                            type: 'device_update',
                            deviceId: 'test-device-123',
                            changes: {
                                name: 'Updated Test Device',
                                description: 'Updated via collaboration test'
                            },
                            version: 1
                        }));
                    }
                    
                    if (message.type === 'device_updated' && testStep === 3) {
                        console.log('   ✅ Device update successful');
                        console.log(`   📝 Updated by: ${message.username}`);
                        
                        // All tests passed
                        console.log('\n✅ All collaboration tests passed!');
                        console.log('🎉 Collaboration system is working correctly!');
                        
                        ws.close();
                        resolve();
                    }
                    
                    if (message.type === 'error') {
                        console.error(`   ❌ Error: ${message.message}`);
                        ws.close();
                        reject(new Error(message.message));
                    }
                    
                } catch (error) {
                    console.error('   ❌ Error parsing message:', error);
                }
            });

            ws.on('error', (error) => {
                console.error('   ❌ WebSocket error:', error.message);
                reject(error);
            });

            ws.on('close', (code, reason) => {
                console.log(`   🔌 WebSocket closed: ${code} - ${reason}`);
            });
        });

    } catch (error) {
        console.error('\n❌ Test failed:', error.message);
        throw error;
    }
}

// Run the test
testCollaboration()
    .then(() => {
        console.log('\n🏁 Collaboration test completed successfully!');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n💥 Collaboration test failed:', error.message);
        process.exit(1);
    });
