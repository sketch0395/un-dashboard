#!/usr/bin/env node

/**
 * Test script to verify collaboration connection stability in the actual webapp
 * This will test the full integration including the useCollaboration hook
 */

const WebSocket = require('ws');
const fetch = require('node-fetch');

async function testWebAppCollaborationStability() {
  console.log('🌐 WEBAPP COLLABORATION STABILITY TEST');
  console.log('=====================================');
  
  let testResults = {
    loginSuccessful: false,
    connectionEstablished: false,
    heartbeatWorking: false,
    connectionStable: false,
    serverPingsReceived: 0,
    serverPongsSet: 0,
    disconnectCount: 0,
    testDuration: 60000 // 1 minute test
  };

  try {
    // Step 1: Login and get authentication token
    console.log('🔑 Step 1: Authenticating with webapp...');
    
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
      throw new Error(`Login failed: ${loginResponse.status} ${loginResponse.statusText}`);
    }

    const loginData = await loginResponse.json();
    console.log('✅ Login successful');
    console.log('👤 User:', loginData.user.username);
    testResults.loginSuccessful = true;

    // Extract token from Set-Cookie header
    const cookies = loginResponse.headers.raw()['set-cookie'];
    let authToken = null;
    
    if (cookies) {
      for (const cookie of cookies) {
        if (cookie.startsWith('auth-token=')) {
          authToken = cookie.split('auth-token=')[1].split(';')[0];
          break;
        }
      }
    }

    if (!authToken) {
      throw new Error('No auth token found in response cookies');
    }

    console.log('🍪 Auth token extracted from cookies');

    // Step 2: Test collaboration connection stability
    console.log('\n🔌 Step 2: Testing collaboration connection stability...');
    console.log(`⏱️ Test duration: ${testResults.testDuration / 1000} seconds`);
    
    const testStartTime = Date.now();
    const scanId = `webapp-stability-test-${Date.now()}`;
    
    // Create WebSocket connection mimicking the webapp's useCollaboration hook
    const wsUrl = `ws://localhost:4000/collaboration-ws?scanId=${encodeURIComponent(scanId)}&token=${encodeURIComponent(authToken)}`;
    console.log('🌐 Connecting to:', wsUrl.replace(/token=[^&]+/, 'token=***'));
    
    const ws = new WebSocket(wsUrl);
    let messageCount = 0;
    let connectionStartTime = null;

    await new Promise((resolve, reject) => {
      let testTimeout;

      ws.on('open', () => {
        console.log('✅ WebSocket connection established');
        connectionStartTime = Date.now();
        testResults.connectionEstablished = true;
        
        // Set test timeout
        testTimeout = setTimeout(() => {
          console.log('\n⏰ Test duration complete');
          testResults.connectionStable = true;
          ws.close(1000, 'Test complete');
          resolve();
        }, testResults.testDuration);
      });

      ws.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString());
          messageCount++;
          const elapsed = Date.now() - connectionStartTime;
          
          console.log(`📨 Message ${messageCount}: ${message.type} (+${Math.round(elapsed / 1000)}s)`);
          
          if (message.type === 'session_data') {
            console.log(`   👥 Users: ${message.users?.length || 0}, Locks: ${message.locks?.length || 0}, Version: ${message.version || 'unknown'}`);
          }
          
          // Handle server ping with proper response (like useCollaboration hook)
          if (message.type === 'server_ping') {
            console.log('   🏓 Received server ping - responding with pong');
            testResults.serverPingsReceived++;
            ws.send(JSON.stringify({ type: 'server_pong', timestamp: new Date() }));
            testResults.serverPongsSet++;
            testResults.heartbeatWorking = true;
          }
          
          if (message.type === 'error') {
            console.log(`   ❌ Server error: ${message.message}`);
          }
          
        } catch (error) {
          console.log('❌ Failed to parse message:', data.toString());
        }
      });

      ws.on('close', (code, reason) => {
        const elapsed = Date.now() - connectionStartTime;
        console.log(`\n🔌 Connection closed after ${Math.round(elapsed / 1000)}s`);
        console.log(`   Code: ${code}, Reason: ${reason?.toString() || 'No reason'}`);
        
        testResults.disconnectCount++;
        
        if (testTimeout) {
          clearTimeout(testTimeout);
        }
        
        // If this was an unexpected disconnect, treat as test failure
        if (code !== 1000) {
          console.log('   ⚠️ Unexpected disconnect detected');
          testResults.connectionStable = false;
        }
        
        resolve();
      });

      ws.on('error', (error) => {
        console.error('🚨 WebSocket error:', error.message);
        if (testTimeout) {
          clearTimeout(testTimeout);
        }
        reject(error);
      });
    });

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }

  // Display results
  console.log('\n📊 WEBAPP COLLABORATION STABILITY RESULTS');
  console.log('==========================================');
  console.log('🔐 Login successful:', testResults.loginSuccessful ? '✅' : '❌');
  console.log('🔌 Connection established:', testResults.connectionEstablished ? '✅' : '❌');
  console.log('💓 Heartbeat working:', testResults.heartbeatWorking ? '✅' : '❌');
  console.log('🔄 Connection stable:', testResults.connectionStable ? '✅' : '❌');
  console.log('📊 Server pings received:', testResults.serverPingsReceived);
  console.log('📤 Server pongs sent:', testResults.serverPongsSet);
  console.log('🔌 Disconnect count:', testResults.disconnectCount);
  
  const overallSuccess = testResults.loginSuccessful && 
                        testResults.connectionEstablished && 
                        testResults.heartbeatWorking && 
                        testResults.connectionStable &&
                        testResults.serverPingsReceived > 0 &&
                        testResults.disconnectCount <= 1; // Allow 1 for planned disconnect
  
  console.log('\n🏆 OVERALL RESULT:', overallSuccess ? '✅ SUCCESS' : '❌ FAILED');
  
  if (overallSuccess) {
    console.log('🎉 Collaboration connection dropping issue has been RESOLVED!');
    console.log('💡 The application-level ping/pong heartbeat is working correctly.');
  } else {
    console.log('⚠️ There may still be issues with the collaboration connection.');
  }
  
  console.log('\n🏁 Webapp stability test completed');
}

// Run the test
testWebAppCollaborationStability().catch(console.error);
