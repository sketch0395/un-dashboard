const WebSocket = require('ws');

// Test WebSocket connection to collaboration server
async function testWebSocketConnection() {
    console.log('🔗 Testing WebSocket connection to collaboration server...');
    
    try {
        // Test basic WebSocket connection without auth first
        const wsUrl = 'ws://localhost:4000/collaboration-ws?scanId=test-scan-123';
        console.log(`Attempting to connect to: ${wsUrl}`);
        
        const ws = new WebSocket(wsUrl);
        
        ws.on('open', () => {
            console.log('✅ WebSocket connection opened successfully!');
            
            // Send a test message
            const message = {
                type: 'ping',
                timestamp: new Date().toISOString()
            };
            
            console.log('📤 Sending test message:', message);
            ws.send(JSON.stringify(message));
        });
        
        ws.on('message', (data) => {
            console.log('📨 Received message:', data.toString());
        });
        
        ws.on('close', (code, reason) => {
            console.log(`🔌 WebSocket closed: ${code} - ${reason}`);
        });
        
        ws.on('error', (error) => {
            console.log('❌ WebSocket error:', error.message);
        });
        
        // Keep the connection open for a few seconds
        setTimeout(() => {
            if (ws.readyState === WebSocket.OPEN) {
                ws.close(1000, 'Test complete');
            }
        }, 5000);
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
    }
}

// Run the test
testWebSocketConnection();
