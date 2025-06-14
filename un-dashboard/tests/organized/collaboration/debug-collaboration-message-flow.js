const WebSocket = require('ws');
const fs = require('fs');

// Load authentication token
let token;
try {
    const loginData = JSON.parse(fs.readFileSync('./login-data.json', 'utf8'));
    token = loginData.token || loginData.authToken;
    console.log('✅ Loaded authentication token');
} catch (error) {
    console.error('❌ Failed to load authentication token:', error.message);
    process.exit(1);
}

const scanId = 'debug-scan-' + Date.now();
const deviceId = '192.168.1.100';

console.log('🔍 Debug Collaboration Message Flow');
console.log('================================');
console.log('Scan ID:', scanId);
console.log('Device ID:', deviceId);
console.log('');

const ws = new WebSocket(`ws://localhost:4000/collaboration-ws?scanId=${scanId}`, {
    headers: {
        'Cookie': `auth-token=${token}`
    }
});

let step = 0;
let sessionDataReceived = false;

ws.on('open', () => {
    step++;
    console.log(`${step}. ✅ WebSocket connection established`);
});

ws.on('message', (data) => {
    step++;
    const message = JSON.parse(data.toString());
    console.log(`${step}. 📨 Received message:`, message.type);
    
    if (message.type === 'session_data') {
        sessionDataReceived = true;
        console.log(`   - Users: ${message.users ? message.users.length : 0}`);
        console.log(`   - Locks: ${message.locks ? message.locks.length : 0}`);
        console.log(`   - Version: ${message.version}`);
        
        // Now send device lock request
        step++;
        console.log(`${step}. 📤 Sending device_lock request...`);
        const lockRequest = {
            type: 'device_lock',
            deviceId: deviceId,
            timestamp: new Date().toISOString()
        };
        ws.send(JSON.stringify(lockRequest));
        
    } else if (message.type === 'device_locked') {
        console.log(`   ✅ Device locked successfully by user: ${message.username}`);
        console.log(`   - Device ID: ${message.deviceId}`);
        console.log(`   - User ID: ${message.userId}`);
        
        // Test unlock
        step++;
        console.log(`${step}. 📤 Sending device_unlock request...`);
        const unlockRequest = {
            type: 'device_unlock',
            deviceId: deviceId,
            timestamp: new Date().toISOString()
        };
        ws.send(JSON.stringify(unlockRequest));
        
    } else if (message.type === 'device_unlocked') {
        console.log(`   ✅ Device unlocked successfully`);
        console.log(`   - Device ID: ${message.deviceId}`);
        console.log(`   - User ID: ${message.userId}`);
        
        step++;
        console.log(`${step}. 🎊 All tests completed successfully!`);
        ws.close();
        
    } else if (message.type === 'device_lock_failed') {
        console.log(`   ❌ Device lock failed: ${message.reason}`);
        if (message.lockedBy) {
            console.log(`   - Locked by user: ${message.lockedBy}`);
        }
        ws.close();
        
    } else {
        console.log(`   - Details:`, JSON.stringify(message, null, 2));
    }
});

ws.on('error', (error) => {
    console.error('❌ WebSocket error:', error.message);
});

ws.on('close', (code, reason) => {
    console.log('🔌 Connection closed:', code, reason ? reason.toString() : '');
    
    if (!sessionDataReceived) {
        console.log('❌ Never received session_data - check server logs');
    }
    
    process.exit(code === 1000 ? 0 : 1);
});

// Timeout after 10 seconds
setTimeout(() => {
    console.log('⏰ Test timeout - closing connection');
    ws.close();
}, 10000);
