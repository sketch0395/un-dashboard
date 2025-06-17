#!/usr/bin/env node

// Test script to verify collaboration server is running
const fetch = require('node-fetch');
const WebSocket = require('ws');

const COLLABORATION_PORT = process.env.COLLABORATION_PORT || 4001;
const COLLABORATION_URL = `http://localhost:${COLLABORATION_PORT}`;
const WS_URL = `ws://localhost:${COLLABORATION_PORT}/collaboration-ws`;

async function testCollaborationServer() {
  console.log('🔍 Testing collaboration server...');
  
  try {
    // Test HTTP health endpoint
    console.log('📡 Testing health endpoint...');
    const response = await fetch(`${COLLABORATION_URL}/health`);
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Health check passed:', data);
    } else {
      console.log('❌ Health check failed:', response.status, response.statusText);
      return false;
    }
    
    // Test WebSocket connection (basic connection test)
    console.log('🔌 Testing WebSocket endpoint...');
    return new Promise((resolve) => {
      const ws = new WebSocket(`${WS_URL}?scanId=test&token=test`);
      
      ws.on('open', () => {
        console.log('✅ WebSocket connection established');
        ws.close();
        resolve(true);
      });
      
      ws.on('error', (error) => {
        console.log('❌ WebSocket connection failed:', error.message);
        resolve(false);
      });
      
      ws.on('close', (code, reason) => {
        if (code === 1008) {
          console.log('🔐 WebSocket closed (authentication required) - Server is responding correctly');
          resolve(true);
        } else {
          console.log('🔌 WebSocket closed:', code, reason);
          resolve(true);
        }
      });
      
      // Timeout after 5 seconds
      setTimeout(() => {
        console.log('⏱️ WebSocket test timeout');
        ws.close();
        resolve(false);
      }, 5000);
    });
    
  } catch (error) {
    console.log('❌ Collaboration server test failed:', error.message);
    return false;
  }
}

// Run the test if this script is executed directly
if (require.main === module) {
  testCollaborationServer().then(success => {
    if (success) {
      console.log('🎉 Collaboration server is working correctly!');
      process.exit(0);
    } else {
      console.log('💥 Collaboration server test failed!');
      process.exit(1);
    }
  });
}

module.exports = { testCollaborationServer };
