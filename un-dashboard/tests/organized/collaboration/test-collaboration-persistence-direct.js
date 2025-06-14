// Direct test of collaboration persistence - simulates WebSocket collaboration
const WebSocket = require('ws');
const dbConnection = require('./lib/db');
const SharedScan = require('./models/SharedScan');

async function testCollaborationPersistenceDirect() {
  console.log('🧪 Testing Collaboration Persistence (Direct WebSocket)');
  console.log('====================================================');

  try {
    // Connect to database first
    await dbConnection.connectMongoDB();
    console.log('✅ Database connected');

    // Use a real scan ID from the database
    const scanId = '6848c12b80389e07c63b0863';
    console.log('📋 Using scan ID:', scanId);

    // Verify scan exists and get a device to test with
    const scan = await SharedScan.findById(scanId);
    if (!scan) {
      throw new Error('Test scan not found in database');
    }

    // Find a test device
    let testDevice = null;
    for (const vendor of Object.keys(scan.scanData?.devices || {})) {
      const devices = scan.scanData.devices[vendor];
      if (devices && devices.length > 0) {
        testDevice = devices[0];
        break;
      }
    }

    if (!testDevice) {
      throw new Error('No devices found in scan to test with');
    }

    console.log('🎯 Test device:', testDevice.ip);
    console.log('   Current hostname:', testDevice.hostname || 'None');

    // Prepare test changes
    const testChanges = {
      hostname: `persistence-test-${Date.now()}`,
      lastModified: new Date(),
      testProperty: 'collaboration-persistence-test'
    };

    console.log('🔄 Changes to apply:', testChanges);

    // Get a valid auth token (you'll need to have logged in recently)
    console.log('🔐 Loading authentication token...');
    let authToken = 'test-token';
    try {
      const fs = require('fs');
      const loginData = JSON.parse(fs.readFileSync('./login-data.json', 'utf8'));
      authToken = loginData.token || loginData.authToken;
    } catch (e) {
      console.log('⚠️ Could not load auth token, using test token');
    }

    // Test WebSocket connection to collaboration server
    console.log('\n🔗 Connecting to collaboration server...');
    const wsUrl = `ws://localhost:4000/collaboration-ws?scanId=${scanId}&token=${authToken}`;
    console.log('🌐 WebSocket URL:', wsUrl);

    const ws = new WebSocket(wsUrl);

    const testResult = await new Promise((resolve, reject) => {
      let sessionReceived = false;
      let deviceLocked = false;
      let updateSent = false;
      let persistenceVerified = false;

      ws.on('open', () => {
        console.log('✅ WebSocket connected');
      });

      ws.on('message', async (data) => {
        try {
          const message = JSON.parse(data);
          console.log('📨 Received:', message.type);

          if (message.type === 'session_data' && !sessionReceived) {
            sessionReceived = true;
            console.log('✅ Session data received');
            console.log('👥 Active users:', message.users?.length || 0);
            
            // Step 1: Lock the device
            console.log('🔒 Attempting to lock device...');
            ws.send(JSON.stringify({
              type: 'device_lock',
              deviceId: testDevice.ip,
              timestamp: new Date()
            }));
          }

          if (message.type === 'device_locked') {
            deviceLocked = true;
            console.log('✅ Device locked successfully');
            
            // Step 2: Send device update
            console.log('📝 Sending device update...');
            ws.send(JSON.stringify({
              type: 'device_update',
              deviceId: testDevice.ip,
              changes: testChanges,
              version: 1,
              timestamp: new Date()
            }));
            updateSent = true;
          }

          if (message.type === 'device_updated') {
            console.log('✅ Device update broadcast received');
            
            // Step 3: Verify persistence by checking database
            setTimeout(async () => {
              console.log('🔍 Verifying persistence in database...');
              
              try {
                const updatedScan = await SharedScan.findById(scanId);
                let deviceFound = false;
                
                for (const vendor of Object.keys(updatedScan.scanData?.devices || {})) {
                  const devices = updatedScan.scanData.devices[vendor];
                  if (Array.isArray(devices)) {
                    const device = devices.find(d => d.ip === testDevice.ip);
                    if (device && device.hostname === testChanges.hostname) {
                      deviceFound = true;
                      console.log('✅ PERSISTENCE VERIFIED!');
                      console.log('   Device IP:', device.ip);
                      console.log('   New hostname:', device.hostname);
                      console.log('   Test property:', device.testProperty);
                      break;
                    }
                  }
                }
                
                if (!deviceFound) {
                  console.log('❌ PERSISTENCE FAILED - changes not found in database');
                  resolve(false);
                } else {
                  persistenceVerified = true;
                  resolve(true);
                }
                
                ws.close();
              } catch (error) {
                console.error('❌ Error verifying persistence:', error);
                resolve(false);
                ws.close();
              }
            }, 2000); // Wait 2 seconds for persistence to complete
          }

          if (message.type === 'device_lock_failed') {
            console.log('❌ Device lock failed:', message.reason);
            resolve(false);
            ws.close();
          }

        } catch (error) {
          console.error('Error parsing message:', error);
        }
      });

      ws.on('error', (error) => {
        console.error('❌ WebSocket error:', error.message);
        resolve(false);
      });

      ws.on('close', () => {
        console.log('🔌 WebSocket connection closed');
        if (!persistenceVerified) {
          resolve(false);
        }
      });

      // Timeout after 15 seconds
      setTimeout(() => {
        console.log('⏰ Test timed out');
        ws.close();
        resolve(false);
      }, 15000);
    });

    if (testResult) {
      console.log('\n🎉 COLLABORATION PERSISTENCE TEST PASSED!');
      console.log('✅ WebSocket connection works');
      console.log('✅ Device locking works');
      console.log('✅ Device updates work');
      console.log('✅ Database persistence works');
      console.log('✅ Changes survive across sessions');
    } else {
      console.log('\n❌ COLLABORATION PERSISTENCE TEST FAILED');
      console.log('❌ One or more components are not working properly');
    }

    process.exit(testResult ? 0 : 1);

  } catch (error) {
    console.error('\n❌ Test failed with error:', error.message);
    console.error(error);
    process.exit(1);
  }
}

testCollaborationPersistenceDirect();
