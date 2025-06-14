/**
 * Complete Collaboration Authentication Test
 * Tests the full flow: login -> get auth token -> WebSocket connection
 */

const http = require('http');
const WebSocket = require('ws');

console.log('🔐 COLLABORATION AUTHENTICATION FLOW TEST');
console.log('=' .repeat(50));

async function loginAndGetToken() {
    console.log('1️⃣ Attempting login to get authentication token...');
    
    return new Promise((resolve, reject) => {
        const loginData = JSON.stringify({
            username: 'admin',
            password: 'admin123'
        });
        
        const options = {
            hostname: 'localhost',
            port: 4000,
            path: '/api/auth/login',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(loginData)
            }
        };
        
        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                try {
                    const result = JSON.parse(data);
                    console.log('📊 Login response status:', res.statusCode);
                    console.log('📊 Login response:', result.success ? 'SUCCESS' : 'FAILED');
                    
                    if (result.success && result.token) {
                        console.log('✅ Authentication token obtained');
                        resolve(result.token);
                    } else {
                        reject(new Error('Login failed: ' + (result.message || 'Unknown error')));
                    }
                } catch (e) {
                    reject(new Error('Invalid login response: ' + e.message));
                }
            });
        });
        
        req.on('error', (error) => {
            reject(new Error('Login request failed: ' + error.message));
        });
        
        req.write(loginData);
        req.end();
    });
}

async function testAuthenticatedWebSocket(token) {
    console.log('\n2️⃣ Testing authenticated WebSocket connection...');
    
    return new Promise((resolve) => {
        const scanId = 'test-auth-scan-' + Date.now();
        const wsUrl = `ws://localhost:4000/collaboration-ws?scanId=${scanId}&token=${encodeURIComponent(token)}`;
        
        console.log('🔗 Connecting with authentication token...');
        
        const ws = new WebSocket(wsUrl);
        let testResult = { 
            connected: false, 
            authenticated: false, 
            receivedSessionData: false,
            error: null 
        };
        
        const timeout = setTimeout(() => {
            console.log('⏰ WebSocket test timeout');
            testResult.error = 'Connection timeout';
            ws.close();
            resolve(testResult);
        }, 10000);
        
        ws.on('open', () => {
            console.log('✅ WebSocket connection opened');
            testResult.connected = true;
        });
        
        ws.on('message', (data) => {
            try {
                const message = JSON.parse(data);
                console.log('📨 Received message:', message.type);
                
                if (message.type === 'session_data') {
                    console.log('✅ Authentication successful - session data received');
                    console.log('👥 Users in session:', message.users?.length || 0);
                    console.log('🔒 Device locks:', message.locks?.length || 0);
                    testResult.authenticated = true;
                    testResult.receivedSessionData = true;
                    
                    // Test sending a device lock request
                    console.log('\n3️⃣ Testing device lock functionality...');
                    ws.send(JSON.stringify({
                        type: 'device_lock',
                        deviceId: 'test-device-123'
                    }));
                } else if (message.type === 'device_locked') {
                    console.log('✅ Device lock successful');
                    clearTimeout(timeout);
                    ws.close();
                    resolve(testResult);
                } else if (message.type === 'device_lock_failed') {
                    console.log('⚠️ Device lock failed:', message.reason);
                    testResult.error = 'Device lock failed: ' + message.reason;
                } else if (message.type === 'error') {
                    console.log('❌ Server error:', message.message);
                    testResult.error = message.message;
                }
            } catch (e) {
                console.log('📨 Raw message:', data.toString());
            }
        });
        
        ws.on('error', (error) => {
            clearTimeout(timeout);
            console.log('❌ WebSocket error:', error.message);
            testResult.error = error.message;
            resolve(testResult);
        });
        
        ws.on('close', (code, reason) => {
            clearTimeout(timeout);
            console.log(`🔌 WebSocket closed: ${code} - ${reason?.toString()}`);
            
            if (code === 1008) {
                testResult.error = 'Authentication failed';
            }
            
            resolve(testResult);
        });
    });
}

async function runAuthTest() {
    try {
        // Step 1: Login and get token
        const authToken = await loginAndGetToken();
        
        // Step 2: Test authenticated WebSocket
        const wsResult = await testAuthenticatedWebSocket(authToken);
        
        // Results
        console.log('\n📊 AUTHENTICATION TEST RESULTS:');
        console.log('=' .repeat(40));
        console.log(`🔐 Login successful: ✅ YES`);
        console.log(`🔗 WebSocket connected: ${wsResult.connected ? '✅ YES' : '❌ NO'}`);
        console.log(`🎯 Authentication verified: ${wsResult.authenticated ? '✅ YES' : '❌ NO'}`);
        console.log(`📡 Session data received: ${wsResult.receivedSessionData ? '✅ YES' : '❌ NO'}`);
        
        if (wsResult.error) {
            console.log(`❌ Error: ${wsResult.error}`);
        }
        
        if (wsResult.connected && wsResult.authenticated) {
            console.log('\n🎉 COLLABORATION AUTHENTICATION WORKING!');
            console.log('✨ Users should now appear as online in collaboration');
            console.log('🔒 Device locking functionality is operational');
            console.log('');
            console.log('🧪 To test in browser:');
            console.log('   1. Open http://localhost:3000/networkscan');
            console.log('   2. Go to shared scans');
            console.log('   3. Click "🤝 Collaborate" on any scan');
            console.log('   4. You should appear as online');
        } else {
            console.log('\n⚠️ COLLABORATION ISSUES DETECTED');
            if (!wsResult.connected) {
                console.log('🔧 WebSocket connection failed');
            } else if (!wsResult.authenticated) {
                console.log('🔧 Authentication verification failed');
                console.log('💡 Check database connection and auth service');
            }
        }
        
    } catch (error) {
        console.error('\n❌ Authentication test failed:', error.message);
        
        if (error.message.includes('ECONNREFUSED')) {
            console.log('💡 Server may not be running on port 4000');
        } else if (error.message.includes('Login failed')) {
            console.log('💡 Check admin credentials or auth endpoint');
        }
    }
}

// Run the test
runAuthTest().then(() => {
    console.log('\n🏁 Authentication test completed');
    process.exit(0);
}).catch(error => {
    console.error('💥 Test error:', error);
    process.exit(1);
});
