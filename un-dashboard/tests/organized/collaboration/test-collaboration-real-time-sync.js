// Test real-time collaboration synchronization
// This test verifies that changes made by one user are immediately visible to other users

const WebSocket = require('ws');
const fs = require('fs');

// Load authentication token
let authToken;
try {
    const loginData = JSON.parse(fs.readFileSync('./login-data.json', 'utf8'));
    authToken = loginData.token || loginData.authToken;
    console.log('✅ Loaded authentication token');
} catch (error) {
    console.error('❌ Failed to load authentication token:', error.message);
    process.exit(1);
}

const COLLABORATION_SERVER_URL = 'ws://localhost:4000/collaboration-ws';
const TEST_SCAN_ID = 'test-sync-' + Date.now();
const TEST_DEVICE_ID = '192.168.1.100';

console.log('🔄 Testing Real-Time Collaboration Synchronization');
console.log('================================================');
console.log(`Scan ID: ${TEST_SCAN_ID}`);
console.log(`Device ID: ${TEST_DEVICE_ID}`);
console.log('');

async function testRealTimeSync() {
    let user1Ws, user2Ws;
    let user1Events = [];
    let user2Events = [];
    
    try {
        // Create two WebSocket connections (simulating two users)
        console.log('👥 Creating two user connections...');
        
        // User 1 connection
        user1Ws = new WebSocket(`${COLLABORATION_SERVER_URL}?scanId=${TEST_SCAN_ID}`, {
            headers: {
                'Cookie': `auth-token=${authToken}`
            }
        });
        
        // User 2 connection  
        user2Ws = new WebSocket(`${COLLABORATION_SERVER_URL}?scanId=${TEST_SCAN_ID}`, {
            headers: {
                'Cookie': `auth-token=${authToken}`
            }
        });
        
        // Set up event listeners for User 1
        user1Ws.on('open', () => {
            console.log('✅ User 1 connected');
        });
        
        user1Ws.on('message', (data) => {
            try {
                const message = JSON.parse(data);
                user1Events.push(message);
                console.log('📨 User 1 received:', message.type, message.deviceId || '');
            } catch (error) {
                console.error('User 1 message parse error:', error);
            }
        });
        
        // Set up event listeners for User 2
        user2Ws.on('open', () => {
            console.log('✅ User 2 connected');
        });
        
        user2Ws.on('message', (data) => {
            try {
                const message = JSON.parse(data);
                user2Events.push(message);
                console.log('📨 User 2 received:', message.type, message.deviceId || '');
            } catch (error) {
                console.error('User 2 message parse error:', error);
            }
        });
        
        // Wait for both connections to establish
        await new Promise(resolve => {
            let connected = 0;
            const checkConnected = () => {
                connected++;
                if (connected === 2) resolve();
            };
            user1Ws.on('open', checkConnected);
            user2Ws.on('open', checkConnected);
        });
        
        // Wait for session data
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        console.log('\n🔒 Test 1: Device Locking Synchronization');
        
        // User 1 locks a device
        console.log('👤 User 1 locking device...');
        user1Ws.send(JSON.stringify({
            type: 'device_lock',
            deviceId: TEST_DEVICE_ID,
            timestamp: new Date()
        }));
        
        // Wait for lock confirmation
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Check if User 2 received the lock event
        const user2LockEvent = user2Events.find(e => e.type === 'device_locked' && e.deviceId === TEST_DEVICE_ID);
        if (user2LockEvent) {
            console.log('✅ User 2 received device lock notification');
        } else {
            console.log('❌ User 2 did not receive device lock notification');
        }
        
        console.log('\n📝 Test 2: Device Update Synchronization');
        
        // User 1 updates the device
        const testChanges = {
            customName: 'Updated by User 1',
            description: 'Real-time sync test',
            timestamp: new Date().toISOString()
        };
        
        console.log('👤 User 1 updating device...');
        user1Ws.send(JSON.stringify({
            type: 'device_update',
            deviceId: TEST_DEVICE_ID,
            changes: testChanges,
            version: 1,
            timestamp: new Date()
        }));
        
        // Wait for update propagation
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Check if User 2 received the update
        const user2UpdateEvent = user2Events.find(e => e.type === 'device_updated' && e.deviceId === TEST_DEVICE_ID);
        if (user2UpdateEvent) {
            console.log('✅ User 2 received device update notification');
            console.log('📋 Changes received:', user2UpdateEvent.changes);
            
            // Verify the changes match
            const changesMatch = JSON.stringify(user2UpdateEvent.changes) === JSON.stringify(testChanges);
            if (changesMatch) {
                console.log('✅ Changes match exactly');
            } else {
                console.log('❌ Changes do not match');
                console.log('Expected:', testChanges);
                console.log('Received:', user2UpdateEvent.changes);
            }
        } else {
            console.log('❌ User 2 did not receive device update notification');
        }
        
        console.log('\n📊 Test 3: Scan Update Synchronization');
        
        // User 1 updates scan metadata
        const scanChanges = {
            scanName: 'Updated Scan Name',
            notes: 'Updated by User 1',
            lastModified: new Date().toISOString()
        };
        
        console.log('👤 User 1 updating scan...');
        user1Ws.send(JSON.stringify({
            type: 'scan_update',
            changes: scanChanges,
            timestamp: new Date()
        }));
        
        // Wait for update propagation
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Check if User 2 received the scan update
        const user2ScanEvent = user2Events.find(e => e.type === 'scan_updated');
        if (user2ScanEvent) {
            console.log('✅ User 2 received scan update notification');
            console.log('📋 Changes received:', user2ScanEvent.changes);
        } else {
            console.log('❌ User 2 did not receive scan update notification');
        }
        
        console.log('\n📊 Test Results Summary:');
        console.log(`User 1 events: ${user1Events.length}`);
        console.log(`User 2 events: ${user2Events.length}`);
        
        // Analyze events
        const user1SessionData = user1Events.filter(e => e.type === 'session_data');
        const user2SessionData = user2Events.filter(e => e.type === 'session_data');
        const user1Locks = user1Events.filter(e => e.type === 'device_locked');
        const user2Locks = user2Events.filter(e => e.type === 'device_locked');
        const user1Updates = user1Events.filter(e => e.type === 'device_updated');
        const user2Updates = user2Events.filter(e => e.type === 'device_updated');
        
        console.log('\n📈 Event Analysis:');
        console.log(`Session data - User 1: ${user1SessionData.length}, User 2: ${user2SessionData.length}`);
        console.log(`Device locks - User 1: ${user1Locks.length}, User 2: ${user2Locks.length}`);
        console.log(`Device updates - User 1: ${user1Updates.length}, User 2: ${user2Updates.length}`);
        
        if (user2Locks.length > 0 && user2Updates.length > 0) {
            console.log('\n🎉 Real-time synchronization is working!');
            console.log('✅ Changes from User 1 are being received by User 2');
        } else {
            console.log('\n⚠️ Real-time synchronization may have issues');
            console.log('❌ Some events are not being properly broadcasted');
        }
        
    } catch (error) {
        console.error('❌ Test failed:', error);
    } finally {
        // Clean up connections
        if (user1Ws) {
            user1Ws.close();
        }
        if (user2Ws) {
            user2Ws.close();
        }
        
        console.log('\n🧹 Test cleanup completed');
    }
}

// Run the test
testRealTimeSync().catch(console.error);
