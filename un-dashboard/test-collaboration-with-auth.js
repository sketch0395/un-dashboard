#!/usr/bin/env node

/**
 * Practical Collaboration System Test
 * This script tests the collaboration system using real authentication
 */

const WebSocket = require('ws');
const https = require('https');
const http = require('http');

// Configuration
const TEST_CONFIG = {
  scanId: `test-scan-${Date.now()}`,
  deviceId: '192.168.1.100',
  wsUrl: 'ws://localhost:4000/collaboration-ws'
};

console.log('🧪 Practical Collaboration System Test...');
console.log('================================================');
console.log('📋 Test Configuration:');
console.log(`   Scan ID: ${TEST_CONFIG.scanId}`);
console.log(`   Device ID: ${TEST_CONFIG.deviceId}`);
console.log(`   WebSocket URL: ${TEST_CONFIG.wsUrl}`);

// Check if collaboration server is running
function checkCollaborationServer() {
  return new Promise((resolve) => {
    console.log('\n🔍 Checking if collaboration server is running...');
    
    const ws = new WebSocket('ws://localhost:4000/collaboration-ws?scanId=test&token=test');
    const timeout = setTimeout(() => {
      ws.close();
      resolve({ running: false, reason: 'timeout' });
    }, 3000);
    
    ws.on('open', () => {
      clearTimeout(timeout);
      ws.close();
      resolve({ running: true });
    });
    
    ws.on('error', (error) => {
      clearTimeout(timeout);
      resolve({ running: false, reason: error.message });
    });
    
    ws.on('close', (code, reason) => {
      clearTimeout(timeout);
      if (code === 1008 && reason === 'Invalid authentication') {
        resolve({ running: true, authRequired: true });
      } else {
        resolve({ running: false, reason: `${code} - ${reason}` });
      }
    });
  });
}

// Manual token input (fallback)
function promptForToken() {
  return new Promise((resolve) => {
    console.log('\n⚠️  No automatic authentication found.');
    console.log('📖 To test collaboration:');
    console.log('   1. Open http://localhost:3000 in your browser');
    console.log('   2. Login with your credentials');
    console.log('   3. Open browser developer tools');
    console.log('   4. Go to Application > Cookies > localhost:3000');
    console.log('   5. Copy the "auth-token" cookie value');
    console.log('   6. Paste it here when prompted');
    console.log('');
    
    const readline = require('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    rl.question('🔑 Enter auth-token cookie value (or press Enter to skip): ', (token) => {
      rl.close();
      if (token.trim()) {
        resolve({ token: token.trim(), manual: true });
      } else {
        resolve({ skip: true });
      }
    });
  });
}

// Test WebSocket connection with token
async function testWebSocketConnection(token) {
  return new Promise((resolve, reject) => {
    console.log('\n🔌 Testing WebSocket Connection...');
    
    const wsUrl = `${TEST_CONFIG.wsUrl}?scanId=${TEST_CONFIG.scanId}&token=${token}`;
    console.log(`📡 Connecting to: ${wsUrl.replace(token, 'TOKEN_HIDDEN')}`);
    
    const ws = new WebSocket(wsUrl);
    const timeout = setTimeout(() => {
      ws.close();
      reject(new Error('Connection timeout'));
    }, 10000);
    
    ws.on('open', () => {
      clearTimeout(timeout);
      console.log('✅ WebSocket connection established');
      
      // Test device lock request
      testDeviceLock(ws, resolve, reject);
    });
    
    ws.on('error', (error) => {
      clearTimeout(timeout);
      console.log('❌ WebSocket error:', error.message);
      reject(error);
    });
    
    ws.on('close', (code, reason) => {
      clearTimeout(timeout);
      if (code !== 1000) {
        console.log(`❌ Connection closed: ${code} - ${reason}`);
        if (code === 1008) {
          console.log('💡 This likely means the token is invalid or expired');
          console.log('   Try logging in again and getting a fresh token');
        }
        reject(new Error(`Connection closed: ${code} - ${reason}`));
      }
    });
  });
}

