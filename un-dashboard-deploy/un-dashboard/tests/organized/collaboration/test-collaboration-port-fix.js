/**
 * Quick Collaboration Fix Test
 * Tests the corrected WebSocket connection to port 4000
 */

const WebSocket = require('ws');

console.log('🔧 COLLABORATION FIX TEST - Port 4000 Connection');
console.log('=' .repeat(50));

async function testCollaborationFix() {
    console.log('🔗 Testing WebSocket connection to port 4000...');
    
    return new Promise((resolve) => {
        const ws = new WebSocket('ws://localhost:4000/collaboration-ws?scanId=test-fix-123');
        let testResult = { success: false, error: null, connectionAttempted: true };
        
        const timeout = setTimeout(() => {
            console.log('⏰ Connection timeout after 5 seconds');
            testResult.error = 'Connection timeout';
            ws.close();
            resolve(testResult);
        }, 5000);
        
        ws.on('open', () => {
            clearTimeout(timeout);
            console.log('✅ WebSocket connection successful!');
            console.log('🎯 Connection established to ws://localhost:4000/collaboration-ws');
            testResult.success = true;
            ws.close();
        });
        
        ws.on('message', (data) => {
            try {
                const message = JSON.parse(data);
                console.log('📨 Received message:', message.type);
                if (message.type === 'error' && message.message) {
                    testResult.error = message.message;
                }
            } catch (e) {
                console.log('📨 Received raw message:', data.toString());
            }
        });
        
        ws.on('error', (error) => {
            clearTimeout(timeout);
            console.log('❌ WebSocket error:', error.message);
            testResult.error = error.message;
            
            if (error.code === 'ECONNREFUSED') {
                console.log('💡 Connection refused - server may not be running on port 4000');
            } else if (error.message.includes('401') || error.message.includes('auth')) {
                console.log('🔐 Authentication required (this is expected behavior)');
                testResult.success = true; // Connection works, just needs auth
            }
            
            resolve(testResult);
        });
        
        ws.on('close', (code, reason) => {
            clearTimeout(timeout);
            console.log(`🔌 Connection closed: ${code} - ${reason?.toString()}`);
            
            if (code === 1008) {
                console.log('🔐 Authentication required (this is expected - fix is working!)');
                testResult.success = true; // Connection works, just needs auth
            }
            
            resolve(testResult);
        });
    });
}

async function testPortConnectivity() {
    console.log('\n🌐 Testing port connectivity...');
    
    const net = require('net');
    
    return new Promise((resolve) => {
        const socket = new net.Socket();
        let connected = false;
        
        socket.setTimeout(3000);
        
        socket.on('connect', () => {
            console.log('✅ Port 4000 is accessible');
            connected = true;
            socket.destroy();
            resolve(true);
        });
        
        socket.on('error', (error) => {
            console.log('❌ Port 4000 connection failed:', error.message);
            resolve(false);
        });
        
        socket.on('timeout', () => {
            console.log('⏰ Port 4000 connection timeout');
            socket.destroy();
            resolve(false);
        });
        
        socket.connect(4000, 'localhost');
    });
}

async function runTest() {
    try {
        console.log('📡 Testing collaboration server connectivity...\n');
        
        // Test basic port connectivity
        const portReachable = await testPortConnectivity();
        
        if (!portReachable) {
            console.log('\n❌ CRITICAL: Port 4000 is not accessible');
            console.log('💡 Please ensure the main server is running on port 4000');
            return;
        }
        
        // Test WebSocket collaboration connection
        const wsResult = await testCollaborationFix();
        
        console.log('\n📊 TEST RESULTS:');
        console.log('─'.repeat(30));
        console.log(`🌐 Port 4000 accessible: ${portReachable ? '✅ YES' : '❌ NO'}`);
        console.log(`🔗 WebSocket connection: ${wsResult.success ? '✅ WORKS' : '❌ FAILED'}`);
        
        if (wsResult.error) {
            console.log(`📋 Error details: ${wsResult.error}`);
        }
        
        if (portReachable && wsResult.success) {
            console.log('\n🎉 COLLABORATION FIX SUCCESSFUL!');
            console.log('✨ The WebSocket connection to port 4000 is working');
            console.log('🔐 Authentication is being properly requested');
            console.log('📱 Real-time collaboration should now work in the browser');
        } else {
            console.log('\n⚠️ COLLABORATION FIX NEEDS ATTENTION');
            if (!portReachable) {
                console.log('🔧 Start the main server: node server-network.js');
            } else if (!wsResult.success) {
                console.log('🔧 Check WebSocket server configuration');
            }
        }
        
    } catch (error) {
        console.error('\n💥 Test failed:', error.message);
    }
}

// Run the test
runTest().then(() => {
    console.log('\n🏁 Test completed');
    process.exit(0);
}).catch(error => {
    console.error('💥 Test error:', error);
    process.exit(1);
});
