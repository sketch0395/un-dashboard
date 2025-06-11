/**
 * Cross-Port Authentication Test
 * Tests using port 3000 auth token with port 4000 WebSocket
 */

const http = require('http');
const WebSocket = require('ws');

console.log('🔄 CROSS-PORT AUTHENTICATION TEST');
console.log('='.repeat(40));

async function getAuthTokenFromPort3000() {
    console.log('1️⃣ Getting auth token from port 3000...');
    
    return new Promise((resolve, reject) => {
        const loginData = JSON.stringify({
            username: 'admin',
            password: 'admin123'
        });
        
        const options = {
            hostname: 'localhost',
            port: 3000,
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
                    if (result.success && result.user) {
                        console.log('✅ Authentication successful on port 3000');
                        console.log('👤 User:', result.user.username);
                        // Look for token in response or cookies
                        const cookies = res.headers['set-cookie'] || [];
                        const authCookie = cookies.find(cookie => cookie.includes('auth-token='));
                        if (authCookie) {
                            const token = authCookie.split('auth-token=')[1].split(';')[0];
                            console.log('🍪 Auth token found in cookie');
                            resolve(token);
                        } else {
                            console.log('⚠️ No auth token in cookie, trying user ID');
                            resolve(result.user._id); // Fallback to user ID
                        }
                    } else {
                        reject(new Error('Authentication failed: ' + JSON.stringify(result)));
                    }
                } catch (err) {
                    reject(new Error('Failed to parse auth response: ' + err.message));
                }
            });
        });
        
        req.on('error', (err) => {
            reject(new Error('Port 3000 auth request failed: ' + err.message));
        });
        
        req.write(loginData);
        req.end();
    });
}

async function testWebSocketWithAuth(token) {
    console.log('\n2️⃣ Testing WebSocket connection with auth token...');
    
    return new Promise((resolve, reject) => {
        const scanId = 'test-scan-' + Date.now();
        let wsUrl = `ws://localhost:4000/collaboration-ws?scanId=${scanId}`;
        
        // Try different ways to send the auth token
        const ws = new WebSocket(wsUrl, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Cookie': `auth-token=${token}`
            }
        });
        
        let resolved = false;
        
        ws.on('open', () => {
            console.log('✅ WebSocket connected to port 4000');
            
            // Send auth message
            ws.send(JSON.stringify({
                type: 'authenticate',
                token: token,
                scanId: scanId
            }));
            
            // Test lock request
            setTimeout(() => {
                console.log('📋 Testing lock request...');
                ws.send(JSON.stringify({
                    type: 'requestLock',
                    deviceId: 'test-device-123',
                    scanId: scanId
                }));
            }, 1000);
        });
        
        ws.on('message', (data) => {
            try {
                const message = JSON.parse(data);
                console.log('📨 WebSocket message:', message);
                
                if (message.type === 'authResult') {
                    if (message.success) {
                        console.log('✅ Authentication successful on port 4000');
                        console.log('👤 Authenticated user:', message.user?.username || 'Unknown');
                    } else {
                        console.log('❌ Authentication failed on port 4000:', message.error);
                    }
                }
                
                if (message.type === 'lockGranted') {
                    console.log('🔒 Lock request successful!');
                    if (!resolved) {
                        resolved = true;
                        ws.close();
                        resolve({ success: true, message: 'Full authentication and collaboration working' });
                    }
                }
                
                if (message.type === 'lockDenied') {
                    console.log('❌ Lock request denied:', message.reason);
                    if (!resolved) {
                        resolved = true;
                        ws.close();
                        resolve({ success: false, message: 'Lock denied: ' + message.reason });
                    }
                }
                
                if (message.type === 'error') {
                    console.log('❌ WebSocket error:', message.error);
                    if (!resolved) {
                        resolved = true;
                        ws.close();
                        resolve({ success: false, message: 'WebSocket error: ' + message.error });
                    }
                }
                
            } catch (err) {
                console.log('❌ Failed to parse WebSocket message:', err.message);
            }
        });
        
        ws.on('error', (err) => {
            console.log('❌ WebSocket error:', err.message);
            if (!resolved) {
                resolved = true;
                reject(new Error('WebSocket connection failed: ' + err.message));
            }
        });
        
        ws.on('close', (code, reason) => {
            console.log('🔌 WebSocket closed:', code, reason?.toString() || '');
            if (!resolved) {
                resolved = true;
                resolve({ success: false, message: 'WebSocket closed without completing test' });
            }
        });
        
        // Timeout after 15 seconds
        setTimeout(() => {
            if (!resolved) {
                resolved = true;
                ws.close();
                resolve({ success: false, message: 'Test timeout - no complete response received' });
            }
        }, 15000);
    });
}

async function testDirectPort4000Auth() {
    console.log('\n3️⃣ Testing direct authentication on port 4000...');
    
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
                console.log('📊 Port 4000 auth response status:', res.statusCode);
                console.log('📊 Port 4000 auth response:', data);
                resolve({ status: res.statusCode, data: data });
            });
        });
        
        req.on('error', (err) => {
            console.log('❌ Port 4000 auth not available:', err.message);
            resolve({ error: err.message });
        });
        
        req.write(loginData);
        req.end();
    });
}

async function runTest() {
    try {
        console.log('🚀 Starting cross-port authentication test...\n');
        
        // Test 1: Get auth token from port 3000
        const authToken = await getAuthTokenFromPort3000();
        console.log('🎯 Auth token obtained:', authToken ? 'YES' : 'NO');
        
        // Test 2: Try direct auth on port 4000
        const port4000Auth = await testDirectPort4000Auth();
        
        // Test 3: Use port 3000 token with port 4000 WebSocket
        if (authToken) {
            const wsTest = await testWebSocketWithAuth(authToken);
            console.log('\n🎯 FINAL RESULT:', wsTest.message);
            
            if (!wsTest.success) {
                console.log('\n💡 RECOMMENDATIONS:');
                console.log('1. Enable auth endpoint on port 4000');
                console.log('2. Share session/token store between ports');
                console.log('3. Proxy auth requests from port 4000 to 3000');
                console.log('4. Move collaboration to port 3000');
            }
        } else {
            console.log('❌ Cannot proceed without auth token');
        }
        
    } catch (error) {
        console.log('❌ Test failed:', error.message);
    }
}

// Run the test
runTest();
