// Simple WebSocket test for collaboration server on network server
const WebSocket = require('ws');

console.log('🔍 Testing collaboration WebSocket on network server...');

// Test connection to collaboration server on network server port
const wsUrl = 'ws://localhost:4000/collaboration-ws?scanId=test-debug&token=test';
console.log('🔗 Connecting to:', wsUrl);

const ws = new WebSocket(wsUrl);

let timeout = setTimeout(() => {
    console.log('⏱️ Connection timeout after 5 seconds');
    ws.close();
    process.exit(1);
}, 5000);

ws.on('open', () => {
    clearTimeout(timeout);
    console.log('✅ WebSocket connection successful!');
    ws.close();
    process.exit(0);
});

ws.on('close', (code, reason) => {
    clearTimeout(timeout);
    console.log(`🔌 WebSocket closed: ${code} - ${reason}`);
    if (code === 1008) {
        console.log('🔐 Authentication required (expected)');
        process.exit(0);
    } else {
        process.exit(1);
    }
});

ws.on('error', (error) => {
    clearTimeout(timeout);
    console.error('🚨 WebSocket error:', error.message);
    process.exit(1);
});
