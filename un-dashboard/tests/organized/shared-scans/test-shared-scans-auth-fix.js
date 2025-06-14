// Test script to verify the shared scans authentication fix
console.log('🧪 Testing Shared Scans Delete Authentication Fix...');

async function testSharedScansAuth() {
    const baseUrl = 'http://localhost:3000';
    
    try {
        console.log('\n1. Testing authentication state...');
        const authResponse = await fetch(`${baseUrl}/api/auth/verify`, {
            method: 'GET',
            credentials: 'include'
        });
        
        const authData = await authResponse.json();
        console.log(`Auth Status: ${authResponse.status}`);
        
        if (!authResponse.ok || !authData.authenticated) {
            console.log('❌ User not authenticated. Please log in first.');
            console.log('Navigate to: http://localhost:3000/auth/login');
            return false;
        }
        
        console.log('✅ User authenticated:', authData.user.username);
        
        console.log('\n2. Testing shared scans list API...');
        const listResponse = await fetch(`${baseUrl}/api/scans/shared`, {
            method: 'GET',
            credentials: 'include'
        });
        
        console.log(`Shared scans list status: ${listResponse.status}`);
        
        if (listResponse.ok) {
            const listData = await listResponse.json();
            console.log('✅ Shared scans list API working');
            console.log(`Found ${listData.data?.length || 0} shared scans`);
            
            // Test delete API with a non-existent scan (should return 404, not 401)
            console.log('\n3. Testing delete API authentication...');
            const deleteResponse = await fetch(`${baseUrl}/api/scans/shared/test-non-existent-scan`, {
                method: 'DELETE',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            console.log(`Delete API status: ${deleteResponse.status}`);
            const deleteData = await deleteResponse.json();
            console.log('Delete API response:', deleteData);
            
            if (deleteResponse.status === 404) {
                console.log('✅ Delete API authentication working (expected 404 for non-existent scan)');
                return true;
            } else if (deleteResponse.status === 401) {
                console.log('❌ Delete API still returning 401 - authentication fix may not be working');
                return false;
            } else {
                console.log('✅ Delete API authentication working (got different status than 401)');
                return true;
            }
        } else {
            console.log('❌ Shared scans list API failed:', listResponse.status);
            return false;
        }
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        return false;
    }
}

// Run the test
testSharedScansAuth().then(success => {
    console.log('\n' + '='.repeat(50));
    if (success) {
        console.log('🎉 AUTHENTICATION FIX TEST: SUCCESSFUL');
        console.log('✅ The shared scans delete authentication error should be resolved');
    } else {
        console.log('❌ AUTHENTICATION FIX TEST: FAILED');
        console.log('🔧 Additional debugging may be required');
    }
    console.log('='.repeat(50));
});
