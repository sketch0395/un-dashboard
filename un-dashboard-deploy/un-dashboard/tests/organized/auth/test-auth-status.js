/**
 * Test authentication and scan saving through the frontend
 */

// Test if we can access the app and check auth status
async function testAuthenticationAndScan() {
    console.log('🔐 Testing authentication status...');
    
    try {
        // Check if user is logged in
        const profileResponse = await fetch('http://localhost:3000/api/user/profile', {
            credentials: 'include'
        });
        
        console.log('Profile check status:', profileResponse.status);
        
        if (profileResponse.status === 401) {
            console.log('❌ User not authenticated. Please log in through the browser first.');
            console.log('📝 Steps to test:');
            console.log('  1. Open http://localhost:3000/auth/login in browser');
            console.log('  2. Log in with admin credentials');
            console.log('  3. Navigate to network scan page');
            console.log('  4. Run a scan to test duplicate prevention');
            return;
        }
        
        if (profileResponse.ok) {
            const user = await profileResponse.json();
            console.log('✅ User authenticated:', user.username || user.email);
            
            // Test scan history API
            console.log('🔍 Testing scan history API...');
            const historyResponse = await fetch('http://localhost:3000/api/scan-history', {
                credentials: 'include'
            });
            
            if (historyResponse.ok) {
                const scans = await historyResponse.json();
                console.log(`📊 Current scan count: ${scans.length}`);
                
                if (scans.length > 0) {
                    console.log('Recent scans:');
                    scans.slice(0, 3).forEach((scan, index) => {
                        console.log(`  ${index + 1}. ${scan.name} - ${scan.deviceCount} devices (${scan.ipRange})`);
                    });
                }
            } else {
                console.log('❌ Failed to fetch scan history:', historyResponse.status);
            }
            
        } else {
            console.log('❌ Authentication check failed:', profileResponse.status);
        }
        
    } catch (error) {
        console.error('❌ Error during authentication test:', error.message);
    }
}

testAuthenticationAndScan();
