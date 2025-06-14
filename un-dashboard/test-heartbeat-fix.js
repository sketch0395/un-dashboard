#!/usr/bin/env node

/**
 * Test Heartbeat Fix - Simple test to verify our heartbeat improvements
 */

const WebSocket = require('ws');

console.log('🏓 TESTING HEARTBEAT FIX');
console.log('=' .repeat(30));

async function testHeartbeatConnection() {
    return new Promise((resolve) => {
        const scanId = 'test-heartbeat-' + Date.now();
        const wsUrl = `ws://localhost:4000/collaboration-ws?scanId=${scanId}`;
        
        console.log('🔗 Connecting to collaboration server...');
        console.log('📍 URL:', wsUrl);
        
        const ws = new WebSocket(wsUrl);
        let connectionStartTime = Date.now();
        let pingCount = 0;
        let pongCount = 0;
        let messages = [];
        
        // Timeout after 45 seconds (should see at least 2 heartbeat cycles)
        const timeout = setTimeout(() => {
            console.log('\n⏰ Test timeout reached (45 seconds)');
            ws.close();
            resolve();
        }, 45000);
        
        ws.on('open', () => {
            console.log('✅ Connection established');
        });
        
        ws.on('message', (data) => {
            try {
                const message = JSON.parse(data);
                const elapsed = Date.now() - connectionStartTime;
                messages.push({ type: message.type, time: elapsed });
                console.log(`📨 ${Math.round(elapsed/1000)}s: ${message.type}`);
                
                if (message.type === 'session_data') {
                    console.log(`   👥 Users: ${message.users?.length || 0}`);
                }
            } catch (error) {
                console.log('❌ Failed to parse message');
            }
        });
        
        ws.on('ping', (data) => {
            pingCount++;
            const elapsed = Date.now() - connectionStartTime;
            console.log(`🏓 ${Math.round(elapsed/1000)}s: PING received (#${pingCount})`);
        });
        
        ws.on('pong', (data) => {
            pongCount++;
            const elapsed = Date.now() - connectionStartTime;
            console.log(`🏓 ${Math.round(elapsed/1000)}s: PONG received (#${pongCount})`);
        });
        
        ws.on('close', (code, reason) => {
            clearTimeout(timeout);
            const duration = Date.now() - connectionStartTime;
            
            console.log(`\n🔌 Connection closed after ${Math.round(duration/1000)}s`);
            console.log(`   Code: ${code}`);
            console.log(`   Reason: ${reason?.toString() || 'None'}`);
            console.log(`   Pings received: ${pingCount}`);
            console.log(`   Pongs sent: ${pongCount}`);
            console.log(`   Total messages: ${messages.length}`);
            
            console.log('\n📊 MESSAGE TIMELINE:');
            messages.forEach((msg, i) => {
                console.log(`   ${i+1}. ${Math.round(msg.time/1000)}s: ${msg.type}`);
            });
            
            console.log('\n💡 ANALYSIS:');
            if (duration > 30000) {
                console.log('✅ Connection lasted > 30s (heartbeat working)');
            } else {
                console.log('❌ Connection dropped < 30s (heartbeat issue)');
            }
            
            if (pingCount >= 2) {
                console.log('✅ Multiple heartbeats received (server heartbeat working)');
            } else if (pingCount === 1) {
                console.log('⚠️ Only 1 heartbeat received (may be timing issue)');
            } else {
                console.log('❌ No heartbeats received (server heartbeat not working)');
            }
            
            if (code === 1006) {
                console.log('⚠️ Code 1006 = Abnormal closure (no close frame)');
                console.log('   Possible causes:');
                console.log('   - Server crashed/killed connection');
                console.log('   - Network interruption');
                console.log('   - Browser/client closed connection improperly');
            }
            
            resolve();
        });
        
        ws.on('error', (error) => {
            console.log('❌ WebSocket error:', error.message);
            
            if (error.code === 'ECONNREFUSED') {
                console.log('💡 Server not running on port 4000');
            } else if (error.message.includes('401') || error.message.includes('auth')) {
                console.log('💡 Authentication issue (expected without token)');
            }
        });
    });
}

// Run the test
testHeartbeatConnection().then(() => {
    console.log('\n🏁 Heartbeat test completed');
    process.exit(0);
});
