#!/usr/bin/env node

/**
 * Debug Collaboration Connection Dropping Issue
 * This script will monitor WebSocket connections and identify why they're dropping
 */

const WebSocket = require('ws');
const http = require('http');

console.log('🔍 DEBUGGING COLLABORATION CONNECTION DROPPING');
console.log('=' .repeat(50));

let authToken = null;
let testResults = {
    loginSuccessful: false,
    initialConnection: false,
    tokenExpiry: null,
    heartbeatReceived: false,
    reconnectAttempts: 0,
    sessionDrops: 0,
    authFailures: 0,
    disconnectReasons: []
};

async function getAuthToken() {
    console.log('🔑 Step 1: Getting authentication token...');
    
    return new Promise((resolve, reject) => {
        const loginData = JSON.stringify({
            username: 'admin',
            password: 'admin123'
        });
        
        const options = {
            hostname: 'localhost',
            port: 3000,
            path: '/api/auth/login',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(loginData)
            }
        };
        
        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {                try {
                    const result = JSON.parse(data);
                    console.log('📊 Login response:', result);
                    
                    if (result.success) {
                        console.log('✅ Login successful');
                        console.log(`👤 User: ${result.user?.username}`);
                        
                        // Extract auth token from cookies
                        const cookies = res.headers['set-cookie'] || [];
                        const authCookie = cookies.find(cookie => cookie.includes('auth-token='));
                        
                        if (authCookie) {
                            const token = authCookie.split('auth-token=')[1].split(';')[0];
                            testResults.loginSuccessful = true;
                            
                            // Decode JWT to check expiry
                            try {
                                const decoded = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
                                testResults.tokenExpiry = new Date(decoded.exp * 1000);
                                console.log(`🕒 Token expires: ${testResults.tokenExpiry.toLocaleString()}`);
                                console.log(`⏰ Time until expiry: ${Math.round((testResults.tokenExpiry - Date.now()) / 1000 / 60)} minutes`);
                            } catch (jwtError) {
                                console.log('⚠️ Could not decode JWT expiry:', jwtError.message);
                            }
                            
                            resolve(token);                        } else {
                            // Also check if token is in the response body (fallback)
                            if (result.token) {
                                console.log('✅ Token found in response body');
                                testResults.loginSuccessful = true;
                                resolve(result.token);
                            } else {
                                reject(new Error('No auth token found in cookies or response'));
                            }
                        }
                    } else {
                        reject(new Error('Login failed: ' + (result.message || result.error || 'Unknown error')));
                    }
                } catch (e) {
                    reject(new Error('Invalid login response: ' + e.message));
                }
            });
        });
        
        req.on('error', reject);
        req.write(loginData);
        req.end();
    });
}

