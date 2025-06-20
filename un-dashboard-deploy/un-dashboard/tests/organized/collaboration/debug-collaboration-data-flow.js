// Debug collaboration events and data flow
// This test helps identify where the real-time sync is breaking down

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
const TEST_SCAN_ID = '6848c12b80389e07c63b0863'; // Use real scan ID from logs
const TEST_DEVICE_ID = '10.5.1.71'; // Use real device ID from logs

console.log('🔍 Debugging Collaboration Data Flow');
console.log('====================================');
console.log(`Scan ID: ${TEST_SCAN_ID}`);
console.log(`Device ID: ${TEST_DEVICE_ID}`);
console.log('');

async function debugCollaborationFlow() {
    let user1Ws, user2Ws;
    let user1Messages = [];
    let user2Messages = [];
    
    try {
        console.log('👥 Creating two WebSocket connections...');
        
        // Create two connections to simulate two users
        user1Ws = new WebSocket(`${COLLABORATION_SERVER_URL}?scanId=${TEST_SCAN_ID}`, {
            headers: {
                'Cookie': `auth-token=${authToken}`
            }
        });
        
        user2Ws = new WebSocket(`${COLLABORATION_SERVER_URL}?scanId=${TEST_SCAN_ID}`, {
            headers: {
                'Cookie': `auth-token=${authToken}`
            }
        });
        
        // User 1 event handling
        user1Ws.on('open', () => {
            console.log('✅ User 1 WebSocket connected');
        });
        
        user1Ws.on('message', (data) => {
            try {
                const message = JSON.parse(data);
                user1Messages.push(message);
                console.log(`📨 User 1 received: ${message.type} ${message.deviceId || ''}`);
                
                if (message.type === 'session_data') {
                    console.log('   👥 Users in session:', message.users?.length || 0);
                    console.log('   🔒 Active locks:', message.locks?.length || 0);
                }
            } catch (error) {
                console.error('User 1 message parse error:', error);
            }
        });
        
        // User 2 event handling
        user2Ws.on('open', () => {
            console.log('✅ User 2 WebSocket connected');
        });
        
        user2Ws.on('message', (data) => {
            try {
                const message = JSON.parse(data);
                user2Messages.push(message);
                console.log(`📨 User 2 received: ${message.type} ${message.deviceId || ''}`);
                
                // Log important events in detail
                if (message.type === 'device_updated') {
                    console.log('   🎯 Device update details:');
                    console.log(`      Device ID: ${message.deviceId}`);
                    console.log(`      User ID: ${message.userId}`);
                    console.log(`      Username: ${message.username}`);
                    console.log(`      Changes:`, JSON.stringify(message.changes, null, 2));
                    console.log(`      Version: ${message.version}`);
                }
                
                if (message.type === 'scan_updated') {
                    console.log('   🎯 Scan update details:');
                    console.log(`      User ID: ${message.userId}`);
                    console.log(`      Username: ${message.username}`);
                    console.log(`      Changes:`, JSON.stringify(message.changes, null, 2));
                }
            } catch (error) {
                console.error('User 2 message parse error:', error);
            }
        });
        
        user1Ws.on('error', (error) => {
            console.error('User 1 WebSocket error:', error);
        });
        
        user2Ws.on('error', (error) => {
            console.error('User 2 WebSocket error:', error);
        });
        
        // Wait for connections to establish
        await new Promise((resolve) => {
            let connectedCount = 0;
            const checkConnected = () => {
                connectedCount++;
                if (connectedCount === 2) {
                    setTimeout(resolve, 1000); // Wait a bit for session data
                }
            };
            
            user1Ws.on('open', checkConnected);
            user2Ws.on('open', checkConnected);
        });
        
        console.log('\n🔒 Step 1: Testing Device Lock');
        console.log('================================');
        
        // User 1 locks a device
        console.log('👤 User 1 attempting to lock device...');
        user1Ws.send(JSON.stringify({
            type: 'device_lock',
            deviceId: TEST_DEVICE_ID,
            timestamp: new Date().toISOString()
        }));
        
        // Wait for lock events to propagate
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        console.log('\n📝 Step 2: Testing Device Update');
        console.log('=================================');
        
        // User 1 updates the device
        const updateData = {
            type: 'device_update',
            deviceId: TEST_DEVICE_ID,
            changes: {
                customName: 'Updated Test Device',
                description: 'Updated via collaboration test',
                category: 'Test Category',
                notes: 'Added by User 1',
                lastModified: new Date().toISOString()
            },
            version: 1,
            timestamp: new Date().toISOString()
        };
        
        console.log('👤 User 1 sending device update...');
        console.log('   Update payload:', JSON.stringify(updateData, null, 2));
        user1Ws.send(JSON.stringify(updateData));
        
        // Wait for update events to propagate
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        console.log('\n📊 Step 3: Testing Scan Update');
        console.log('===============================');
        
        // User 1 updates scan metadata
        const scanUpdateData = {
            type: 'scan_update',
            changes: {
                scanName: 'Updated Scan Name',
                description: 'Updated via collaboration test',
                tags: ['collaboration', 'test'],
                lastModified: new Date().toISOString()
            },
            timestamp: new Date().toISOString()
        };
        
        console.log('👤 User 1 sending scan update...');
        console.log('   Update payload:', JSON.stringify(scanUpdateData, null, 2));
        user1Ws.send(JSON.stringify(scanUpdateData));
        
        // Wait for scan update events
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        console.log('\n📊 Analysis & Results');
        console.log('=====================');
        
        // Analyze what User 2 received
        const user2DeviceUpdates = user2Messages.filter(m => m.type === 'device_updated');
        const user2ScanUpdates = user2Messages.filter(m => m.type === 'scan_updated');
        const user2LockEvents = user2Messages.filter(m => m.type === 'device_locked');
        
        console.log(`User 1 total messages: ${user1Messages.length}`);
        console.log(`User 2 total messages: ${user2Messages.length}`);
        console.log(`User 2 device updates: ${user2DeviceUpdates.length}`);
        console.log(`User 2 scan updates: ${user2ScanUpdates.length}`);
        console.log(`User 2 lock events: ${user2LockEvents.length}`);
        
        if (user2DeviceUpdates.length > 0) {
            console.log('\n✅ Device updates are working!');
            user2DeviceUpdates.forEach((update, index) => {
                console.log(`   Update ${index + 1}:`, {
                    deviceId: update.deviceId,
                    userId: update.userId,
                    username: update.username,
                    changes: update.changes
                });
            });
        } else {
            console.log('\n❌ Device updates are NOT working');
            console.log('   User 1 should have sent device updates that User 2 should receive');
        }
        
        if (user2ScanUpdates.length > 0) {
            console.log('\n✅ Scan updates are working!');
            user2ScanUpdates.forEach((update, index) => {
                console.log(`   Update ${index + 1}:`, {
                    userId: update.userId,
                    username: update.username,
                    changes: update.changes
                });
            });
        } else {
            console.log('\n❌ Scan updates are NOT working');
        }
        
        // Test frontend event simulation
        console.log('\n🎭 Step 4: Frontend Event Simulation');
        console.log('====================================');
        
        if (user2DeviceUpdates.length > 0) {
            const deviceUpdate = user2DeviceUpdates[0];
            console.log('Simulating frontend collaborationDeviceUpdate event:');
            
            // This is what the frontend should receive
            const frontendEvent = {
                type: 'collaborationDeviceUpdate',
                detail: {
                    deviceId: deviceUpdate.deviceId,
                    changes: deviceUpdate.changes,
                    userId: deviceUpdate.userId,
                    username: deviceUpdate.username,
                    version: deviceUpdate.version,
                    timestamp: deviceUpdate.timestamp
                }
            };
            
            console.log('Event detail:', JSON.stringify(frontendEvent.detail, null, 2));
            
            // Check if this would be processed by the frontend
            const currentUserId = 'current-user-id'; // This would be the logged-in user
            const shouldProcess = deviceUpdate.userId !== currentUserId;
            console.log(`Should frontend process this update? ${shouldProcess ? 'YES' : 'NO'}`);
            console.log(`(Update from user '${deviceUpdate.userId}', current user '${currentUserId}')`);
        }
        
    } catch (error) {
        console.error('❌ Debug test failed:', error);
    } finally {
        // Clean up
        if (user1Ws && user1Ws.readyState === WebSocket.OPEN) {
            user1Ws.close();
        }
        if (user2Ws && user2Ws.readyState === WebSocket.OPEN) {
            user2Ws.close();
        }
        
        console.log('\n🧹 Debug test completed');
    }
}

// Run the debug test
debugCollaborationFlow().catch(console.error);
