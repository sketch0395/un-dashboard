const WebSocket = require('ws');

// Test raw WebSocket connection with authorization header
console.log('Testing raw WebSocket connection...');

const ws = new WebSocket('ws://localhost:4000/collaboration-ws?scanId=test', {
  headers: {
    'Authorization': 'Bearer test-token'
  }
});

ws.on('open', () => {
  console.log('Connected!');
  ws.send('Hello');
});

ws.on('message', (data) => {
  console.log('Received:', data.toString());
});

ws.on('error', (error) => {
  console.log('Error:', error.message);
});

ws.on('close', (code, reason) => {
  console.log('Closed:', code, reason?.toString());
});

setTimeout(() => {
  console.log('Timeout - closing');
  ws.close();
  process.exit(0);
}, 5000);