function monitorWebSocketConnection(token, duration = 120000) { // 2 minutes
    console.log('\n🔌 Step 2: Starting WebSocket connection monitoring...');
    console.log(`⏱️ Monitoring duration: ${duration / 1000} seconds`);
    
    return new Promise((resolve) => {
        const scanId = 'test-debug-' + Date.now();
        const wsUrl = `ws://localhost:4000/collaboration-ws?scanId=${scanId}&token=${encodeURIComponent(token)}`;
        
        console.log('🌐 Connecting to:', wsUrl.replace(/token=[^&]+/, 'token=***'));
        
        let ws = new WebSocket(wsUrl);
        let connectionStartTime = Date.now();
        let lastMessageTime = Date.now();
        let messageCount = 0;
        let isConnected = false;
        
        // Track heartbeat/ping intervals
        let heartbeatInterval = null;
        let expectedHeartbeat = 30000; // 30 seconds based on server code
        
        const connectionMonitor = setInterval(() => {
            const now = Date.now();
            const timeSinceLastMessage = now - lastMessageTime;
            
            if (isConnected && timeSinceLastMessage > expectedHeartbeat + 5000) {
                console.log(`⚠️ No heartbeat for ${Math.round(timeSinceLastMessage / 1000)}s - connection may be stale`);
            }
            
            if (ws.readyState === WebSocket.OPEN) {
                // Send ping to test connection
                try {
                    ws.ping();
                } catch (error) {
                    console.log('❌ Failed to send ping:', error.message);
                }
            }
        }, 10000); // Check every 10 seconds
        
        ws.on('open', () => {
            console.log('✅ WebSocket connection established');
            isConnected = true;
            testResults.initialConnection = true;
            lastMessageTime = Date.now();
        });
        
        ws.on('message', (data) => {
            try {
                const message = JSON.parse(data);
                messageCount++;
                lastMessageTime = Date.now();
                
                console.log(`📨 Message ${messageCount}: ${message.type} (${Date.now() - connectionStartTime}ms)`);
                  if (message.type === 'session_data') {
                    console.log(`   👥 Users in session: ${message.users?.length || 0}`);
                    console.log(`   🔒 Device locks: ${message.locks?.length || 0}`);
                    console.log(`   📊 Session version: ${message.version || 'unknown'}`);
                }
                
                if (message.type === 'server_ping') {
                    console.log('   🏓 Received server ping - responding with pong');
                    ws.send(JSON.stringify({ type: 'server_pong', timestamp: new Date() }));
                }
                
                if (message.type === 'heartbeat' || message.type === 'ping' || message.type === 'pong') {
                    testResults.heartbeatReceived = true;
                    console.log('   💓 Heartbeat received');
                }
                
                if (message.type === 'error') {
                    console.log(`   ❌ Server error: ${message.message}`);
                    if (message.message.includes('auth') || message.message.includes('token')) {
                        testResults.authFailures++;
                    }
                }
                
            } catch (error) {
                console.log('❌ Failed to parse message:', data.toString());
            }
        });
        
        ws.on('ping', () => {
            console.log('🏓 Received ping from server');
            testResults.heartbeatReceived = true;
        });
        
        ws.on('pong', () => {
            console.log('🏓 Received pong from server');
        });
        
        ws.on('close', (code, reason) => {
            const disconnectTime = Date.now() - connectionStartTime;
            console.log(`🔌 Connection closed after ${Math.round(disconnectTime / 1000)}s`);
            console.log(`   Code: ${code}`);
            console.log(`   Reason: ${reason?.toString() || 'No reason provided'}`);
            
            testResults.sessionDrops++;
            testResults.disconnectReasons.push({
                code,
                reason: reason?.toString(),
                duration: disconnectTime,
                messageCount
            });
            
            // Check if this was an authentication issue
            if (code === 1008) {
                console.log('   🔍 Code 1008 indicates authentication/authorization issue');
                testResults.authFailures++;
            }
            
            // Check if connection dropped before expected duration
            if (disconnectTime < duration - 5000) { // Allow 5s tolerance
                console.log('   ⚠️ Connection dropped earlier than expected');
                
                // Try to reconnect once to test reconnection logic
                if (testResults.reconnectAttempts < 1) {
                    console.log('   🔄 Attempting reconnection in 2 seconds...');
                    testResults.reconnectAttempts++;
                    
                    setTimeout(() => {
                        try {
                            ws = new WebSocket(wsUrl);
                            setupWebSocketHandlers(ws);
                        } catch (reconnectError) {
                            console.log('❌ Reconnection failed:', reconnectError.message);
                        }
                    }, 2000);
                }
            }
            
            isConnected = false;
            clearInterval(connectionMonitor);
        });
        
        ws.on('error', (error) => {
            console.log('❌ WebSocket error:', error.message);
            
            if (error.code === 'ECONNREFUSED') {
                console.log('   🔍 Server may not be running');
            } else if (error.message.includes('401') || error.message.includes('auth')) {
                console.log('   🔍 Authentication error detected');
                testResults.authFailures++;
            }
        });
        
        function setupWebSocketHandlers(websocket) {
            websocket.on('open', () => {
                console.log('✅ Reconnection successful');
                isConnected = true;
            });
            
            websocket.on('message', (data) => {
                try {
                    const message = JSON.parse(data);
                    console.log(`📨 Reconnect message: ${message.type}`);
                } catch (error) {
                    console.log('❌ Failed to parse reconnect message');
                }
            });
            
            websocket.on('close', (code, reason) => {
                console.log(`🔌 Reconnection closed: ${code} - ${reason?.toString()}`);
                testResults.sessionDrops++;
            });
        }
        
        // Test token validity during connection
        const tokenValidityCheck = setInterval(async () => {
            try {
                const { default: fetch } = await import('node-fetch');
                const response = await fetch('http://localhost:3000/api/auth/verify', {
                    method: 'GET',
                    headers: {
                        'Cookie': `auth-token=${token}`,
                        'Content-Type': 'application/json'
                    }
                });
                
                if (!response.ok) {
                    console.log(`⚠️ Token validation failed: ${response.status}`);
                    testResults.authFailures++;
                }
            } catch (error) {
                console.log('⚠️ Token validity check failed:', error.message);
            }
        }, 30000); // Check every 30 seconds
        
        // End monitoring after specified duration
        setTimeout(() => {
            clearInterval(connectionMonitor);
            clearInterval(tokenValidityCheck);
            
            if (ws.readyState === WebSocket.OPEN) {
                console.log('⏰ Monitoring period complete - closing connection');
                ws.close(1000, 'Test complete');
            }
            
            resolve();
        }, duration);
    });
}

