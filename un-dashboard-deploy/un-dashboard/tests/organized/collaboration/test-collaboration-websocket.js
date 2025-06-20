const WebSocket = require('ws');
const http = require('http');

// Test collaboration WebSocket connection
async function testCollaborationWebSocket() {
  console.log('🧪 Testing Collaboration WebSocket Connection');
  console.log('==========================================');
  
  try {
    // First, get an auth token
    console.log('1. 🔐 Getting auth token...');
    
    const loginData = JSON.stringify({
      username: 'admin',
      password: 'admin123'
    });
    
    const loginOptions = {
      hostname: 'localhost',
      port: 3000,
      path: '/api/auth/login',
      method: 'POST',      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(loginData)
      }
    };
      const authToken = await new Promise((resolve, reject) => {
      const req = http.request(loginOptions, (res) => {
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => {
          try {
            const result = JSON.parse(data);
            if (result.success && result.token) {
              console.log('   ✅ Authentication successful');
              resolve(result.token);
            } else {
              reject(new Error('Authentication failed'));
            }
          } catch (e) {
            reject(e);
          }
        });
      });
      
      req.on('error', reject);
      req.write(loginData);
      req.end();
    });
    
    // Test WebSocket connection to collaboration server
    console.log('2. 🔌 Testing WebSocket connection...');
      const ws = new WebSocket('ws://localhost:4000/collaboration-ws?scanId=test-scan-id', {
      headers: {
        'Cookie': `auth-token=${authToken}`
      }
    });
    
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        ws.close();
        reject(new Error('WebSocket connection timeout'));
      }, 5000);
      
      ws.on('open', () => {
        console.log('   ✅ WebSocket connected successfully');
          // Test joining a scan room
        console.log('3. 🏠 Testing scan room join...');
        ws.send(JSON.stringify({
          type: 'join_scan',
          scanId: 'test-scan-id'
        }));
      });
      
      ws.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString());
          console.log(`   📨 Received message: ${message.type}`);
          
          if (message.type === 'scan_joined') {
            console.log('   ✅ Successfully joined scan room');
            
            // Test sending a collaborative action
            console.log('4. ⚡ Testing collaborative action...');
            ws.send(JSON.stringify({
              type: 'device_lock',
              scanId: 'test-scan-id',
              deviceId: 'test-device-id'
            }));
          }
          
          if (message.type === 'device_locked') {
            console.log('   ✅ Device lock action successful');
            clearTimeout(timeout);
            ws.close();
            resolve();
          }
          
        } catch (e) {
          console.log(`   ⚠️  Message parse error: ${e.message}`);
        }
      });
      
      ws.on('error', (error) => {
        console.log(`   ❌ WebSocket error: ${error.message}`);
        clearTimeout(timeout);
        reject(error);
      });
      
      ws.on('close', () => {
        console.log('   🔌 WebSocket connection closed');
        clearTimeout(timeout);
      });
    });
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    throw error;
  }
}

// Run the test
testCollaborationWebSocket()
  .then(() => {
    console.log('✅ Collaboration WebSocket test completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Collaboration WebSocket test failed:', error.message);
    process.exit(1);
  });
