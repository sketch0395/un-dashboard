/**
 * Simple Device Lock Test
 * Test just the lock request to identify the exact error
 */

const WebSocket = require('ws');
const http = require('http');

console.log('🔒 DEVICE LOCK SPECIFIC TEST');
console.log('='.repeat(40));

async function getAuthToken() {
    console.log('1️⃣ Getting auth token...');
    
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
                        const cookies = res.headers['set-cookie'] || [];
                        const authCookie = cookies.find(cookie => cookie.includes('auth-token='));
                        if (authCookie) {
                            const token = authCookie.split('auth-token=')[1].split(';')[0];
                            resolve(token);
                        } else {
                            resolve(result.user._id);
                        }
                    } else {
                        reject(new Error('Authentication failed'));
                    }
                } catch (err) {
                    reject(err);
                }
            });
        });
        
        req.on('error', reject);
        req.write(loginData);
        req.end();
    });
}

async function testDeviceLock() {
    try {
        const token = await getAuthToken();
        console.log('✅ Got auth token');
        
        console.log('\n2️⃣ Testing device lock with detailed error tracking...');
        
        const scanId = 'test-scan-' + Date.now();
        const deviceId = 'test-device-123';
        let wsUrl = `ws://localhost:4000/collaboration-ws?scanId=${scanId}&token=${token}`;
        
        const ws = new WebSocket(wsUrl);
        
        let sessionReceived = false;
        let lockSent = false;
        
        ws.on('open', () => {
            console.log('✅ WebSocket connected');
        });
        
        ws.on('message', (data) => {
            try {
                const message = JSON.parse(data);
                console.log('📨 Received message:', message.type);
                
                if (message.type === 'session_data' && !sessionReceived) {
                    sessionReceived = true;
                    console.log('✅ Session data received');
                    console.log('   Users:', message.users?.length || 0);
                    console.log('   Locks:', message.locks?.length || 0);
                    
                    // Send lock request
                    console.log('\n📤 Sending device lock request...');
                    const lockRequest = {
                        type: 'device_lock',
                        deviceId: deviceId
                    };
                    console.log('   Request:', JSON.stringify(lockRequest));
                    ws.send(JSON.stringify(lockRequest));
                    lockSent = true;
                }
                
                if (message.type === 'device_locked') {
                    console.log('✅ Device locked successfully!');
                    console.log('   Device:', message.deviceId);
                    console.log('   User:', message.username);
                    ws.close(1000);
                }
                
                if (message.type === 'device_lock_failed') {
                    console.log('❌ Device lock failed:', message.reason);
                    ws.close(1000);
                }
                
                if (message.type === 'error') {
                    console.log('❌ Server error:', message.message || message.error);
                    ws.close(1000);
                }
                
            } catch (err) {
                console.log('❌ Failed to parse message:', err.message);
                console.log('   Raw data:', data.toString());
            }
        });
        
        ws.on('error', (error) => {
            console.log('❌ WebSocket error:', error.message);
        });
        
        ws.on('close', (code, reason) => {
            console.log(`🔌 WebSocket closed: ${code} - ${reason?.toString() || 'No reason'}`);
            
            if (code === 1006 && lockSent) {
                console.log('💡 DIAGNOSIS: Connection closed abnormally after lock request');
                console.log('   This suggests a server-side error in handleDeviceLock method');
            } else if (code === 1008) {
                console.log('💡 DIAGNOSIS: Authentication or authorization issue');
            } else if (code === 1000) {
                console.log('💡 DIAGNOSIS: Normal closure - test completed');
            }
        });
        
        // Timeout after 10 seconds
        setTimeout(() => {
            if (ws.readyState === WebSocket.OPEN) {
                console.log('⏰ Test timeout');
                ws.close();
            }
        }, 10000);
        
    } catch (error) {
        console.log('❌ Test failed:', error.message);
    }
}

testDeviceLock();
