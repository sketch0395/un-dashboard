const WebSocket = require('ws');

// Simple WebSocket test
function testWebSocketConnection() {
  console.log('🧪 Testing Simple WebSocket Connection');
  console.log('====================================');
  
  try {
    console.log('1. 🔌 Connecting to WebSocket...');
    
    const ws = new WebSocket('ws://localhost:4000/collaboration-ws?scanId=test-scan-id');
    
    ws.on('open', () => {
      console.log('   ✅ WebSocket connected successfully');
      
      // Send a test message
      console.log('2. 📨 Sending test message...');
      ws.send(JSON.stringify({
        type: 'join_scan',
        scanId: 'test-scan-id'
      }));
      
      // Close after 3 seconds
      setTimeout(() => {
        console.log('3. 🔚 Closing connection...');
        ws.close();
      }, 3000);
    });
    
    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());
        console.log(`   📨 Received: ${JSON.stringify(message)}`);
      } catch (e) {
        console.log(`   📨 Received raw: ${data.toString()}`);
      }
    });
    
    ws.on('error', (error) => {
      console.log(`   ❌ WebSocket error: ${error.message}`);
    });
    
    ws.on('close', (code, reason) => {
      console.log(`   🔌 Connection closed: ${code} - ${reason}`);
      console.log('✅ WebSocket test completed');
      process.exit(0);
    });
    
    // Timeout after 10 seconds
    setTimeout(() => {
      console.log('❌ Test timeout');
      ws.close();
      process.exit(1);
    }, 10000);
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

testWebSocketConnection();
