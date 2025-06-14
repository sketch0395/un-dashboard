const WebSocket = require('ws');
const fetch = require('node-fetch');

async function testCollaborationSystem() {
  console.log('🧪 Testing Collaboration System');
  console.log('================================');

  try {
    // Step 1: Login to get authentication cookies
    console.log('\n1. 🔐 Authenticating with server...');
    
    const loginResponse = await fetch('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: 'admin',
        password: 'admin123'
      })
    });

    if (!loginResponse.ok) {
      throw new Error(`Login failed: ${loginResponse.status}`);
    }

    // Extract cookies
    const setCookieHeaders = loginResponse.headers.raw()['set-cookie'];
    const cookies = setCookieHeaders.map(cookie => cookie.split(';')[0]).join('; ');
    
    console.log('   ✅ Login successful');
    console.log('   🍪 Cookies obtained');

    // Step 2: Test collaboration WebSocket connection
    console.log('\n2. 🤝 Testing WebSocket collaboration connection...');
    
    const wsUrl = 'ws://localhost:4000/collaboration-ws?scanId=test-scan-123';
    
    await new Promise((resolve, reject) => {
      const ws = new WebSocket(wsUrl, {
        headers: {
          'Cookie': cookies
        }
      });

      let connectionTimeout = setTimeout(() => {
        reject(new Error('WebSocket connection timeout'));
      }, 10000);

      ws.on('open', () => {
        clearTimeout(connectionTimeout);
        console.log('   ✅ WebSocket connection established');
        
        // Test sending a message
        console.log('\n3. 📨 Testing collaboration messaging...');
        
        ws.send(JSON.stringify({
          type: 'ping'
        }));
      });

      ws.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString());
          console.log(`   📩 Received: ${message.type}`);
          
          if (message.type === 'session_data') {
            console.log('   ✅ Session data received');
            console.log(`   👥 Active users: ${message.users ? message.users.length : 0}`);
            console.log(`   🔒 Device locks: ${message.locks ? message.locks.length : 0}`);
          }
          
          if (message.type === 'pong') {
            console.log('   ✅ Ping/pong successful');
            
            // Test device locking
            console.log('\n4. 🔒 Testing device locking...');
            ws.send(JSON.stringify({
              type: 'device_lock',
              deviceId: 'test-device-1'
            }));
          }
          
          if (message.type === 'device_locked') {
            console.log('   ✅ Device lock successful');
            console.log(`   🔐 Device ${message.deviceId} locked by ${message.username}`);
            
            // Close connection after successful test
            setTimeout(() => {
              ws.close();
              resolve();
            }, 1000);
          }
        } catch (error) {
          console.error('   ❌ Error parsing message:', error);
        }
      });

      ws.on('error', (error) => {
        clearTimeout(connectionTimeout);
        reject(error);
      });

      ws.on('close', (code, reason) => {
        console.log(`   🔌 WebSocket closed: ${code} - ${reason}`);
      });
    });

    console.log('\n✅ All collaboration tests passed!');
    console.log('\n🎉 Collaboration system is working correctly!');
    
  } catch (error) {
    console.error('\n❌ Collaboration test failed:', error.message);
    process.exit(1);
  }
}

// Run the test
if (require.main === module) {
  testCollaborationSystem().then(() => {
    console.log('\n🏁 Test completed successfully');
    process.exit(0);
  }).catch((error) => {
    console.error('\n💥 Test failed:', error);
    process.exit(1);
  });
}

module.exports = { testCollaborationSystem };
