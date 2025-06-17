// Test login and collaboration flow
const fetch = require('node-fetch');

async function testLoginAndCollaboration() {
    console.log('🔍 Testing login and collaboration flow...');
    
    try {
        // Step 1: Login
        console.log('📝 Step 1: Attempting login...');
        const loginResponse = await fetch('http://localhost:3000/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },            body: JSON.stringify({
                username: 'admin',
                password: 'admin123'
            })
        });
        
        const loginResult = await loginResponse.json();
        console.log('Login response:', loginResult);
        
        if (!loginResponse.ok) {
            console.log('❌ Login failed!');
            return;
        }
        
        // Extract cookies from login response
        const cookies = loginResponse.headers.get('set-cookie');
        console.log('🍪 Received cookies:', cookies ? 'yes' : 'no');
        
        if (!cookies) {
            console.log('❌ No cookies received from login!');
            return;
        }
        
        // Step 2: Test auth verify with cookies
        console.log('🔍 Step 2: Testing auth verify with cookies...');
        const verifyResponse = await fetch('http://localhost:3000/api/auth/verify', {
            headers: {
                'Cookie': cookies
            }
        });
        
        const verifyResult = await verifyResponse.json();
        console.log('Verify response:', verifyResult);
        
        if (verifyResult.authenticated) {
            console.log('✅ Authentication successful!');
            console.log('🔗 Now you should be able to use collaboration mode');
        } else {
            console.log('❌ Authentication still failing after login');
        }
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
    }
}

testLoginAndCollaboration();
