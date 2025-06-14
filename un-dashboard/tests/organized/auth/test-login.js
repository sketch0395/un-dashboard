const fetch = require('node-fetch');

async function testLogin() {
    try {
        console.log('Testing successful login...');
        const response = await fetch('http://localhost:3000/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                username: 'admin',
                password: 'admin123!'
            })
        });

        const result = await response.json();
        console.log('Login response:', result);

        // Test failed login
        console.log('\nTesting failed login...');
        const failedResponse = await fetch('http://localhost:3000/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                username: 'admin',
                password: 'wrongpassword'
            })
        });

        const failedResult = await failedResponse.json();
        console.log('Failed login response:', failedResult);

    } catch (error) {
        console.error('Test error:', error.message);
    }
}

testLogin();