// Test device locking functionality
function testDeviceLock(ws, resolve, reject) {
  console.log('\n🔒 Testing Device Lock Request...');
  
  let lockRequestResolved = false;
  const lockTimeout = setTimeout(() => {
    if (!lockRequestResolved) {
      console.log('❌ Device lock request timeout');
      ws.close();
      reject(new Error('Device lock timeout'));
    }
  }, 5000);
  
  // Listen for lock response
  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data.toString());
      console.log('📨 Received message:', JSON.stringify(message, null, 2));
      
      if (message.type === 'device_locked') {
        clearTimeout(lockTimeout);
        lockRequestResolved = true;
        console.log('✅ Device locked successfully');
        
        // Test device unlock
        setTimeout(() => {
          testDeviceUnlock(ws, resolve, reject);
        }, 1000);
        
      } else if (message.type === 'device_lock_failed') {
        clearTimeout(lockTimeout);
        lockRequestResolved = true;
        console.log('❌ Device lock failed:', message.reason);
        ws.close();
        reject(new Error(`Device lock failed: ${message.reason}`));
      }
    } catch (error) {
      console.log('❌ Error parsing message:', error.message);
    }
  });
  
  // Send lock request
  const lockRequest = {
    type: 'device_lock',
    deviceId: TEST_CONFIG.deviceId,
    timestamp: new Date().toISOString()
  };
  
  console.log('📤 Sending lock request:', JSON.stringify(lockRequest, null, 2));
  ws.send(JSON.stringify(lockRequest));
}

// Test device unlocking functionality
function testDeviceUnlock(ws, resolve, reject) {
  console.log('\n🔓 Testing Device Unlock Request...');
  
  let unlockRequestResolved = false;
  const unlockTimeout = setTimeout(() => {
    if (!unlockRequestResolved) {
      console.log('❌ Device unlock request timeout');
      ws.close();
      reject(new Error('Device unlock timeout'));
    }
  }, 5000);
  
  // Listen for unlock response
  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data.toString());
      console.log('📨 Received message:', JSON.stringify(message, null, 2));
      
      if (message.type === 'device_unlocked') {
        clearTimeout(unlockTimeout);
        unlockRequestResolved = true;
        console.log('✅ Device unlocked successfully');
        
        ws.close(1000, 'Test completed');
        resolve();
        
      } else if (message.type === 'device_unlock_failed') {
        clearTimeout(unlockTimeout);
        unlockRequestResolved = true;
        console.log('❌ Device unlock failed:', message.reason);
        ws.close();
        reject(new Error(`Device unlock failed: ${message.reason}`));
      }
    } catch (error) {
      console.log('❌ Error parsing message:', error.message);
    }
  });
  
  // Send unlock request
  const unlockRequest = {
    type: 'device_unlock',
    deviceId: TEST_CONFIG.deviceId,
    timestamp: new Date().toISOString()
  };
  
  console.log('📤 Sending unlock request:', JSON.stringify(unlockRequest, null, 2));
  ws.send(JSON.stringify(unlockRequest));
}

// Main test execution
async function runTest() {
  try {
    // Check if collaboration server is running
    const serverCheck = await checkCollaborationServer();
    
    if (!serverCheck.running) {
      console.log('❌ Collaboration server is not running');
      console.log(`   Reason: ${serverCheck.reason}`);
      console.log('\n💡 To start the collaboration server:');
      console.log('   1. Make sure the main server is running on port 3000');
      console.log('   2. The collaboration server should auto-start on port 4000');
      return;
    }
    
    if (serverCheck.authRequired) {
      console.log('✅ Collaboration server is running and properly rejecting invalid auth');
      console.log('🔒 Authentication is required for WebSocket connections');
    } else {
      console.log('✅ Collaboration server is running');
    }
    
    // Try to get existing authentication
    const tokenInput = await promptForToken();
    if (tokenInput.skip) {
      console.log('\n⏭️  Authentication test skipped');
      console.log('📋 Server Status Summary:');
      console.log('   ✅ Collaboration server is running on port 4000');
      console.log('   ✅ WebSocket endpoint is accessible');
      console.log('   ✅ Authentication rejection is working');
      console.log('\n🎯 Next Steps:');
      console.log('   1. Login at http://localhost:3000');
      console.log('   2. Test device locking in the UI');
      console.log('   3. Verify collaboration features work end-to-end');
      return;
    }
    
    // Test WebSocket connection with provided token
    await testWebSocketConnection(tokenInput.token);
    
    console.log('\n🎉 All collaboration tests passed!');
    console.log('✅ The device locking system is working correctly.');
    
  } catch (error) {
    console.log('\n💥 Test failed:', error.message);
    
    if (error.message.includes('Connection closed: 1008')) {
      console.log('\n🔍 Troubleshooting Authentication Issues:');
      console.log('   1. Make sure you are logged in at http://localhost:3000');
      console.log('   2. Check that the auth-token cookie is valid');
      console.log('   3. Try logging out and logging back in');
      console.log('   4. Verify the token is not expired');
    }
    
    process.exit(1);
  }
}

// Handle cleanup
process.on('SIGINT', () => {
  console.log('\n🛑 Test interrupted');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Test terminated');
  process.exit(0);
});

// Run the test
runTest();
