// Simple WebSocket collaboration test
const WebSocket = require('ws');

async function testCollaborationWebSocket() {
    console.log('🔌 Testing Collaboration WebSocket Connection');
    console.log('==============================================');

    try {
        // Test connection to collaboration server
        console.log('Connecting to ws://localhost:4000...');
        
        const ws = new WebSocket('ws://localhost:4000');
        
        ws.on('open', () => {
            console.log('✅ WebSocket connection established');
            
            // Test authentication
            console.log('📤 Sending authentication...');
            ws.send(JSON.stringify({
                type: 'auth',
                data: {
                    userId: 'test-user-1',
                    username: 'TestUser',
                    email: 'test@example.com',
                    scanId: 'test-scan-123',
                    token: 'test-token'
                }
            }));
        });
        
        ws.on('message', (data) => {
            try {
                const message = JSON.parse(data);
                console.log('📩 Received message:', message.type);
                
                if (message.type === 'session_data') {
                    console.log('✅ Authentication successful');
                    console.log('👥 Active users:', message.users?.length || 0);
                    
                    // Test device lock
                    console.log('📤 Testing device lock...');
                    ws.send(JSON.stringify({
                        type: 'device_lock',
                        deviceId: '192.168.1.1',
                        timestamp: new Date()
                    }));
                }
                
                if (message.type === 'device_locked') {
                    console.log('✅ Device lock successful');
                    
                    // Test device update
                    console.log('📤 Testing device update...');
                    ws.send(JSON.stringify({
                        type: 'device_update',
                        deviceId: '192.168.1.1',
                        changes: {
                            name: 'Test Router',
                            networkRole: 'gateway',
                            color: '#ff6b35'
                        },
                        version: 1,
                        timestamp: new Date()
                    }));
                }
                
                if (message.type === 'device_updated') {
                    console.log('✅ Device update successful');
                    console.log('📊 Changes:', message.changes);
                    
                    // Clean up
                    console.log('🧹 Cleaning up...');
                    ws.send(JSON.stringify({
                        type: 'device_unlock',
                        deviceId: '192.168.1.1',
                        timestamp: new Date()
                    }));
                    
                    setTimeout(() => {
                        ws.close();
                        console.log('\n🎉 WebSocket Collaboration Test Complete!');
                        console.log('✅ Connection established');
                        console.log('✅ Authentication working');
                        console.log('✅ Device locking working');
                        console.log('✅ Device updates working');
                        console.log('');
                        console.log('🌐 Collaboration server is operational!');
                    }, 1000);
                }
                
            } catch (error) {
                console.log('❌ Failed to parse message:', data.toString());
            }
        });
        
        ws.on('error', (error) => {
            console.log('❌ WebSocket error:', error.message);
            
            if (error.code === 'ECONNREFUSED') {
                console.log('');
                console.log('🔧 Collaboration server is not running');
                console.log('💡 To start the collaboration server:');
                console.log('   1. Make sure the main server is running (npm start)');
                console.log('   2. Check if collaboration is integrated in server-network.js');
                console.log('   3. Verify WebSocket server is listening on port 4000');
            }
        });
        
        ws.on('close', (code, reason) => {
            console.log(`🔌 WebSocket closed: ${code} ${reason}`);
        });
        
    } catch (error) {
        console.error('❌ Test failed:', error);
    }
}

// Run the test
testCollaborationWebSocket().catch(console.error);
