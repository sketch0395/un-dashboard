const WebSocket = require('ws');

console.log('🧪 Simple WebSocket Collaboration Test');
console.log('======================================');

// Test WebSocket connection directly
console.log('Testing WebSocket connection to collaboration server...');

const ws = new WebSocket('ws://localhost:4000/collaboration-ws?scanId=test-123', {
    headers: {
        'Cookie': 'auth-token=test-token'
    }
});

ws.on('open', () => {
    console.log('✅ WebSocket connection opened');
    
    // Send a ping message
    ws.send(JSON.stringify({
        type: 'ping'
    }));
    
    console.log('📤 Sent ping message');
});

ws.on('message', (data) => {
    console.log('📥 Received message:', data.toString());
});

ws.on('error', (error) => {
    console.log('❌ WebSocket error:', error.message);
});

ws.on('close', (code, reason) => {
    console.log(`🔌 WebSocket closed: ${code} - ${reason}`);
    process.exit(0);
});

// Close after 5 seconds
setTimeout(() => {
    console.log('⏰ Closing connection...');
    ws.close();
}, 5000);
