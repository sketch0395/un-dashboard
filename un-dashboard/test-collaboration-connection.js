/**
 * Simple test to verify collaboration WebSocket connection
 */

const WebSocket = require('ws');

async function testCollaborationConnection() {
    console.log('🔗 Testing Collaboration WebSocket Connection');
    console.log('=============================================');

    try {
        // Test WebSocket connection to collaboration server
        const ws = new WebSocket('ws://localhost:4000/collaboration-ws');
        
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                console.log('⏰ Connection test timed out');
                ws.close();
                resolve(false);
            }, 5000);

            ws.on('open', () => {
                console.log('✅ WebSocket connection successful');
                clearTimeout(timeout);
                
                // Send a test auth message
                ws.send(JSON.stringify({
                    type: 'auth',
                    data: {
                        userId: 'test-user',
                        username: 'TestUser',
                        scanId: 'test-scan-id',
                        token: 'test-token'
                    }
                }));
                
                setTimeout(() => {
                    ws.close();
                    resolve(true);
                }, 1000);
            });

            ws.on('error', (error) => {
                console.log('❌ WebSocket connection failed:', error.message);
                clearTimeout(timeout);
                resolve(false);
            });

            ws.on('message', (data) => {
                try {
                    const message = JSON.parse(data);
                    console.log('📩 Received message:', message.type);
                } catch (error) {
                    console.log('📩 Received raw data:', data.toString());
                }
            });

            ws.on('close', (code, reason) => {
                console.log(`🔌 WebSocket closed: ${code} - ${reason}`);
            });
        });
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        return false;
    }
}

async function testTopologyAPI() {
    console.log('\n🌐 Testing Shared Scans API');
    console.log('============================');
    
    try {
        const { default: fetch } = await import('node-fetch');
        
        // Test the shared scans API endpoint
        const response = await fetch('http://localhost:3000/api/scans/shared', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            console.log('✅ Shared scans API is accessible');
            console.log(`📊 Found ${data.data?.length || 0} shared scans`);
            
            if (data.data && data.data.length > 0) {
                const firstScan = data.data[0];
                console.log(`🔍 First scan: "${firstScan.name}" (ID: ${firstScan._id})`);
                console.log(`📋 Devices: ${firstScan.metadata?.deviceCount || 'Unknown'}`);
                
                // Test fetching individual scan
                const scanResponse = await fetch(`http://localhost:3000/api/scans/shared/${firstScan._id}`);
                if (scanResponse.ok) {
                    console.log('✅ Individual scan API is accessible');
                } else {
                    console.log('⚠️ Individual scan API returned:', scanResponse.status);
                }
            }
        } else {
            console.log('❌ Shared scans API returned:', response.status);
        }
        
    } catch (error) {
        console.error('❌ API test failed:', error.message);
    }
}

async function runTests() {
    const wsResult = await testCollaborationConnection();
    await testTopologyAPI();
    
    console.log('\n🎯 Test Results Summary');
    console.log('=======================');
    console.log(`🔗 WebSocket Connection: ${wsResult ? '✅ PASS' : '❌ FAIL'}`);
    console.log('🌐 API Endpoints: Check output above');
    console.log('');
    console.log('📋 Manual Testing:');
    console.log('1. Open http://localhost:3000/login');
    console.log('2. Login with admin/admin123');
    console.log('3. Go to Network Scan page');
    console.log('4. Check for shared scans with topology buttons');
    console.log('5. Test clicking "🗺️ Topology" buttons');
    console.log('6. Verify scans load into topology view');
}

runTests().catch(console.error);
