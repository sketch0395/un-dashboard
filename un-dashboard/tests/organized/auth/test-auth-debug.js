// Debug script to test authentication flow
console.log('=== AUTHENTICATION DEBUG TEST ===');

// Test function to check various auth endpoints
async function testAuthFlow() {
    const baseUrl = 'http://localhost:3000';
    
    console.log('\n1. Testing auth verification endpoint...');
    try {
        const verifyResponse = await fetch(`${baseUrl}/api/auth/verify`, {
            method: 'GET',
            credentials: 'include'
        });
        
        console.log(`Auth verify status: ${verifyResponse.status}`);
        const verifyData = await verifyResponse.json();
        console.log('Auth verify response:', verifyData);
        
        if (verifyResponse.ok && verifyData.authenticated) {
            console.log('✅ User is authenticated');
            return true;
        } else {
            console.log('❌ User is not authenticated');
            return false;
        }
    } catch (error) {
        console.error('Auth verify error:', error.message);
        return false;
    }
}

async function testScanHistoryAPI() {
    const baseUrl = 'http://localhost:3000';
    
    console.log('\n2. Testing scan history API...');
    try {
        const response = await fetch(`${baseUrl}/api/scan-history?limit=1`, {
            method: 'GET',
            credentials: 'include'
        });
        
        console.log(`Scan history status: ${response.status}`);
        const data = await response.json();
        console.log('Scan history response:', JSON.stringify(data, null, 2));
        
        if (response.ok) {
            console.log('✅ Scan history API working');
        } else {
            console.log('❌ Scan history API failed');
        }
    } catch (error) {
        console.error('Scan history API error:', error.message);
    }
}

async function runTests() {
    const isAuthenticated = await testAuthFlow();
    await testScanHistoryAPI();
    
    console.log('\n=== SUMMARY ===');
    if (isAuthenticated) {
        console.log('The authentication system appears to be working.');
        console.log('If scan history API failed, the issue might be in the API route itself.');
    } else {
        console.log('The user is not authenticated. Please log in first.');
        console.log('Navigate to http://localhost:3000/auth/login');
    }
}

// Run the tests
runTests().catch(console.error);
