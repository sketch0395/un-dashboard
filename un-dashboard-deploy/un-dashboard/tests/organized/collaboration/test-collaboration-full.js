const WebSocket = require('ws');
const http = require('http');

// Test collaboration WebSocket with proper authentication
async function testCollaborationWithAuth() {
  console.log('🧪 Testing Collaboration WebSocket with Authentication');
  console.log('===================================================');
  
  try {
    // Step 1: Get authentication token
    console.log('1. 🔐 Getting authentication token...');
    
    const loginData = JSON.stringify({
      username: 'admin',
      password: 'admin123'
    });
    
    const loginOptions = {
      hostname: 'localhost',
      port: 3000,
      path: '/api/auth/login',
      method: 'POST',
      headers: {
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
              reject(new Error('Authentication failed: ' + result.message));
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
    
    // Step 2: Connect to WebSocket with auth token
    console.log('2. 🔌 Connecting to collaboration WebSocket...');
    
    const ws = new WebSocket('ws://localhost:4000/collaboration-ws?scanId=test-scan-123', {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });
    
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        ws.close();
        reject(new Error('WebSocket connection timeout'));
      }, 10000);
      
      ws.on('open', () => {
        console.log('   ✅ WebSocket connected successfully');
        
        // Test sending a collaborative message
        console.log('3. 📨 Testing collaborative messaging...');
        ws.send(JSON.stringify({
          type: 'device_lock',
          deviceId: 'test-device-001'
        }));
      });
      
      ws.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString());
          console.log(`   📨 Received: ${message.type}`);
          
          if (message.type === 'session_data') {
            console.log(`   👥 Session users: ${message.users.length}`);
            console.log(`   🔒 Device locks: ${message.locks.length}`);
            
            // Send another test message
            console.log('4. ⚡ Testing device lock...');
            ws.send(JSON.stringify({
              type: 'device_lock',
              deviceId: 'test-device-001'
            }));
          }
          
          if (message.type === 'device_locked') {
            console.log('   ✅ Device lock successful');
            
            // Test device unlock
            console.log('5. 🔓 Testing device unlock...');
            ws.send(JSON.stringify({
              type: 'device_unlock',
              deviceId: 'test-device-001'
            }));
          }
          
          if (message.type === 'device_unlocked') {
            console.log('   ✅ Device unlock successful');
            console.log('✅ All collaboration tests passed!');
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
      
      ws.on('close', (code, reason) => {
        console.log(`   🔌 Connection closed: ${code} - ${reason?.toString()}`);
        clearTimeout(timeout);
      });
    });
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    throw error;
  }
}

// Run the test
testCollaborationWithAuth()
  .then(() => {
    console.log('🎉 Collaboration system test completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Collaboration system test failed:', error.message);
    process.exit(1);
  });