function analyzeResults() {
    console.log('\n📊 CONNECTION ANALYSIS RESULTS');
    console.log('=' .repeat(50));
    
    console.log(`🔐 Login successful: ${testResults.loginSuccessful ? '✅' : '❌'}`);
    console.log(`🔌 Initial connection: ${testResults.initialConnection ? '✅' : '❌'}`);
    console.log(`💓 Heartbeat received: ${testResults.heartbeatReceived ? '✅' : '❌'}`);
    console.log(`🔄 Reconnection attempts: ${testResults.reconnectAttempts}`);
    console.log(`📉 Session drops: ${testResults.sessionDrops}`);
    console.log(`🔒 Auth failures: ${testResults.authFailures}`);
    
    if (testResults.tokenExpiry) {
        const timeUntilExpiry = testResults.tokenExpiry - Date.now();
        console.log(`⏰ Token expires in: ${Math.round(timeUntilExpiry / 1000 / 60)} minutes`);
        
        if (timeUntilExpiry < 300000) { // Less than 5 minutes
            console.log('⚠️ WARNING: Token expires soon - this could cause connection drops');
        }
    }
    
    if (testResults.disconnectReasons.length > 0) {
        console.log('\n🔍 DISCONNECT ANALYSIS:');
        testResults.disconnectReasons.forEach((disconnect, index) => {
            console.log(`   ${index + 1}. Code ${disconnect.code}: ${disconnect.reason || 'No reason'}`);
            console.log(`      Duration: ${Math.round(disconnect.duration / 1000)}s, Messages: ${disconnect.messageCount}`);
        });
    }
    
    // Provide recommendations
    console.log('\n💡 RECOMMENDATIONS:');
    
    if (testResults.authFailures > 0) {
        console.log('🔒 Authentication issues detected:');
        console.log('   - Check JWT token expiry settings');
        console.log('   - Verify token refresh mechanism');
        console.log('   - Check session management on server');
    }
    
    if (!testResults.heartbeatReceived) {
        console.log('💓 No heartbeat detected:');
        console.log('   - Server heartbeat mechanism may not be working');
        console.log('   - Check collaboration server startHeartbeat() function');
    }
    
    if (testResults.sessionDrops > 1) {
        console.log('📉 Multiple session drops detected:');
        console.log('   - Check network stability');
        console.log('   - Review server resource usage');
        console.log('   - Implement better reconnection logic');
    }
    
    // Check common issues
    const hasQuickDrops = testResults.disconnectReasons.some(d => d.duration < 30000);
    if (hasQuickDrops) {
        console.log('⚡ Quick disconnections detected (< 30s):');
        console.log('   - Possible authentication rejection');
        console.log('   - Server startup issues');
        console.log('   - Database connection problems');
    }
    
    const hasAuthCodes = testResults.disconnectReasons.some(d => d.code === 1008);
    if (hasAuthCodes) {
        console.log('🔐 Authentication-related disconnections (1008):');
        console.log('   - Token may be invalid or expired');
        console.log('   - Server authentication verification failing');
        console.log('   - Check collaboration server verifyAuth() method');
    }
}

async function runDebugTest() {
    try {
        // Get fresh auth token
        authToken = await getAuthToken();
          // Monitor connection for 30 seconds (shorter test)
        await monitorWebSocketConnection(authToken, 30000);
        
        // Analyze results
        analyzeResults();
        
    } catch (error) {
        console.error('❌ Debug test failed:', error.message);
        
        console.log('\n🔧 TROUBLESHOOTING STEPS:');
        console.log('1. Ensure main server is running on port 3000');
        console.log('2. Ensure collaboration server is running on port 4000');
        console.log('3. Check database connection');
        console.log('4. Verify admin user exists with correct password');
        console.log('5. Check server logs for errors');
    }
}

// Run the debug test
runDebugTest().then(() => {
    console.log('\n🏁 Debug test completed');
    process.exit(0);
}).catch(error => {
    console.error('💥 Fatal error:', error);
    process.exit(1);
});
