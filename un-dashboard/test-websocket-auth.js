const fetch = require('node-fetch');
const WebSocket = require('ws');

// Test WebSocket connection with authentication
async function testWithAuth() {
    console.log('🔗 Testing WebSocket connection with authentication...');
    
    try {        // Step 1: Login to get auth token
        console.log('🔑 Step 1: Logging in to get auth token...');
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
            throw new Error(`Login failed: ${loginResponse.status}`);
        }
        
        const loginData = await loginResponse.json();
        console.log('✅ Login successful:', loginData.success);
        
        // Step 2: Extract auth token from Set-Cookie header
        const cookies = loginResponse.headers.get('set-cookie');
        console.log('🍪 Set-Cookie header:', cookies);
        
        let authToken;
        if (cookies) {
            const cookieArray = Array.isArray(cookies) ? cookies : [cookies];
            for (const cookie of cookieArray) {
                if (cookie.includes('auth-token=')) {
                    const tokenMatch = cookie.match(/auth-token=([^;]+)/);
                    if (tokenMatch) {
                        authToken = tokenMatch[1];
                        break;
                    }
                }
            }
        }
        
        if (!authToken) {
            throw new Error('No auth token found in response');
        }
        
        console.log('🔑 Auth token extracted:', authToken.substring(0, 20) + '...');
        
        // Step 3: Test WebSocket connection with auth token
        console.log('🔗 Step 3: Connecting to WebSocket with auth token...');
        const wsUrl = `ws://localhost:4000/collaboration-ws?scanId=test-scan-123&token=${encodeURIComponent(authToken)}`;
        console.log(`Attempting to connect to: ${wsUrl.replace(/token=[^&]+/, 'token=***')}`);
        
        const ws = new WebSocket(wsUrl);
        
        ws.on('open', () => {
            console.log('✅ WebSocket connection opened successfully with auth!');
            
            // Send a test message
            const message = {
                type: 'ping',
                timestamp: new Date().toISOString()
            };
            
            console.log('📤 Sending test message:', message);
            ws.send(JSON.stringify(message));
        });
        
        ws.on('message', (data) => {
            console.log('📨 Received message:', data.toString());
        });
        
        ws.on('close', (code, reason) => {
            console.log(`🔌 WebSocket closed: ${code} - ${reason}`);
        });
        
        ws.on('error', (error) => {
            console.log('❌ WebSocket error:', error.message);
        });
        
        // Keep the connection open for a few seconds
        setTimeout(() => {
            if (ws.readyState === WebSocket.OPEN) {
                console.log('✅ Test completed successfully - closing connection');
                ws.close(1000, 'Test complete');
            }
        }, 5000);
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
    }
}

// Run the test
testWithAuth();
