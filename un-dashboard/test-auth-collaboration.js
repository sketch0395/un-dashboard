#!/usr/bin/env node

/**
 * Test Script for Collaboration System with Valid Authentication
 * This script creates a valid token and tests the collaboration flow
 */

const WebSocket = require('ws');
const jwt = require('jsonwebtoken');
const { ObjectId } = require('mongodb');

// Configuration
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production';
const TEST_CONFIG = {
  scanId: `test-scan-${Date.now()}`,
  deviceId: '192.168.1.100',
  wsUrl: 'ws://localhost:4000/collaboration-ws'
};

console.log('🧪 Starting Authenticated Collaboration Test...');
console.log('================================================');
console.log('📋 Test Configuration:');
console.log(`   Scan ID: ${TEST_CONFIG.scanId}`);
console.log(`   Device ID: ${TEST_CONFIG.deviceId}`);
console.log(`   WebSocket URL: ${TEST_CONFIG.wsUrl}`);

// Create a valid test token
function createTestToken() {
  const testUserId = new ObjectId().toString();
  const testSessionId = require('crypto').randomBytes(16).toString('hex');
  
  const token = jwt.sign(
    { 
      userId: testUserId,
      sessionId: testSessionId
    },
    JWT_SECRET,
    { 
      expiresIn: '1h',
      issuer: 'un-dashboard',
      audience: 'un-dashboard-users'
    }
  );
  
  console.log('🔑 Created test token:');
  console.log(`   User ID: ${testUserId}`);
  console.log(`   Session ID: ${testSessionId}`);
  console.log(`   Token: ${token.substring(0, 50)}...`);
  
  return { token, userId: testUserId, sessionId: testSessionId };
}

// Test WebSocket connection with authentication
async function testWebSocketConnection() {
  return new Promise((resolve, reject) => {
    console.log('\n1️⃣ Testing WebSocket Connection with Authentication...');
    
    const { token, userId } = createTestToken();
    const wsUrl = `${TEST_CONFIG.wsUrl}?scanId=${TEST_CONFIG.scanId}&token=${token}`;
    
    console.log(`📡 Connecting to: ${wsUrl.replace(token, 'TOKEN_HIDDEN')}`);
    
    const ws = new WebSocket(wsUrl);
    const timeout = setTimeout(() => {
      ws.close();
      reject(new Error('Connection timeout'));
    }, 5000);
    
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
        console.log(`❌ Connection closed unexpectedly: ${code} - ${reason}`);
        reject(new Error(`Connection closed: ${code} - ${reason}`));
      }
    });
  });
}

// Test device locking functionality
function testDeviceLock(ws, resolve, reject) {
  console.log('\n2️⃣ Testing Device Lock Request...');
  
  let lockRequestResolved = false;
  const lockTimeout = setTimeout(() => {
    if (!lockRequestResolved) {
      console.log('❌ Device lock request timeout');
      ws.close();
      reject(new Error('Device lock timeout'));
    }
  }, 3000);
  
  // Listen for lock response
  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data.toString());
      console.log('📨 Received message:', message);
      
      if (message.type === 'device_locked') {
        clearTimeout(lockTimeout);
        lockRequestResolved = true;
        console.log('✅ Device locked successfully');
        
        // Test device unlock
        testDeviceUnlock(ws, resolve, reject);
        
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
  
  console.log('📤 Sending lock request:', lockRequest);
  ws.send(JSON.stringify(lockRequest));
}

// Test device unlocking functionality
function testDeviceUnlock(ws, resolve, reject) {
  console.log('\n3️⃣ Testing Device Unlock Request...');
  
  let unlockRequestResolved = false;
  const unlockTimeout = setTimeout(() => {
    if (!unlockRequestResolved) {
      console.log('❌ Device unlock request timeout');
      ws.close();
      reject(new Error('Device unlock timeout'));
    }
  }, 3000);
  
  // Listen for unlock response
  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data.toString());
      console.log('📨 Received message:', message);
      
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
  
  console.log('📤 Sending unlock request:', unlockRequest);
  ws.send(JSON.stringify(unlockRequest));
}

// Run the test
async function runTest() {
  try {
    await testWebSocketConnection();
    console.log('\n🎉 All tests passed! Collaboration system is working correctly.');
  } catch (error) {
    console.log('\n💥 Test failed:', error.message);
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
