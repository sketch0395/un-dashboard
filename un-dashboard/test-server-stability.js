#!/usr/bin/env node

/**
 * Test server stability - check for unhandled exceptions
 */

const WebSocket = require('ws');
const http = require('http');

console.log('🔍 TESTING SERVER STABILITY');
console.log('=' .repeat(40));

// Test multiple concurrent connections to see if server handles load
async function testServerStability() {
    console.log('🚀 Testing server stability with multiple connections...');
    
    // First get auth token
    const token = await getAuthToken();
    console.log('✅ Got auth token');
    
    // Create multiple connections and monitor them
    const connections = [];
    const results = [];
    
    for (let i = 0; i < 3; i++) {
        console.log(`📡 Creating connection ${i + 1}/3...`);
        
        const promise = createMonitoredConnection(token, i + 1);
        connections.push(promise);
        
        // Stagger connections by 1 second
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    // Wait for all connections to complete or timeout
    const allResults = await Promise.allSettled(connections);
    
    console.log('\n📊 STABILITY TEST RESULTS:');
    allResults.forEach((result, index) => {
        if (result.status === 'fulfilled') {
            console.log(`   Connection ${index + 1}: ✅ ${result.value.status} (${result.value.duration}s)`);
            results.push(result.value);
        } else {
            console.log(`   Connection ${index + 1}: ❌ ${result.reason.message}`);
        }
    });
    
    // Analyze patterns
    const avgDuration = results.length > 0 ? 
        results.reduce((sum, r) => sum + r.duration, 0) / results.length : 0;
    
    console.log(`\n📈 Average connection duration: ${avgDuration.toFixed(1)}s`);
    
    const allDroppedQuickly = results.every(r => r.duration < 15);
    if (allDroppedQuickly && results.length > 0) {
        console.log('⚠️ All connections dropped quickly - likely server issue');
    }
    
    const consistentDropTime = results.length > 1 && 
        Math.abs(Math.max(...results.map(r => r.duration)) - Math.min(...results.map(r => r.duration))) < 3;
    
    if (consistentDropTime) {
        console.log('🔍 Consistent drop timing - suggests systematic server issue');
    }
}

async function getAuthToken() {
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
            res.on('end', () => {
                try {
                    const result = JSON.parse(data);
                    if (result.success) {
                        const cookies = res.headers['set-cookie'] || [];
                        const authCookie = cookies.find(cookie => cookie.includes('auth-token='));
                        
                        if (authCookie) {
                            const token = authCookie.split('auth-token=')[1].split(';')[0];
                            resolve(token);
                        } else if (result.token) {
                            resolve(result.token);
                        } else {
                            reject(new Error('No auth token found'));
                        }
                    } else {
                        reject(new Error('Login failed'));
                    }
                } catch (e) {
                    reject(new Error('Invalid login response'));
                }
            });
        });
        
        req.on('error', reject);
        req.write(loginData);
        req.end();
    });
}

async function createMonitoredConnection(token, connectionId) {
    return new Promise((resolve) => {
        const scanId = `test-stability-${connectionId}-${Date.now()}`;
        const wsUrl = `ws://localhost:4000/collaboration-ws?scanId=${scanId}&token=${encodeURIComponent(token)}`;
        
        const ws = new WebSocket(wsUrl);
        const startTime = Date.now();
        let messagesReceived = 0;
        let lastActivity = Date.now();
        
        // Timeout after 20 seconds
        const timeout = setTimeout(() => {
            const duration = (Date.now() - startTime) / 1000;
            ws.close();
            resolve({
                connectionId,
                status: 'timeout',
                duration,
                messages: messagesReceived
            });
        }, 20000);
        
        ws.on('open', () => {
            console.log(`   📡 Connection ${connectionId} established`);
            lastActivity = Date.now();
        });
        
        ws.on('message', (data) => {
            messagesReceived++;
            lastActivity = Date.now();
            
            try {
                const message = JSON.parse(data);
                console.log(`   📨 Conn${connectionId}: ${message.type}`);
            } catch (error) {
                console.log(`   📨 Conn${connectionId}: [unparseable]`);
            }
        });
        
        ws.on('ping', () => {
            console.log(`   🏓 Conn${connectionId}: ping`);
            lastActivity = Date.now();
        });
        
        ws.on('pong', () => {
            console.log(`   🏓 Conn${connectionId}: pong`);
            lastActivity = Date.now();
        });
        
        ws.on('close', (code, reason) => {
            clearTimeout(timeout);
            const duration = (Date.now() - startTime) / 1000;
            const timeSinceActivity = (Date.now() - lastActivity) / 1000;
            
            console.log(`   🔌 Conn${connectionId} closed: ${code} (${duration.toFixed(1)}s, ${timeSinceActivity.toFixed(1)}s since activity)`);
            
            resolve({
                connectionId,
                status: `closed-${code}`,
                duration,
                messages: messagesReceived,
                timeSinceLastActivity: timeSinceActivity
            });
        });
        
        ws.on('error', (error) => {
            clearTimeout(timeout);
            const duration = (Date.now() - startTime) / 1000;
            
            console.log(`   ❌ Conn${connectionId} error: ${error.message}`);
            
            resolve({
                connectionId,
                status: 'error',
                duration,
                messages: messagesReceived,
                error: error.message
            });
        });
    });
}

// Run the test
testServerStability().then(() => {
    console.log('\n🏁 Server stability test completed');
    process.exit(0);
}).catch(error => {
    console.error('💥 Test failed:', error);
    process.exit(1);
});
