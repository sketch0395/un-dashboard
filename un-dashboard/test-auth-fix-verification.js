// Test script to verify authentication fix
console.log('🧪 Testing Authentication Fix');

async function testAuthenticationFix() {
    const baseUrl = 'http://localhost:3000';
    
    try {
        console.log('\n1️⃣ Testing auth verification...');
        const authResponse = await fetch(`${baseUrl}/api/auth/verify`, {
            method: 'GET',
            credentials: 'include'
        });
        
        const authData = await authResponse.json();
        console.log(`Auth Status: ${authResponse.status}`);
        console.log('Auth Data:', authData);
        
        if (authResponse.ok && authData.authenticated) {
            console.log('✅ User is authenticated');
            
            console.log('\n2️⃣ Testing scan rename API endpoint...');
            const testScanId = 'test-scan-' + Date.now();
            const renameResponse = await fetch(`${baseUrl}/api/scan-history/${testScanId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify({ 
                    name: 'Test Renamed Scan - Auth Fix' 
                })
            });
            
            const renameData = await renameResponse.json();
            console.log(`Rename Status: ${renameResponse.status}`);
            console.log('Rename Response:', renameData);
            
            if (renameResponse.status === 404) {
                console.log('✅ Expected 404 (scan not found) - Authentication passed!');
                console.log('🎉 AUTHENTICATION FIX SUCCESSFUL!');
                return true;
            } else if (renameResponse.status === 401) {
                console.log('❌ Still getting 401 - Authentication fix needs more work');
                return false;
            } else {
                console.log('✅ Authentication working - got different response');
                return true;
            }
        } else {
            console.log('❌ User not authenticated - please log in first');
            console.log('Navigate to: http://localhost:3000/auth/login');
            return false;
        }
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        return false;
    }
}

// Run the test
testAuthenticationFix().then(success => {
    console.log('\n' + '='.repeat(50));
    if (success) {
        console.log('🎉 AUTHENTICATION FIX VERIFICATION: SUCCESSFUL');
        console.log('✅ The 401 authentication error has been resolved');
    } else {
        console.log('❌ AUTHENTICATION FIX VERIFICATION: FAILED');
        console.log('🔧 Additional debugging may be required');
    }
    console.log('='.repeat(50));
});
