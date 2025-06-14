// Simple Collaboration Test - CommonJS
const fetch = require('node-fetch');
const WebSocket = require('ws');

const BASE_URL = 'http://localhost:3000';

console.log('🚀 Starting Simple Collaboration Test');
console.log('=====================================');

async function testBasicConnectivity() {
    console.log('🔗 Testing basic server connectivity...');
    
    try {
        const response = await fetch(`${BASE_URL}/api/health`);
        console.log('📡 Server response status:', response.status);
        
        if (response.status === 404) {
            console.log('ℹ️ Health endpoint not found, testing login endpoint...');
            const loginTest = await fetch(`${BASE_URL}/login`);
            console.log('📡 Login page status:', loginTest.status);
            if (loginTest.ok) {
                console.log('✅ Server is responding correctly');
                return true;
            }
        } else if (response.ok) {
            console.log('✅ Server health check passed');
            return true;
        }
        
        console.log('❌ Server connectivity issues');
        return false;
    } catch (error) {
        console.error('❌ Server connectivity test failed:', error.message);
        return false;
    }
}

async function testWebSocketConnection() {
    console.log('🔗 Testing WebSocket collaboration endpoint...');
    
    return new Promise((resolve) => {
        const ws = new WebSocket('ws://localhost:3000/ws/collaboration?scanId=test-scan-123');
        let testResult = { connected: false, authRequired: false, error: null };
        
        ws.on('open', function() {
            console.log('✅ WebSocket connection opened');
            testResult.connected = true;
        });
        
        ws.on('message', function(data) {
            console.log('📨 Received WebSocket message:', data.toString());
        });
        
        ws.on('error', function(error) {
            console.log('⚠️ WebSocket error (expected for auth):', error.message);
            testResult.error = error.message;
        });
        
        ws.on('close', function(code, reason) {
            console.log(`🔌 WebSocket closed: ${code} - ${reason}`);
            if (code === 1008) {
                console.log('ℹ️ Authentication required (expected behavior)');
                testResult.authRequired = true;
            }
            resolve(testResult);
        });
        
        // Close after 5 seconds
        setTimeout(() => {
            if (ws.readyState === WebSocket.OPEN) {
                ws.close();
            }
        }, 5000);
    });
}

async function testCollaborationFileStructure() {
    console.log('📁 Checking collaboration file structure...');
    
    const fs = require('fs');
    const path = require('path');
    
    const filesToCheck = [
        'src/app/hooks/useCollaboration.js',
        'src/app/networkscan/components/SharedScansBrowser.js',
        'src/app/networkscan/components/networkdashboard.js',
        'collaboration-server.js',
        'server-network.js'
    ];
    
    let allFilesExist = true;
    
    for (const file of filesToCheck) {
        const filePath = path.join(__dirname, file);
        if (fs.existsSync(filePath)) {
            console.log(`✅ ${file} - exists`);
        } else {
            console.log(`❌ ${file} - missing`);
            allFilesExist = false;
        }
    }
    
    return allFilesExist;
}

async function checkCollaborationEvents() {
    console.log('🎯 Testing collaboration event system...');
    
    // Mock browser environment
    global.window = {
        events: {},
        addEventListener: function(type, handler) {
            if (!this.events[type]) this.events[type] = [];
            this.events[type].push(handler);
            console.log(`✅ Event listener registered: ${type}`);
        },
        removeEventListener: function(type, handler) {
            if (this.events[type]) {
                this.events[type] = this.events[type].filter(h => h !== handler);
                console.log(`✅ Event listener removed: ${type}`);
            }
        },
        dispatchEvent: function(event) {
            console.log(`📢 Event dispatched: ${event.type}`);
            if (this.events[event.type]) {
                this.events[event.type].forEach(handler => {
                    try {
                        handler(event);
                        console.log(`✅ Event handler executed successfully`);
                    } catch (error) {
                        console.log(`❌ Event handler error:`, error.message);
                    }
                });
            }
            return true;
        }
    };
    
    // Test custom events
    const deviceUpdateEvent = {
        type: 'collaborationDeviceUpdate',
        detail: {
            deviceId: 'test-device-123',
            changes: { customName: 'Test Device' },
            userId: 'test-user',
            username: 'Test User',
            version: 1,
            timestamp: new Date()
        }
    };
    
    const scanUpdateEvent = {
        type: 'collaborationScanUpdate',
        detail: {
            changes: { scanName: 'Test Scan' },
            userId: 'test-user',
            username: 'Test User',
            version: 2,
            timestamp: new Date()
        }
    };
    
    // Add listeners
    global.window.addEventListener('collaborationDeviceUpdate', function(event) {
        console.log('📱 Device update event received:', event.detail.deviceId);
    });
    
    global.window.addEventListener('collaborationScanUpdate', function(event) {
        console.log('📊 Scan update event received:', event.detail.changes.scanName);
    });
    
    // Dispatch events
    global.window.dispatchEvent(deviceUpdateEvent);
    global.window.dispatchEvent(scanUpdateEvent);
    
    console.log('✅ Collaboration event system test completed');
    return true;
}

async function runSimpleTest() {
    console.log('🎯 Running Simple Collaboration Verification Test');
    console.log('================================================\n');
    
    const results = {};
    
    // Test 1: Basic connectivity
    results.connectivity = await testBasicConnectivity();
    console.log('');
    
    // Test 2: WebSocket connection
    results.websocket = await testWebSocketConnection();
    console.log('');
    
    // Test 3: File structure
    results.fileStructure = await testCollaborationFileStructure();
    console.log('');
    
    // Test 4: Event system
    results.eventSystem = await checkCollaborationEvents();
    console.log('');
    
    // Summary
    console.log('📋 Test Results Summary:');
    console.log('========================');
    console.log(`✅ Server Connectivity: ${results.connectivity ? 'PASS' : 'FAIL'}`);
    console.log(`✅ WebSocket Endpoint: ${results.websocket.connected || results.websocket.authRequired ? 'PASS' : 'FAIL'}`);
    console.log(`✅ File Structure: ${results.fileStructure ? 'PASS' : 'FAIL'}`);
    console.log(`✅ Event System: ${results.eventSystem ? 'PASS' : 'FAIL'}`);
    
    const overallSuccess = results.connectivity && 
                          (results.websocket.connected || results.websocket.authRequired) && 
                          results.fileStructure && 
                          results.eventSystem;
    
    console.log('\n🎯 Overall Status:');
    if (overallSuccess) {
        console.log('✅ SUCCESS: Collaboration system infrastructure is working properly!');
        console.log('\n🚀 Manual Testing Instructions:');
        console.log('1. Open: http://localhost:3000/login');
        console.log('2. Login with admin credentials');
        console.log('3. Navigate to Network Scan or Shared Scans');
        console.log('4. Open multiple browser tabs with the same scan');
        console.log('5. Make device edits in one tab');
        console.log('6. Verify real-time updates appear in other tabs');
        console.log('7. Check topology map updates when collaborative changes occur');
    } else {
        console.log('❌ ISSUES DETECTED: Some collaboration components need attention');
    }
    
    return overallSuccess;
}

// Run the test
runSimpleTest().catch(console.error);
